/**
 * "Problem with this form?" — a report about the Report tool itself.
 *
 * Pure builders (no window/document) so they run under node:test and SSR.
 * The widget gathers browser/viewport via pageMetadata() and passes them in.
 */

// Injected by tsup `define` from package.json at build time — no env reads.
export const WIDGET_VERSION = __WIDGET_VERSION__;

export const REPORT_TOOL_KIND = 'report-tool';
export const REPORT_TOOL_PREFIX = 'Report tool: ';
const MAX_TEXT = 280;
const MAX_STACK = 2000;

/** Free text the reporter typed, clipped so the diagnostics stay small. */
export function clipText(v, max = MAX_TEXT) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max)}… (+${s.length - max} chars)` : s;
}

/** Error → { stage, message, stack }; accepts an Error, a string or an existing record. */
export function errorRecord(stage, e) {
  if (!e) return null;
  return {
    stage: stage || null,
    message: clipText(e.message ?? e, 600),
    stack: typeof e.stack === 'string' ? e.stack.slice(0, MAX_STACK) : null,
  };
}

/**
 * input: {
 *   state, progress?, lastError?, failedAttachments?, browser?, viewport?,
 *   form?: { kind, severity, summary, expected, steps, transcript, shot, voice, screen, files }
 * }
 */
export function buildDiagnostics({
  state, progress, lastError, failedAttachments, browser, viewport, form = {}, now = new Date(),
} = {}) {
  const f = form;
  return {
    widgetVersion: WIDGET_VERSION,
    state: state || 'unknown',
    progress: progress || null,
    lastError: lastError || null,
    form: {
      kind: f.kind || null,
      severity: f.kind === 'bug' ? f.severity || null : null,
      summary: clipText(f.summary),
      expected: clipText(f.expected),
      steps: clipText(f.steps),
      transcript: clipText(f.transcript),
      screenshot: f.shot ? { method: f.shot.method || null, annotated: Boolean(f.shot.annotated) } : null,
      voiceNote: f.voice ? { durationMs: f.voice.durationMs ?? null, mimeType: f.voice.mimeType || null } : null,
      screenRecording: f.screen ? { durationMs: f.screen.durationMs ?? null, mimeType: f.screen.mimeType || null } : null,
      files: (f.files || []).map((x) => ({ name: x.name, type: x.type || null, size: x.size ?? null })),
    },
    failedAttachments: (failedAttachments || []).map((a) => ({ name: a.name, error: clipText(a.error, 300) })),
    browser: browser || null,
    viewport: viewport || null,
    capturedAt: now.toISOString(),
  };
}

/** The payload for transport.submitFeedback — same contract, kind 'report-tool'. */
export function buildReportToolPayload({ text, diagnostics, pageUrl = null, route = null, context = {} }) {
  const said = String(text || '').trim();
  return {
    kind: REPORT_TOOL_KIND,
    severity: null,
    summary: `${REPORT_TOOL_PREFIX}${said || '(no description, see diagnostics)'}`.slice(0, 20000),
    expected: null,
    steps: null,
    transcript: null,
    transcriptSource: null,
    pageUrl,
    route,
    // Inside context (not top level): both adapters and the KIDS server keep
    // `context` as-is, while unknown top-level fields are dropped.
    context: { ...context, diagnostics },
  };
}
