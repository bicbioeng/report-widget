/**
 * Voice and screen recording hooks over MediaRecorder.
 *
 * Mime negotiation: Chrome/Firefox record webm/opus; Safari (≤18.3) only mp4.
 * The chosen type is what the file is uploaded and transcribed as.
 * Timeslice recording (1 s chunks) so a crash mid-way still leaves data.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const AUDIO_MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
const VIDEO_MIMES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];

export function pickMime(candidates) {
  if (typeof MediaRecorder === 'undefined') return null;
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
}

export function extensionFor(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.includes('mp4')) return 'mp4';
  if (m.includes('ogg')) return 'ogg';
  return 'webm';
}

export function supportsRecording() {
  return typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function supportsSpeech() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * useMediaRecorder({ kind: 'audio' | 'screen', maxMs, onLevel })
 * → { status, start, stop, elapsedMs, error, result }
 * result: { blob, mimeType, durationMs, captions? }
 */
export function useMediaRecorder({ kind = 'audio', maxMs = 5 * 60 * 1000, captions = false } = {}) {
  const [status, setStatus] = useState('idle'); // idle | requesting | recording | processing
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [liveCaption, setLiveCaption] = useState('');
  const [level, setLevel] = useState(0);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef(null);
  const speechRef = useRef(null);
  const finalCaptionRef = useRef('');
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    if (speechRef.current) { try { speechRef.current.stop(); } catch { /* already stopped */ } speechRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    recorderRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    setStatus('processing');
    rec.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    setLiveCaption('');
    finalCaptionRef.current = '';
    chunksRef.current = [];
    setStatus('requesting');
    try {
      let stream;
      if (kind === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 15 },
          audio: false,
          preferCurrentTab: true,
          selfBrowserSurface: 'include',
          surfaceSwitching: 'include',
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      }
      streamRef.current = stream;
      const mimeType = pickMime(kind === 'screen' ? VIDEO_MIMES : AUDIO_MIMES) || undefined;
      const rec = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        ...(kind === 'screen' ? { videoBitsPerSecond: 1_000_000 } : { audioBitsPerSecond: 64_000 }),
      });
      recorderRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const durationMs = Date.now() - startedAtRef.current;
        const type = rec.mimeType || mimeType || (kind === 'screen' ? 'video/webm' : 'audio/webm');
        const blob = new Blob(chunksRef.current, { type });
        cleanup();
        setStatus('idle');
        if (!blob.size) {
          setError('The recording came out empty. Try again.');
          return;
        }
        setResult({ blob, mimeType: type, durationMs, captions: finalCaptionRef.current.trim() || null });
      };
      rec.onerror = (e) => { setError(e.error?.message || 'Recording failed.'); cleanup(); setStatus('idle'); };
      // Screen share ends from the browser's own "Stop sharing" too.
      stream.getVideoTracks().forEach((t) => { t.onended = () => stop(); });

      startedAtRef.current = Date.now();
      rec.start(1000);
      setStatus('recording');
      setElapsedMs(0);
      timerRef.current = setInterval(() => {
        const ms = Date.now() - startedAtRef.current;
        setElapsedMs(ms);
        if (ms >= maxMs) stop();
      }, 250);

      if (kind === 'audio') {
        // Level meter — a hint that the mic is live.
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          const ctx = new Ctx();
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          src.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i += 1) { const v = (data[i] - 128) / 128; sum += v * v; }
            setLevel(Math.min(1, Math.sqrt(sum / data.length) * 3));
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        } catch { /* meter is decorative */ }

        // Live captions — browser speech recognition, where it exists. This is
        // the transcript of last resort when the server has no key.
        if (captions && supportsSpeech()) {
          try {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            const sr = new SR();
            sr.continuous = true;
            sr.interimResults = true;
            sr.lang = navigator.language || 'en-US';
            sr.onresult = (ev) => {
              let interim = '';
              for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
                const r = ev.results[i];
                if (r.isFinal) finalCaptionRef.current += `${r[0].transcript} `;
                else interim += r[0].transcript;
              }
              setLiveCaption(`${finalCaptionRef.current}${interim}`.trim());
            };
            sr.onend = () => { if (recorderRef.current?.state === 'recording') { try { sr.start(); } catch { /* restarted too soon */ } } };
            sr.onerror = () => {};
            sr.start();
            speechRef.current = sr;
          } catch { /* captions are optional */ }
        }
      }
    } catch (err) {
      cleanup();
      setStatus('idle');
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      setError(denied
        ? (kind === 'screen' ? 'Screen recording was cancelled.' : 'Microphone access was denied. Allow it in the browser and try again.')
        : (err?.message || 'Could not start recording.'));
    }
  }, [kind, maxMs, captions, cleanup, stop]);

  const reset = useCallback(() => { setResult(null); setError(null); setElapsedMs(0); setLiveCaption(''); }, []);

  return { status, start, stop, reset, elapsedMs, error, result, liveCaption, level };
}

export function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
