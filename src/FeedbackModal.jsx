/**
 * The report form. One screen, designed for a non-technical reporter:
 * type · what happened · how bad · screenshot · voice · files, everything else
 * captured silently and shown under "we'll also include".
 *
 * Submit order matters: the ticket is created first (the reporter gets a key
 * within one request), attachments go up against that key, then finalize posts
 * the context comment and starts AI triage in the background.
 *
 * "Problem with this form?" (footer, error state, partial-success state)
 * switches the modal into a one-field report about the form itself, sent as
 * kind 'report-tool' with a diagnostics block. If that fails too, the reporter
 * gets the whole payload to copy, so nothing is lost.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Input, Button, Tabs, Typography, Space, Tooltip, message, Collapse, Popover, Upload, Alert } from 'antd';
import {
  BugOutlined, BulbOutlined, QuestionCircleOutlined, CameraOutlined, EditOutlined, ReloadOutlined,
  DeleteOutlined, PaperClipOutlined, VideoCameraOutlined, StopOutlined, CheckCircleFilled, CloseOutlined, LoadingOutlined,
} from '@ant-design/icons';
import Annotator from './Annotator';
import VoicePanel from './VoicePanel';
import MyReports from './MyReports';
import { captureQuick, captureExact, supportsExactCapture, blobToFile } from './capture';
import { useMediaRecorder, formatMs, extensionFor } from './recorders';
import { snapshotContext } from './contextBuffer';
import { pageMetadata, isDesktop } from './metadata';
import { useReportConfig } from './ReportProvider';
import { buildDiagnostics, buildReportToolPayload, errorRecord } from './diagnostics';

const { Text } = Typography;
const { TextArea } = Input;

const KINDS = [
  { key: 'bug', label: 'Bug', icon: <BugOutlined />, hint: 'Something is broken or wrong' },
  { key: 'idea', label: 'Idea', icon: <BulbOutlined />, hint: 'A feature or improvement' },
  { key: 'question', label: 'Question', icon: <QuestionCircleOutlined />, hint: 'How do I…?' },
];
const SEVERITIES = [
  { key: 'blocked', label: "I'm blocked" },
  { key: 'annoying', label: 'Annoying, I can work around it' },
  { key: 'minor', label: 'Minor' },
];
const PROMPTS = {
  bug: 'What happened? Say it the way you would to a colleague.',
  idea: (app) => `What would you like ${app} to do?`,
  question: 'What are you trying to do?',
};

function Chip({ active, cls, onClick, children }) {
  return <button type="button" className={`kf-chip${active ? ` active ${cls}` : ''}`} onClick={onClick}>{children}</button>;
}

// SVGs without an intrinsic size load at 0×0, so they keep a plain chip.
const canAnnotate = (f) => f.type.startsWith('image/') && f.type !== 'image/svg+xml';
// photo.jpg → photo-annotated.png; photo-annotated.png stays as it is.
const annotatedName = (name) => {
  const base = name.replace(/\.[^./]*$/, '');
  return base.endsWith('-annotated') ? `${base}.png` : `${base}-annotated.png`;
};

// Its own object URL, released when the file is removed or replaced.
function FileThumb({ file }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? <img className="kf-file-thumb" src={url} alt="" /> : <span className="kf-file-thumb" />;
}

export default function FeedbackModal({ open, onClose, prefill, onOpenTicket, hidden, setHidden }) {
  const { transport, buildSha, appName, getImpersonation } = useReportConfig();
  const meta = () => pageMetadata({ buildSha, getImpersonation });
  const [tab, setTab] = useState('new');
  const [config, setConfig] = useState(null);
  const [kind, setKind] = useState('bug');
  const [severity, setSeverity] = useState('annoying');
  const [summary, setSummary] = useState('');
  const [expected, setExpected] = useState('');
  const [steps, setSteps] = useState('');
  const [shot, setShot] = useState(null);       // { blob, url, width, height, method, annotated }
  const [annotateTarget, setAnnotateTarget] = useState(null); // null | { kind: 'shot' } | { kind: 'file', index, file, url }
  const [capturing, setCapturing] = useState(false);
  const [voice, setVoice] = useState(null);     // { blob, mimeType, durationMs, filename, transcript, transcriptSource }
  const [screen, setScreen] = useState(null);   // { blob, mimeType, durationMs, filename }
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');
  const [done, setDone] = useState(null);       // { ticketKey, warnings }
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastError, setLastError] = useState(null);       // { stage, message, stack }
  const [failedUploads, setFailedUploads] = useState([]); // [{ name, error }]
  const [problem, setProblem] = useState(null);           // { text, status, diagnostics, error?, copyText?, ticketKey? }
  const autoShotDone = useRef(false);
  const copyRef = useRef(null);
  const noteError = (stage, e) => setLastError(errorRecord(stage, e));

  const screenRec = useMediaRecorder({ kind: 'screen', maxMs: 2 * 60 * 1000 });

  const closeAnnotator = () => {
    if (annotateTarget?.kind === 'file') URL.revokeObjectURL(annotateTarget.url);
    setAnnotateTarget(null);
  };
  const annotateFile = (index, file) => setAnnotateTarget({ kind: 'file', index, file, url: URL.createObjectURL(file) });
  // The last target stays rendered while the modal fades out, instead of flipping to the screenshot.
  const lastTargetRef = useRef(null);
  if (annotateTarget) lastTargetRef.current = annotateTarget;
  const shownTarget = annotateTarget || lastTargetRef.current;
  useEffect(() => () => { if (lastTargetRef.current?.kind === 'file') URL.revokeObjectURL(lastTargetRef.current.url); }, []);

  useEffect(() => {
    if (!open) return;
    transport.fetchFeedbackConfig().then(setConfig).catch(() => setConfig({ transcription: { available: false } }));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefill from the crash screen / "report this error".
  useEffect(() => {
    if (!open || !prefill) return;
    if (prefill.kind) setKind(prefill.kind);
    if (prefill.summary) setSummary(prefill.summary);
    if (prefill.severity) setSeverity(prefill.severity);
    setTab('new');
  }, [open, prefill]);

  // A quiet first screenshot when the form opens — no permission, no click.
  useEffect(() => {
    if (!open || autoShotDone.current || shot || done || prefill?.noAutoShot) return;
    autoShotDone.current = true;
    let alive = true;
    (async () => {
      try {
        setCapturing(true);
        const r = await captureQuick();
        if (alive && r.blob) setShot({ ...r, url: URL.createObjectURL(r.blob) });
      } catch (e) {
        console.warn('[feedback] quick capture failed:', e.message);
        noteError('auto-screenshot', e);
      } finally {
        if (alive) setCapturing(false);
      }
    })();
    return () => { alive = false; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Screen recording finished → keep it.
  useEffect(() => {
    if (!screenRec.result) return;
    const { blob, mimeType, durationMs } = screenRec.result;
    setScreen({ blob, mimeType, durationMs, filename: `screen-recording.${extensionFor(mimeType)}` });
    screenRec.reset();
    setHidden(false);
  }, [screenRec.result]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (screenRec.error) { setHidden(false); message.warning(screenRec.error); noteError('screen-recording', screenRec.error); }
  }, [screenRec.error]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    setKind('bug'); setSeverity('annoying'); setSummary(''); setExpected(''); setSteps('');
    if (shot?.url) URL.revokeObjectURL(shot.url);
    setShot(null); setVoice(null); setScreen(null); setFiles([]); setDone(null); setProgress('');
    setLastError(null); setFailedUploads([]); setProblem(null);
    autoShotDone.current = false;
  }, [shot]);

  const handleClose = () => { setProblem(null); onClose(); };

  const retakeExact = async () => {
    setHidden(true);
    setCapturing(true);
    try {
      await new Promise((r) => setTimeout(r, 150)); // let the modal hide before the picker
      const r = await captureExact();
      if (shot?.url) URL.revokeObjectURL(shot.url);
      setShot({ ...r, url: URL.createObjectURL(r.blob) });
    } catch (e) {
      if (e?.name !== 'NotAllowedError') { message.warning(e.message || 'Screenshot cancelled.'); noteError('exact-screenshot', e); }
    } finally {
      setCapturing(false);
      setHidden(false);
    }
  };
  const retakeQuick = async () => {
    setHidden(true);
    setCapturing(true);
    try {
      await new Promise((r) => setTimeout(r, 120));
      const r = await captureQuick();
      if (shot?.url) URL.revokeObjectURL(shot.url);
      setShot({ ...r, url: URL.createObjectURL(r.blob) });
    } catch (e) {
      message.warning(e.message || 'Screenshot failed.');
      noteError('screenshot', e);
    } finally {
      setCapturing(false);
      setHidden(false);
    }
  };

  const startScreenRecording = async () => {
    setHidden(true);
    await screenRec.start();
  };

  const addFiles = (list) => {
    const incoming = Array.from(list || []).filter(Boolean);
    if (!incoming.length) return;
    const max = config?.maxAttachmentBytes || 512 * 1024 * 1024;
    const ok = incoming.filter((f) => f.size <= max);
    if (ok.length < incoming.length) message.warning('Some files were too large to attach.');
    setFiles((prev) => [...prev, ...ok].slice(0, 10));
  };

  // Paste an image anywhere in the form → attach it.
  const onPaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgs = items.filter((i) => i.kind === 'file' && i.type.startsWith('image/')).map((i) => i.getAsFile()).filter(Boolean);
    if (imgs.length) {
      addFiles(imgs.map((f, i) => new File([f], f.name && f.name !== 'image.png' ? f.name : `pasted-${Date.now()}-${i + 1}.png`, { type: f.type })));
    }
  };

  const context = useMemo(() => (open ? { ...meta(), ...snapshotContext() } : null), [open, done]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = summary.trim().length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setProgress('Creating the ticket…');
    const warnings = [];
    const failed = [];
    try {
      const ctx = { ...meta(), ...snapshotContext() };
      const created = await transport.submitFeedback({
        kind,
        severity: kind === 'bug' ? severity : null,
        summary: summary.trim(),
        expected: expected.trim() || null,
        steps: steps.trim() || null,
        transcript: voice?.transcript?.trim() || null,
        transcriptSource: voice?.transcript ? voice.transcriptSource || null : null,
        pageUrl: window.location.href,
        route: window.location.pathname,
        context: ctx,
      });
      const uploads = [];
      if (shot?.blob) uploads.push(blobToFile(shot.blob, shot.annotated ? 'screenshot-annotated.png' : 'screenshot.png', 'image/png'));
      if (voice?.blob) uploads.push(blobToFile(voice.blob, voice.filename, voice.mimeType));
      if (screen?.blob) uploads.push(blobToFile(screen.blob, screen.filename, screen.mimeType));
      uploads.push(...files);
      for (let i = 0; i < uploads.length; i += 1) {
        setProgress(`Uploading ${uploads[i].name} (${i + 1}/${uploads.length})…`);
        try {
          await transport.uploadFeedbackFile(created.ticketKey, uploads[i]);
        } catch (e) {
          warnings.push(`${uploads[i].name} could not be uploaded (${e.message}).`);
          failed.push({ name: uploads[i].name, error: e.message });
          noteError('upload', e);
        }
      }
      setProgress('Finishing…');
      await transport.finalizeFeedback(created.id).catch((e) => { warnings.push(`Context comment failed (${e.message}).`); noteError('finalize', e); });
      setFailedUploads(failed);
      setDone({ ticketKey: created.ticketKey, warnings });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      // The transport already told the reporter (KIDS: request() toasts the server's message).
      setProgress('');
      noteError('submit', e);
    } finally {
      setSubmitting(false);
    }
  };

  const formState = () => {
    if (tab === 'mine') return 'my-reports';
    if (submitting) return 'submitting';
    if (done) return done.warnings.length ? 'sent-with-warnings' : 'sent';
    if (lastError?.stage === 'submit') return 'submit-failed';
    if (screenRec.status === 'recording') return 'recording-screen';
    if (capturing) return 'capturing-screenshot';
    return 'editing';
  };

  const openProblem = () => {
    const { browser, viewport } = meta();
    setProblem({
      text: '',
      status: 'editing',
      diagnostics: buildDiagnostics({
        state: formState(),
        progress,
        lastError,
        failedAttachments: failedUploads,
        browser,
        viewport,
        form: { kind, severity, summary, expected, steps, transcript: voice?.transcript, shot, voice, screen, files },
      }),
    });
  };

  const sendProblem = async () => {
    const payload = buildReportToolPayload({
      text: problem.text,
      diagnostics: problem.diagnostics,
      pageUrl: window.location.href,
      route: window.location.pathname,
      context: { ...meta(), ...snapshotContext() },
    });
    setProblem((p) => ({ ...p, status: 'sending' }));
    try {
      const created = await transport.submitFeedback(payload);
      // reads-graphql only sends on finalize (ticketKey null); with a ticket the report already exists.
      await transport.finalizeFeedback(created.id).catch((e) => { if (!created.ticketKey) throw e; });
      setProblem((p) => ({ ...p, status: 'sent', ticketKey: created.ticketKey }));
    } catch (e) {
      setProblem((p) => ({ ...p, status: 'failed', error: e?.message || String(e), copyText: JSON.stringify(payload, null, 2) }));
    }
  };

  const copyProblem = () => {
    const el = copyRef.current;
    const fallback = () => { el?.focus(); el?.select(); message.info('Selected. Press Ctrl+C (Cmd+C on a Mac) to copy.'); };
    if (!navigator.clipboard?.writeText) { fallback(); return; }
    navigator.clipboard.writeText(problem.copyText).then(() => message.success('Copied the report and diagnostics.'), fallback);
  };

  const problemLink = <button type="button" className="kf-link" onClick={openProblem}>Problem with this form?</button>;

  const transcriptionAvailable = Boolean(config?.transcription?.available);
  const desktop = isDesktop();

  const includedPopover = (
    <div className="kf-context" style={{ maxWidth: 'min(420px, calc(100vw - 32px))' }}>
      <Text type="secondary" style={{ fontSize: 13 }}>Sent with the report so the developer can reproduce it. Nothing you type elsewhere, no passwords.</Text>
      <pre>{JSON.stringify({
        page: typeof window !== 'undefined' ? window.location.pathname : null,
        browser: context?.browser ? `${context.browser.name} ${context.browser.version} · ${context.browser.os} ${context.browser.osVersion || ''}` : null,
        viewport: context?.viewport ? `${context.viewport.width}×${context.viewport.height} @${context.viewport.dpr}x` : null,
        build: context?.buildSha,
        actingAs: context?.impersonating || undefined,
        recentRoutes: (context?.routeHistory || []).slice(-6).map((r) => r.path),
        recentErrors: (context?.errors || []).slice(-8).map((e) => `${e.level}: ${e.message}`),
      }, null, 2)}</pre>
    </div>
  );

  const form = done ? (
    <div className="kf-success">
      <CheckCircleFilled style={{ fontSize: 40, color: '#22c55e' }} />
      <div className="key">{done.ticketKey}</div>
      <Text>Thanks — your {kind === 'bug' ? 'report' : kind} is filed. You will be notified when it moves or gets a reply.</Text>
      {done.warnings.map((w) => <Alert key={w} type="warning" showIcon message={w} style={{ borderRadius: 8, textAlign: 'left' }} />)}
      {done.warnings.length > 0 && problemLink}
      <Space>
        {done.ticketKey && (
          <Button type="primary" onClick={() => { onOpenTicket?.(done.ticketKey); handleClose(); }}>Open {done.ticketKey}</Button>
        )}
        <Button onClick={reset}>Report another</Button>
        <Button type="text" onClick={handleClose}>Close</Button>
      </Space>
    </div>
  ) : (
    <div className="kf-body" onPaste={onPaste}>
      <div>
        <div className="kf-chips">
          {KINDS.map((k) => (
            <Tooltip key={k.key} title={k.hint}>
              <span><Chip active={kind === k.key} cls={k.key} onClick={() => setKind(k.key)}>{k.icon} {k.label}</Chip></span>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="kf-textarea">
        <TextArea
          autoFocus
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={typeof PROMPTS[kind] === 'function' ? PROMPTS[kind](appName) : PROMPTS[kind]}
          autoSize={{ minRows: 3, maxRows: 8 }}
          maxLength={20000}
        />
      </div>

      <VoicePanel value={voice} onChange={setVoice} transcriptionAvailable={transcriptionAvailable} />

      {kind === 'bug' && (
        <div>
          <div className="kf-section-label">How bad is it?</div>
          <div className="kf-chips">
            {SEVERITIES.map((s) => <Chip key={s.key} active={severity === s.key} cls={s.key} onClick={() => setSeverity(s.key)}>{s.label}</Chip>)}
          </div>
        </div>
      )}

      <Collapse
        ghost
        size="small"
        items={[{
          key: 'more',
          label: <Text type="secondary" style={{ fontSize: 12.5 }}>More detail (optional)</Text>,
          children: (
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {kind !== 'question' && (
                <TextArea value={expected} onChange={(e) => setExpected(e.target.value)} placeholder={kind === 'bug' ? 'What did you expect to happen?' : 'Why would this help?'} autoSize={{ minRows: 2, maxRows: 5 }} />
              )}
              {kind === 'bug' && (
                <TextArea value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={'Steps to make it happen again, if you know them\n1. …\n2. …'} autoSize={{ minRows: 2, maxRows: 6 }} />
              )}
            </Space>
          ),
        }]}
      />

      <div className="kf-capture-row">
        <div className={`kf-card${shot ? ' filled' : ''}`}>
          <div className="kf-card-title">
            <span><CameraOutlined /> Screenshot</span>
            {capturing && <LoadingOutlined />}
          </div>
          {shot ? (
            <div className="kf-shot">
              <img src={shot.url} alt="Screenshot of the page" />
              <div className="kf-shot-actions">
                <Tooltip title="Draw on it"><Button size="small" icon={<EditOutlined />} onClick={() => setAnnotateTarget({ kind: 'shot' })}>Annotate</Button></Tooltip>
                {desktop && supportsExactCapture() && (
                  <Tooltip title="Retake with exact pixels (asks to share this tab)"><Button size="small" icon={<ReloadOutlined />} onClick={retakeExact}>Retake</Button></Tooltip>
                )}
                <Tooltip title="Remove"><Button size="small" danger icon={<DeleteOutlined />} onClick={() => { URL.revokeObjectURL(shot.url); setShot(null); }} /></Tooltip>
              </div>
            </div>
          ) : (
            <Space wrap>
              <Button size="small" icon={<CameraOutlined />} loading={capturing} onClick={retakeQuick}>Take screenshot</Button>
              {desktop && supportsExactCapture() && <Button size="small" onClick={retakeExact} loading={capturing}>Exact pixels…</Button>}
            </Space>
          )}
          {shot?.annotated && <Text type="secondary" style={{ fontSize: 11.5 }}>Annotated</Text>}
        </div>

        <div className={`kf-card${screen || files.length ? ' filled' : ''}`}>
          <div className="kf-card-title"><span><PaperClipOutlined /> Recording & files</span></div>
          <Space wrap>
            {desktop && supportsExactCapture() && !screen && (
              <Button size="small" icon={<VideoCameraOutlined />} loading={screenRec.status === 'requesting'} onClick={startScreenRecording}>Record screen</Button>
            )}
            <Upload multiple showUploadList={false} beforeUpload={(f, list) => { if (!list.length || f === list[0]) addFiles(list.length ? list : [f]); return false; }}>
              <Button size="small" icon={<PaperClipOutlined />}>Add files</Button>
            </Upload>
          </Space>
          {(screen || files.length > 0) && (
            <div className="kf-files">
              {screen && (
                <span className="kf-file"><VideoCameraOutlined /> {screen.filename} · {formatMs(screen.durationMs)}
                  <button type="button" onClick={() => setScreen(null)} aria-label="Remove recording"><CloseOutlined /></button>
                </span>
              )}
              {/* Keyed by index: a replaced file gets a new name, and remounting would lose focus on Annotate. */}
              {files.map((f, i) => (canAnnotate(f) ? (
                <span className="kf-file kf-file-image" key={i}>
                  <FileThumb file={f} />
                  <span className="kf-file-name" title={f.name}>{f.name}</span>
                  <button type="button" className="kf-file-annotate" onClick={() => annotateFile(i, f)} aria-label={`Annotate ${f.name}`}><EditOutlined /> Annotate</button>
                  <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}><CloseOutlined /></button>
                </span>
              ) : (
                <span className="kf-file" key={i}>{f.name}
                  <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}><CloseOutlined /></button>
                </span>
              )))}
            </div>
          )}
          <Text type="secondary" style={{ fontSize: 11.5 }}>Paste an image anywhere in this form to attach it.</Text>
        </div>
      </div>
    </div>
  );

  const footer = done ? null : (
    <div className="kf-footer">
      {lastError?.stage === 'submit' && !submitting && (
        <Alert
          className="kf-error"
          type="error"
          showIcon
          message={`Your report was not sent: ${lastError.message || 'unknown error'}. What you wrote is still here, so you can try again.`}
          action={problemLink}
        />
      )}
      <span className="kf-included">
        We'll also include the page, your account, browser and recent errors.{' '}
        <Popover rootClassName="kf-pop" content={includedPopover} title="What gets included" trigger="click" placement="topLeft"><a>view</a></Popover>
        <span className="kf-sep">·</span>{problemLink}
      </span>
      <Space>
        {progress && <Text type="secondary" style={{ fontSize: 12 }}><LoadingOutlined /> {progress}</Text>}
        <Button onClick={handleClose} disabled={submitting}>Cancel</Button>
        <Button type="primary" onClick={submit} disabled={!canSubmit} loading={submitting}>Send report</Button>
      </Space>
    </div>
  );

  const problemView = problem && (
    <>
      <div className="kf-body kf-problem">
        {problem.status === 'sent' ? (
          <div className="kf-success">
            <CheckCircleFilled style={{ fontSize: 32, color: '#22c55e' }} />
            <Text>Thanks, the team will look at the form itself{problem.ticketKey ? ` (${problem.ticketKey})` : ''}.</Text>
          </div>
        ) : (
          <>
            <Text type="secondary">Something wrong with this report form itself? Tell us what happened. The details below are attached automatically.</Text>
            <TextArea
              autoFocus
              value={problem.text}
              onChange={(e) => { const text = e.target.value; setProblem((p) => ({ ...p, text })); }}
              placeholder="e.g. Send did nothing, or the screenshot never appeared"
              autoSize={{ minRows: 2, maxRows: 6 }}
              maxLength={2000}
              disabled={problem.status === 'sending'}
            />
            <Collapse
              ghost
              size="small"
              items={[{
                key: 'diag',
                label: <Text type="secondary" style={{ fontSize: 12.5 }}>Diagnostics we'll attach</Text>,
                children: <div className="kf-context"><pre>{JSON.stringify(problem.diagnostics, null, 2)}</pre></div>,
              }]}
            />
            {problem.status === 'failed' && (
              <>
                <Alert
                  type="error"
                  showIcon
                  message={`This could not be sent either (${problem.error}). Copy it and send it to the team another way.`}
                  action={<Button size="small" onClick={copyProblem}>Copy</Button>}
                />
                <textarea ref={copyRef} className="kf-copy" readOnly value={problem.copyText} aria-label="Report and diagnostics to copy" />
              </>
            )}
          </>
        )}
      </div>
      <div className="kf-footer">
        <span />
        <Space>
          <Button onClick={() => setProblem(null)} disabled={problem.status === 'sending'}>Back to my report</Button>
          {problem.status !== 'sent' && (
            <Button type="primary" onClick={sendProblem} loading={problem.status === 'sending'}>
              {problem.status === 'failed' ? 'Try again' : 'Send'}
            </Button>
          )}
        </Space>
      </div>
    </>
  );

  return (
    <>
      <Modal
        open={open}
        onCancel={handleClose}
        footer={null}
        width={720}
        centered
        destroyOnHidden={false}
        maskClosable={!submitting}
        className={`kf-modal${hidden ? ' kf-hidden-mask' : ''}`}
        rootClassName="kf-root"
        wrapClassName={`kids-feedback-modal-wrap${hidden ? ' kf-hidden' : ''}`}
        styles={{ mask: hidden ? { display: 'none' } : undefined }}
        closable={false}
        zIndex={1160}
      >
        <div className="kf-head">
          <div>
            <h3>{problem ? 'Problem with this form' : 'Report a bug or share an idea'}</h3>
          </div>
          <Space>
            {!problem && <Tabs
              size="small"
              activeKey={tab}
              onChange={setTab}
              items={[{ key: 'new', label: 'New report' }, { key: 'mine', label: 'My reports' }]}
              style={{ marginBottom: -16 }}
            />}
            <Button type="text" icon={<CloseOutlined />} onClick={handleClose} aria-label="Close" />
          </Space>
        </div>
        {problem ? problemView : tab === 'new' ? (
          <>
            {form}
            {footer}
          </>
        ) : (
          <div style={{ padding: '14px 20px 18px' }}>
            <MyReports refreshKey={refreshKey} onOpenTicket={(k) => { onOpenTicket?.(k); handleClose(); }} />
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(annotateTarget) && (annotateTarget.kind === 'file' || Boolean(shot))}
        onCancel={closeAnnotator}
        footer={null}
        width={960}
        centered
        destroyOnHidden
        wrapClassName="kids-feedback-annotator-wrap"
        rootClassName="kf-root"
        title={shownTarget?.kind === 'file' ? 'Annotate the image' : 'Annotate the screenshot'}
        // A stray click on the mask must not throw the drawing away.
        maskClosable={false}
        zIndex={1170}
      >
        {shownTarget?.kind === 'file' ? (
          <Annotator
            src={shownTarget.url}
            doneLabel="Use this image"
            subject="Image"
            onCancel={closeAnnotator}
            onDone={(blob) => {
              const t = annotateTarget;
              const next = blobToFile(blob, annotatedName(t.file.name), 'image/png');
              // By identity too, so a stale index can never overwrite another file.
              setFiles((p) => p.map((f, j) => (j === t.index && f === t.file ? next : f)));
              closeAnnotator();
            }}
          />
        ) : shot && (
          <Annotator
            src={shot.url}
            onCancel={closeAnnotator}
            onDone={(blob) => {
              URL.revokeObjectURL(shot.url);
              setShot({ ...shot, blob, url: URL.createObjectURL(blob), annotated: true });
              closeAnnotator();
            }}
          />
        )}
      </Modal>

      {screenRec.status === 'recording' && (
        <div className="kids-feedback-pill">
          <span className="dot" /> Recording your screen · {formatMs(screenRec.elapsedMs)}
          <Button size="small" danger icon={<StopOutlined />} onClick={screenRec.stop}>Stop</Button>
        </div>
      )}
    </>
  );
}
