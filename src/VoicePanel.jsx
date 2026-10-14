/**
 * "Describe it by voice" — record, see live captions, and the transcript goes
 * into the "What happened?" field through session.addTranscript.
 */
import React, { useEffect, useRef } from 'react';
import { Button, Typography, Alert } from 'antd';
import { AudioOutlined, StopOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import { useMediaRecorder, formatMs, supportsRecording, supportsSpeech, extensionFor } from './recorders';
import { useReportConfig } from './ReportProvider';

const { Text } = Typography;
const NEEDS_TEXT = ' Write a few words above so you can send it.';

// session (from FeedbackModal) hands out recording ids, writes text into the
// field and keeps the "Transcribing…" / note state, so all of it outlives this panel.
export default function VoicePanel({ open = true, value, onChange, session, transcriptionAvailable }) {
  const { transport } = useReportConfig();
  const rec = useMediaRecorder({ kind: 'audio', captions: true, maxMs: 5 * 60 * 1000 });
  const { transcribing, note } = session.status;
  const setNote = (n) => session.setStatus((s) => ({ ...s, note: n }));

  // Only the current recording may write: a new one, a delete or closing the
  // form (session cleared) drops late results.
  const recordingId = useRef(null);
  const start = () => { recordingId.current = session.next(); session.setStatus({ transcribing: null, note: null }); rec.start(); };
  const remove = () => { session.next(); session.setStatus({ transcribing: null, note: null }); onChange(null); };

  // Closing the form stops the microphone; the recording it leaves is dropped below.
  useEffect(() => {
    if (open) return;
    if (rec.status === 'recording') rec.stop();
    else if (rec.status === 'idle') rec.reset();
  }, [open, rec.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // A finished recording → attach, captions into the field, then transcribe.
  useEffect(() => {
    if (!rec.result) return;
    const id = recordingId.current;
    if (!open || id === null || !session.isCurrent(id)) { rec.reset(); return; }
    const { blob, mimeType, durationMs, captions } = rec.result;
    const filename = `voice-note.${extensionFor(mimeType)}`;
    const added = Boolean(captions) && session.addTranscript(id, captions);
    onChange({ blob, mimeType, durationMs, filename, transcript: added ? captions : '', transcriptSource: added ? 'browser' : null });
    rec.reset();
    (async () => {
      session.setStatus({ transcribing: id, note: null });
      try {
        const out = await transport.transcribeAudio(blob, { filename });
        if (!session.isCurrent(id)) return;
        if (out.unavailable) {
          setNote(captions
            ? 'Transcribed by your browser. An admin can add a transcription key under AI Settings for higher accuracy.'
            : `No transcription is configured on the server and this browser has no speech recognition — the recording is attached as audio.${NEEDS_TEXT}`);
        } else if (out.text) {
          if (session.addTranscript(id, out.text)) onChange((prev) => ({ ...(prev || {}), transcript: out.text, transcriptSource: out.provider }));
          setNote(null);
        }
      } catch (e) {
        if (!session.isCurrent(id)) return;
        setNote(captions
          ? `Kept your browser's captions — ${e.message}. The recording is attached either way.`
          : `Transcription failed: ${e.message}. The recording is still attached to the report.${NEEDS_TEXT}`);
      } finally {
        // An older request finishing must not clear the indicator of a newer one.
        session.setStatus((s) => (s.transcribing === id ? { ...s, transcribing: null } : s));
      }
    })();
  }, [rec.result]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!supportsRecording()) {
    return <Text type="secondary" style={{ fontSize: 12.5 }}>Voice notes need a browser with microphone recording.</Text>;
  }

  const recording = rec.status === 'recording';
  const added = Boolean(value?.transcript) && !recording;

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="kf-voice">
        {recording ? (
          <Button danger icon={<StopOutlined />} onClick={rec.stop}>Stop {formatMs(rec.elapsedMs)}</Button>
        ) : (
          // Not disabled while transcribing: disabling the focused button drops focus to <body>.
          // Recording again is safe — the session drops the older transcript.
          <Button icon={<AudioOutlined />} loading={rec.status === 'requesting'} onClick={start}>
            {value ? 'Record again' : 'Describe it by voice'}
          </Button>
        )}
        {recording && <div className="kf-level"><i style={{ width: `${Math.round(rec.level * 100)}%` }} /></div>}
        {!recording && value && (
          <>
            <Text type="secondary" style={{ fontSize: 12 }}>{value.filename} · {formatMs(value.durationMs || 0)}</Text>
            <Button size="small" type="text" icon={<DeleteOutlined />} onClick={remove} aria-label="Remove voice note" />
          </>
        )}
        {transcribing && <Text type="secondary" style={{ fontSize: 12 }}><LoadingOutlined /> Transcribing…</Text>}
      </div>
      {recording && (
        <div className="kf-caption">
          {rec.liveCaption || (supportsSpeech() ? 'Listening…' : 'Recording (live captions are not available in this browser).')}
        </div>
      )}
      {!recording && !value && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {transcriptionAvailable
            ? 'Say what happened — it is written into the description above and the recording is attached.'
            : supportsSpeech()
              ? 'Say what happened — your browser writes it into the description above and the recording is attached.'
              : 'Say what happened — the recording is attached to the report.'}
        </Text>
      )}
      {rec.error && <Alert type="warning" showIcon message={rec.error} style={{ borderRadius: 8 }} />}
      {note && <Alert type="info" showIcon message={note} style={{ borderRadius: 8 }} />}
      {/* Always rendered so screen readers announce the line once it appears; no gap while empty. */}
      <div aria-live="polite" style={added ? undefined : { marginTop: -8 }}>
        {added && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Added to the description above ({value.transcriptSource === 'browser' ? 'browser captions' : `transcribed by ${value.transcriptSource || 'the server'}`}).
          </Text>
        )}
      </div>
    </div>
  );
}
