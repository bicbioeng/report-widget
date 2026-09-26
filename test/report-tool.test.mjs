// "Problem with this form?" — diagnostics builder and report-tool payload, against dist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  WIDGET_VERSION, buildDiagnostics, buildReportToolPayload, errorRecord, clipText,
} from '../dist/index.js';
import { createReadsGraphqlTransport } from '../dist/adapters/reads-graphql.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const browser = { name: 'Chrome', version: '130', os: 'macOS', osVersion: '15', platform: 'desktop', ua: 'UA' };
const viewport = { width: 1280, height: 800, dpr: 2, screen: '1440x900' };

test('diagnostics: version, state, last error, clipped fields, failed attachments, browser/viewport', () => {
  const err = new Error('Request failed (500)');
  const d = buildDiagnostics({
    state: 'submit-failed',
    progress: '',
    lastError: errorRecord('submit', err),
    failedAttachments: [{ name: 'screen-recording.webm', error: 'S3 upload failed (403)' }],
    browser,
    viewport,
    form: {
      kind: 'bug',
      severity: 'blocked',
      summary: 'x'.repeat(1000),
      expected: '  ',
      steps: '1. open\n2. click',
      transcript: undefined,
      shot: { blob: {}, url: 'blob:1', method: 'quick', annotated: true },
      voice: null,
      screen: { blob: {}, durationMs: 4200, mimeType: 'video/webm' },
      files: [{ name: 'log.txt', type: 'text/plain', size: 12 }],
    },
    now: new Date('2026-09-25T12:00:00Z'),
  });
  assert.equal(WIDGET_VERSION, version);
  assert.equal(d.widgetVersion, version);
  assert.equal(d.state, 'submit-failed');
  assert.equal(d.progress, null);
  assert.equal(d.lastError.stage, 'submit');
  assert.equal(d.lastError.message, 'Request failed (500)');
  assert.match(d.lastError.stack, /Request failed/);
  assert.equal(d.form.summary.length, 280 + '… (+720 chars)'.length);
  assert.ok(d.form.summary.endsWith('… (+720 chars)'));
  assert.equal(d.form.expected, null, 'blank text is null');
  assert.equal(d.form.steps, '1. open\n2. click');
  assert.equal(d.form.severity, 'blocked');
  assert.deepEqual(d.form.screenshot, { method: 'quick', annotated: true }, 'no blob or object URL leaks in');
  assert.equal(d.form.voiceNote, null);
  assert.deepEqual(d.form.screenRecording, { durationMs: 4200, mimeType: 'video/webm' });
  assert.deepEqual(d.form.files, [{ name: 'log.txt', type: 'text/plain', size: 12 }]);
  assert.deepEqual(d.failedAttachments, [{ name: 'screen-recording.webm', error: 'S3 upload failed (403)' }]);
  assert.deepEqual(d.browser, browser);
  assert.deepEqual(d.viewport, viewport);
  assert.equal(d.capturedAt, '2026-09-25T12:00:00.000Z');
  assert.doesNotThrow(() => JSON.stringify(d));
});

test('diagnostics: empty input is safe; severity only for bugs; string errors', () => {
  const d = buildDiagnostics();
  assert.equal(d.state, 'unknown');
  assert.equal(d.lastError, null);
  assert.deepEqual(d.failedAttachments, []);
  assert.deepEqual(d.form.files, []);
  assert.equal(buildDiagnostics({ form: { kind: 'idea', severity: 'blocked' } }).form.severity, null);
  assert.deepEqual(errorRecord('screen-recording', 'Permission denied'), { stage: 'screen-recording', message: 'Permission denied', stack: null });
  assert.equal(errorRecord('x', null), null);
  assert.equal(clipText('abc', 2), 'ab… (+1 chars)');
});

test('report-tool payload: v1 shape, kind, prefixed summary, diagnostics inside context', () => {
  const diagnostics = buildDiagnostics({ state: 'editing', browser, viewport });
  const p = buildReportToolPayload({
    text: '  Send did nothing  ',
    diagnostics,
    pageUrl: 'https://x/a',
    route: '/a',
    context: { buildSha: 'abc', errors: [], routeHistory: [] },
  });
  assert.deepEqual(Object.keys(p).sort(), ['context', 'expected', 'kind', 'pageUrl', 'route', 'severity', 'steps', 'summary', 'transcript', 'transcriptSource']);
  assert.equal(p.kind, 'report-tool');
  assert.equal(p.severity, null);
  assert.equal(p.summary, 'Report tool: Send did nothing');
  assert.equal(p.context.buildSha, 'abc', 'regular context is kept');
  assert.equal(p.context.diagnostics, diagnostics);
  assert.equal(buildReportToolPayload({ text: '', diagnostics }).summary, 'Report tool: (no description, see diagnostics)');
});

test('report-tool payload goes through reads-graphql unchanged: title prefix and diagnostics in the description', async () => {
  let sent = null;
  const client = { mutate: async (o) => { sent = o.variables.input; return { data: {} }; }, query: async () => ({ data: {} }) };
  const t = createReadsGraphqlTransport({ client, gql: (s) => s, app: 'gedb' });
  const diagnostics = buildDiagnostics({ state: 'submit-failed', lastError: errorRecord('submit', new Error('boom')) });
  const { id, ticketKey } = await t.submitFeedback(buildReportToolPayload({ text: 'Send failed', diagnostics }));
  assert.equal(ticketKey, null);
  assert.equal(sent, null, 'nothing sent before finalize');
  await t.finalizeFeedback(id);
  assert.equal(sent.title, '[GEDB] Report tool: Send failed');
  assert.match(sent.description, /"kind": "report-tool"/);
  assert.match(sent.description, /"diagnostics": \{/);
  assert.match(sent.description, /"stage": "submit"/);
});
