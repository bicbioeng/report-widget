// Element pick in the report (BICBIOENG-105): offered, attached, sent. Runs against src, no DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickOffer, feedbackPayload } from '../src/reportForm.js';
import { createKidsTransport } from '../src/adapters/kids.js';
import { createReadsGraphqlTransport } from '../src/adapters/reads-graphql.js';

// The shape describeElement returns.
const description = {
  tag: 'h2', id: null, classes: ['title'], selector: 'main > h2.title', text: 'Samples',
  ariaLabel: null, role: null, href: null, alt: null, rect: { x: 10, y: 20, width: 300, height: 40 }, html: '<h2 class="title">Samples</h2>',
};
const picked = { description };
const shot = { url: 'blob:x', blob: null };
const form = {
  kind: 'bug', severity: 'minor', summary: '  Table is empty ', expected: '', steps: '', voice: null,
  context: { buildSha: 'abc', errors: [] }, pageUrl: 'https://x/a', route: '/a',
};
const json = (status, body) => ({ ok: status < 400, status, json: async () => body });

test('Report dialog offers element-pick', () => {
  const none = pickOffer({ shot: null, picked: null, capturing: false, hidden: false });
  assert.deepEqual(none, { label: 'Pick an element', disabled: false, placement: 'actions', row: false, chip: false });

  const withShot = pickOffer({ shot, picked: null, capturing: false, hidden: false });
  assert.equal(withShot.label, 'Pick an element');
  assert.equal(withShot.placement, 'row');
  assert.equal(withShot.row, true);

  assert.equal(pickOffer({ shot: null, picked: null, capturing: true, hidden: false }).disabled, true);
  assert.equal(pickOffer({ shot: null, picked: null, capturing: false, hidden: true }).disabled, true);

  const after = pickOffer({ shot, picked, capturing: false, hidden: false });
  assert.equal(after.label, 'Pick again');
  assert.equal(after.chip, true);
  assert.equal(after.row, true);
});

test('a picked element is attached to the report', () => {
  const p = feedbackPayload({ ...form, picked });
  assert.deepEqual(p.context.element, description);
  assert.equal(p.context.buildSha, 'abc');
  assert.deepEqual(p.context.errors, []);
  assert.equal(p.summary, 'Table is empty');
  assert.equal(p.expected, null);
  assert.equal(p.severity, 'minor');

  assert.equal(feedbackPayload({ ...form, picked: null }).context.element, null);
  assert.equal(feedbackPayload({ ...form, kind: 'idea', picked }).severity, null);
});

test('the picked element is sent through the transport', async (t) => {
  const realFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = realFetch; });
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return json(200, { id: 1, ticketKey: 'KIDS-1', data: { submitFeedback: { id: '1' } } });
  };
  const payload = feedbackPayload({ ...form, picked });

  const kids = createKidsTransport({ baseUrl: 'https://kids/api', getAuthHeaders: async () => ({}), onError: () => {} });
  await kids.submitFeedback(payload);
  const post = calls.find((c) => c.url === 'https://kids/api/feedback');
  assert.equal(post?.init.method, 'POST');
  assert.equal(JSON.parse(post.init.body).context.element.selector, description.selector);

  calls.length = 0;
  const reads = createReadsGraphqlTransport({ url: '/graphql', app: 'gedb' });
  const created = await reads.submitFeedback(payload);
  await reads.finalizeFeedback(created.id);
  const { query, variables } = JSON.parse(calls.at(-1).init.body);
  assert.match(query, /submitFeedback/);
  const rich = JSON.parse(variables.input.description.match(/```json\n([\s\S]*)\n```/)[1]);
  assert.equal(rich.context.element.selector, description.selector);
});
