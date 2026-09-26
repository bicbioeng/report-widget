// Runs against the built dist: `npm run build && npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { FeedbackWidget, ReportProvider } from '../dist/index.js';
import { createReadsGraphqlTransport } from '../dist/adapters/reads-graphql.js';
import { createKidsTransport } from '../dist/adapters/kids.js';

const payload = { kind: 'bug', severity: 'minor', summary: 'Table is empty', expected: null, steps: null, transcript: null, transcriptSource: null, pageUrl: 'https://x/a', route: '/a', context: { errors: [] } };
const json = (status, body) => ({ ok: status < 400, status, json: async () => body });

test('renders on the server (no window/document at import or render)', () => {
  const transport = createReadsGraphqlTransport({ url: '/graphql', app: 'gedb' });
  const html = renderToString(h(ReportProvider, { config: { transport } }, h(FeedbackWidget)));
  assert.match(html, /kids-feedback-fab/);
});

test('reads-graphql: one mutation after uploads, title prefixed, screenshot picked', async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    if (init.method === 'PUT') return json(200, {});
    const { query, variables } = JSON.parse(init.body);
    if (query.includes('getUploadUrl')) return json(200, { data: { getUploadUrl: { uploadUrl: `https://s3/${variables.filename}`, fileUrl: `https://cdn/${variables.folder}/${variables.filename}` } } });
    return json(200, { data: { submitFeedback: { id: '1' } } });
  };
  const t = createReadsGraphqlTransport({ url: '/graphql', app: 'bnfr', getEmail: () => 'a@b.c' });
  const created = await t.submitFeedback(payload);
  assert.equal(created.ticketKey, null);
  assert.equal(calls.length, 0, 'nothing sent before finalize');
  await t.uploadFeedbackFile(null, new File(['x'], 'screenshot-annotated.png', { type: 'image/png' }));
  await t.uploadFeedbackFile(null, new File(['y'], 'log.txt', { type: 'text/plain' }));
  await t.finalizeFeedback(created.id);
  const { variables } = JSON.parse(calls.at(-1).init.body);
  assert.equal(variables.input.title, '[BNFR] Table is empty');
  assert.equal(variables.input.email, 'a@b.c');
  assert.equal(variables.input.screenshotUrl, 'https://cdn/bnfr-feedback/screenshot-annotated.png');
  assert.match(variables.input.description, /"app": "bnfr"/);
  assert.match(variables.input.description, /log\.txt/);
  assert.deepEqual(await t.finalizeFeedback(created.id), {}, 'second finalize is a no-op');
  assert.equal(calls.length, 5);
});

test('reads-graphql: Apollo client path uses gql documents', async () => {
  const seen = [];
  const client = { mutate: async (o) => { seen.push(o); return { data: {} }; }, query: async () => ({ data: {} }) };
  const t = createReadsGraphqlTransport({ client, gql: (s) => ({ doc: s }), app: 'gedb' });
  const { id } = await t.submitFeedback(payload);
  await t.finalizeFeedback(id);
  assert.match(seen[0].mutation.doc, /mutation SubmitFeedback/);
  assert.equal(seen[0].variables.input.title, '[GEDB] Table is empty');
});

test('kids: REST calls, ticketKey threaded to uploads, errors toasted once', async () => {
  const calls = [];
  const toasts = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push(`${init.method || 'GET'} ${url}`);
    if (url.endsWith('/feedback')) return json(201, { id: 7, ticketKey: 'BIC-9' });
    if (url.endsWith('/presign')) return json(200, { uploadUrl: 'https://s3/put', s3Key: 'k' });
    if (url === 'https://s3/put') return json(200, {});
    if (url.endsWith('/feedback/mine')) return json(500, { error: 'boom' });
    return json(200, {});
  };
  const t = createKidsTransport({ baseUrl: 'https://kids/api', getAuthHeaders: async () => ({ Authorization: 'Bearer t' }), onError: (m) => toasts.push(m) });
  const created = await t.submitFeedback(payload);
  assert.equal(created.ticketKey, 'BIC-9');
  await t.uploadFeedbackFile(created.ticketKey, new File(['x'], 'screenshot.png', { type: 'image/png' }));
  await t.finalizeFeedback(created.id);
  await assert.rejects(t.fetchMyFeedback(), /boom/);
  assert.deepEqual(toasts, [], 'silent calls do not toast');
  assert.deepEqual(calls, [
    'POST https://kids/api/feedback',
    'POST https://kids/api/agile/tickets/BIC-9/attachments/presign',
    'PUT https://s3/put',
    'POST https://kids/api/agile/tickets/BIC-9/attachments',
    'POST https://kids/api/feedback/7/finalize',
    'GET https://kids/api/feedback/mine',
  ]);
  globalThis.fetch = async () => json(400, { error: 'Tell us what happened' });
  await assert.rejects(t.submitFeedback(payload));
  assert.deepEqual(toasts, ['Tell us what happened']);
});
