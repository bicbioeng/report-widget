/**
 * "Describe it by voice" — record, see live captions, get a transcript.
 */
import React, { useEffect, useState } from 'react';
import { Button, Space, Typography, Alert } from 'antd';
import { AudioOutlined, StopOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import { useMediaRecorder, formatMs, supportsRecording, supportsSpeech, extensionFor } from './recorders';
import { transcribeAudio } from '../../utils/feedbackApi';

const { Text } = Typography;

export default function VoicePanel({ value, onChange, transcriptionAvailable }) {
  const rec = useMediaRecorder({ kind: 'audio', captions: true, maxMs: 5 * 60 * 1000 });
  const [transcribing, setTranscribing] = useState(false);
  const [note, setNote] = useState(null);

  // A finished recording → attach + transcribe.
  useEffect(() => {
    if (!rec.result) return;
    const { blob, mimeType, durationMs, captions } = rec.result;
    const filename = `voice-note.${extensionFor(mimeType)}`;
    onChange({ blob, mimeType, durationMs, filename, transcript: captions || '', transcriptSource: captions ? 'browser' : null });
    rec.reset();
    (async () => {
      setTranscribing(true);
      setNote(null);
      try {
        const out = await transcribeAudio(blob, { filename });
        if (out.unavailable) {
          setNote(captions
            ? 'Transcribed by your browser. An admin can add a transcription key under AI Settings for higher accuracy.'
            : 'No transcription is configured on the server and this browser has no speech recognition — the recording is attached as audio.');
        } else if (out.text) {
          onChange((prev) => ({ ...(prev || {}), transcript: out.text, transcriptSource: out.provider }));
          setNote(null);
        }
      } catch (e) {
        setNote(captions
          ? `Kept your browser's captions — ${e.message}. The recording is attached either way.`
          : `Transcription failed: ${e.message}. The recording is still attached to the report.`);
      } finally {
        setTranscribing(false);
      }
    })();
  }, [rec.result]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!supportsRecording()) {
    return <Text type="secondary" style={{ fontSize: 12.5 }}>Voice notes need a browser with microphone recording.</Text>;
  }

  const recording = rec.status === 'recording';

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="kf-voice">
        {recording ? (
          <Button danger icon={<StopOutlined />} onClick={rec.stop}>Stop {formatMs(rec.elapsedMs)}</Button>
        ) : (
          <Button icon={<AudioOutlined />} loading={rec.status === 'requesting'} onClick={rec.start} disabled={transcribing}>
            {value ? 'Record again' : 'Describe it by voice'}
          </Button>
        )}
        {recording && <div className="kf-level"><i style={{ width: `${Math.round(rec.level * 100)}%` }} /></div>}
        {!recording && value && (
          <>
            <Text type="secondary" style={{ fontSize: 12 }}>{value.filename} · {formatMs(value.durationMs || 0)}</Text>
            <Button size="small" type="text" icon={<DeleteOutlined />} onClick={() => onChange(null)} />
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
            ? 'Say what happened — the recording is attached and transcribed into the report.'
            : supportsSpeech()
              ? 'Say what happened — your browser captions it and the recording is attached.'
              : 'Say what happened — the recording is attached to the report.'}
        </Text>
      )}
      {rec.error && <Alert type="warning" showIcon message={rec.error} style={{ borderRadius: 8 }} />}
      {note && <Alert type="info" showIcon message={note} style={{ borderRadius: 8 }} />}
      {value?.transcript && !recording && (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Transcript{value.transcriptSource ? ` (${value.transcriptSource})` : ''} — you can edit it:</Text>
          <textarea
            className="ant-input"
            style={{ width: '100%', borderRadius: 8, minHeight: 64, fontSize: 13 }}
            value={value.transcript}
            onChange={(e) => onChange({ ...value, transcript: e.target.value })}
          />
        </Space>
      )}
    </div>
  );
}
