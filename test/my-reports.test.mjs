// My reports: filters, assignee display and staff edit gating (BICBIOENG-119, project filter BICBIOENG-142). Runs against src, no DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assigneeOf, assigneeLabel, assigneeMemberId, filterOptions, filterReports, editCapability, createReportStore, projectOf, NO_PROJECT, STATE_LABELS, KIND_LABELS,
} from '../src/reportFilters.js';
import { createKidsTransport } from '../src/adapters/kids.js';

const items = [
  { id: 1, kind: 'bug', triageState: 'done', ticketKey: 'KIDS-1', assignee: { id: 7, name: 'Ana Diaz' } },
  { id: 2, kind: 'idea', triageState: 'new', ticketKey: 'KIDS-2', ticket: { assignee: 'Bo Li' } },
  { id: 3, kind: 'bug', triageState: 'new', ticketKey: 'KIDS-3' },
  { id: 4, kind: 'bug', triageState: 'in_progress', ticketKey: null, ticket: null },
];
const ids = (list) => list.map((r) => r.id);

test('assignee read from the report', () => {
  assert.deepEqual(assigneeOf({ assignee: { id: 7, name: 'Ana Diaz' } }), { id: 7, name: 'Ana Diaz' });
  assert.equal(assigneeLabel({ assignee: { name: 'Ana Diaz' } }), 'Ana Diaz');
  assert.equal(assigneeLabel({ assignee: { email: 'c@x.org' } }), 'c@x.org');
  assert.equal(assigneeLabel({ assignee: 'Dee' }), 'Dee');
  // The report's own assignee wins over the ticket's.
  assert.equal(assigneeLabel({ assignee: 'Dee', ticket: { assignee: 'Bo Li' } }), 'Dee');
});

test('assignee read from the ticket', () => {
  assert.equal(assigneeLabel({ ticket: { assignee: { displayName: 'Bo Li' } } }), 'Bo Li');
  assert.equal(assigneeLabel({ assignee: null, ticket: { assignee: 'Bo Li' } }), 'Bo Li');
  assert.equal(assigneeOf({ ticket: { assignee: { id: 8, displayName: 'Bo Li' } } }).id, 8);
});

test("missing assignee shown as 'Unassigned'", () => {
  assert.equal(assigneeOf({}), null);
  assert.equal(assigneeOf({ ticket: null }), null);
  assert.equal(assigneeOf({ assignee: {} }), null);
  assert.equal(assigneeOf({ assignee: '' }), null);
  assert.equal(assigneeOf(null), null);
  assert.equal(assigneeLabel({ ticket: { title: 'x' } }), 'Unassigned');
});

test('filter options list only what the reports contain', () => {
  const opts = filterOptions([
    { triageState: 'done', kind: 'bug' }, { triageState: 'new', kind: 'idea', assignee: 'Zed' },
    { triageState: 'new', kind: 'bug', assignee: { name: 'Ana' } }, { triageState: 'in_progress', kind: 'bug', ticket: { assignee: 'Ana' } },
  ]);
  assert.deepEqual(opts.status, [
    { value: 'new', label: 'New' }, { value: 'in_progress', label: 'In progress' }, { value: 'done', label: 'Done' },
  ]);
  assert.deepEqual(opts.assignee.map((o) => o.label), ['Unassigned', 'Ana', 'Zed']);
  assert.equal(opts.assignee[0].value, 'unassigned');
  assert.deepEqual(opts.kind, [{ value: 'bug', label: 'Bug' }, { value: 'idea', label: 'Idea' }]);
  assert.deepEqual(filterOptions([]).assignee.map((o) => o.label), ['Unassigned']);
});

test('filtering by status', () => {
  assert.deepEqual(ids(filterReports(items, {})), [1, 2, 3, 4]);
  assert.deepEqual(ids(filterReports(items, { status: '', assignee: null, kind: undefined })), [1, 2, 3, 4]);
  assert.deepEqual(ids(filterReports(items, { status: 'new' })), [2, 3]);
});

test("filtering by assignee including 'Unassigned'", () => {
  assert.deepEqual(ids(filterReports(items, { assignee: 'unassigned' })), [3, 4]);
  assert.deepEqual(ids(filterReports(items, { assignee: filterOptions(items).assignee.find((o) => o.label === 'Ana Diaz').value })), [1]);
  assert.deepEqual(ids(filterReports(items, { assignee: filterOptions(items).assignee.find((o) => o.label === 'Bo Li').value })), [2]);
});

test('filtering by kind', () => {
  assert.deepEqual(ids(filterReports(items, { kind: 'bug' })), [1, 3, 4]);
  assert.deepEqual(ids(filterReports(items, { kind: 'idea' })), [2]);
});

test('combined filters', () => {
  assert.deepEqual(ids(filterReports(items, { status: 'new', assignee: 'unassigned' })), [3]);
  assert.deepEqual(ids(filterReports(items, { status: 'new', kind: 'idea' })), [2]);
});

test('an empty result', () => {
  const ana = filterOptions(items).assignee.find((o) => o.label === 'Ana Diaz').value;
  assert.deepEqual(filterReports(items, { status: 'new', assignee: ana }), []);
  assert.deepEqual(filterReports([], { status: 'new' }), []);
  assert.deepEqual(filterReports(null, {}), []);
});

test('editCapability hides both controls without canEdit', () => {
  const transport = { updateFeedbackState() {}, updateTicketAssignee() {} };
  const members = [{ id: 7, name: 'Ana Diaz' }];
  const hidden = { status: false, assignee: false };
  assert.deepEqual(editCapability({ members, transport }), hidden);
  assert.deepEqual(editCapability({ canEdit: false, members, transport }), hidden);
  assert.deepEqual(editCapability({}), hidden);
  assert.deepEqual(editCapability(), hidden);
});

test('editCapability hides the assignee control when the member list is empty', () => {
  const transport = { updateFeedbackState() {}, updateTicketAssignee() {} };
  assert.deepEqual(editCapability({ canEdit: true, members: [], transport }), { status: true, assignee: false });
  assert.deepEqual(editCapability({ canEdit: true, transport }), { status: true, assignee: false });
});

test('editCapability hides each control when the transport lacks its update method', () => {
  const members = [{ id: 7, name: 'Ana Diaz' }];
  assert.deepEqual(editCapability({ canEdit: true, members, transport: {} }), { status: false, assignee: false });
  assert.deepEqual(editCapability({ canEdit: true, members, transport: { updateFeedbackState() {} } }), { status: true, assignee: false });
  assert.deepEqual(editCapability({ canEdit: true, members, transport: { updateTicketAssignee() {} } }), { status: false, assignee: true });
});

test('editCapability shows both with canEdit, members and both methods', () => {
  const transport = { updateFeedbackState() {}, updateTicketAssignee() {} };
  assert.deepEqual(editCapability({ canEdit: true, members: [{ id: 7, name: 'Ana Diaz' }], transport }), { status: true, assignee: true });
});

const alexes = [{ id: 7, name: 'Alex' }, { id: 8, name: 'Alex' }];

test('assigneeMemberId picks the member by ID when two share a name', () => {
  assert.equal(assigneeMemberId({ id: 8, name: 'Alex' }, alexes), 8);
  assert.equal(assigneeMemberId({ id: 7, name: 'Alex' }, alexes), 7);
});

test('assigneeMemberId matches a string ID against a numeric member ID', () => {
  assert.equal(assigneeMemberId({ id: '8', name: 'Alex' }, alexes), 8);
});

test('assigneeMemberId does not fall back to the name when no member has the ID', () => {
  assert.equal(assigneeMemberId({ id: 9, name: 'Alex' }, alexes), undefined);
  assert.equal(assigneeMemberId({ id: 9, name: 'Alex' }, [{ id: 7, name: 'Alex' }]), undefined);
});

test('assigneeMemberId matches a name-only assignee to the one member with that name', () => {
  const team = [{ id: 7, name: 'Ana Diaz' }, { id: 12, name: 'Bo Li' }];
  assert.equal(assigneeMemberId({ id: null, name: 'Bo Li' }, team), 12);
  assert.equal(assigneeMemberId(assigneeOf(items[1]), team), 12);
});

test('assigneeMemberId selects nobody for a name-only assignee two members share', () => {
  assert.equal(assigneeMemberId({ id: null, name: 'Bo Li' }, [{ id: 12, name: 'Bo Li' }, { id: 13, name: 'Bo Li' }]), undefined);
  assert.equal(assigneeMemberId({ id: null, name: 'Alex' }, alexes), undefined);
});

test('assigneeMemberId returns null for no assignee', () => {
  assert.equal(assigneeMemberId(null, alexes), null);
});

test('assigneeMemberId returns undefined for an empty or missing member list', () => {
  assert.equal(assigneeMemberId({ id: 8, name: 'Alex' }, []), undefined);
  assert.equal(assigneeMemberId({ id: null, name: 'Alex' }, undefined), undefined);
});

test('labels live in the DOM-free module', () => {
  assert.equal(STATE_LABELS.in_progress, 'In progress');
  assert.equal(KIND_LABELS.bug, 'Bug');
});

const json = (status, body) => ({ ok: status < 400, status, json: async () => body });

function kidsWith(t, respond) {
  const realFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = realFetch; });
  const calls = [];
  const errors = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return respond(); };
  const kids = createKidsTransport({ baseUrl: 'https://kids/api', getAuthHeaders: async () => ({}), onError: (text) => errors.push(text) });
  return { kids, calls, errors };
}

test('KIDS updateFeedbackState sends PATCH /feedback/:id/state with { state }', async (t) => {
  const { kids, calls } = kidsWith(t, () => json(200, { ok: true }));
  await kids.updateFeedbackState(42, 'done');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://kids/api/feedback/42/state');
  assert.equal(calls[0].init.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0].init.body), { state: 'done' });
});

test('KIDS updateTicketAssignee sends PATCH /agile/tickets/:key with { assigneeId }, null to unassign', async (t) => {
  const { kids, calls } = kidsWith(t, () => json(200, { ok: true }));
  await kids.updateTicketAssignee('KIDS 1/x', 8);
  assert.equal(calls[0].url, 'https://kids/api/agile/tickets/KIDS%201%2Fx');
  assert.equal(calls[0].init.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0].init.body), { assigneeId: 8 });
  await kids.updateTicketAssignee('KIDS-1', null);
  assert.equal(calls[1].url, 'https://kids/api/agile/tickets/KIDS-1');
  assert.deepEqual(JSON.parse(calls[1].init.body), { assigneeId: null });
});

test('a 4xx from either KIDS update method rejects and is reported once', async (t) => {
  const { kids, errors } = kidsWith(t, () => json(400, { error: 'Not allowed' }));
  await assert.rejects(kids.updateFeedbackState(1, 'done'), /Not allowed/);
  assert.deepEqual(errors, ['Not allowed']);
  errors.length = 0;
  await assert.rejects(kids.updateTicketAssignee('KIDS-1', 7), /Not allowed/);
  assert.deepEqual(errors, ['Not allowed']);
});

// Refetches (refreshKey) and optimistic edits must not overwrite one another.
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const row = (store, id) => store.items.find((r) => r.id === id);
const fresh = () => items.map((r) => ({ ...r }));
async function loaded() {
  const store = createReportStore();
  await store.load(() => Promise.resolve({ items: fresh() }));
  return store;
}

test('a fetch started before a successful edit does not overwrite it', async () => {
  const store = await loaded();
  const stale = deferred();
  const refetch = store.load(() => stale.promise);
  const call = deferred();
  const edit = store.edit(row(store, 3), 'status', 'done', () => call.promise);
  assert.equal(store.isBusy(3, 'status'), true);
  call.resolve();
  assert.equal(await edit, true);
  assert.equal(store.isBusy(3, 'status'), false);
  stale.resolve({ items: fresh() }); // still says 'new'
  await refetch;
  assert.equal(row(store, 3).triageState, 'done');
  // A fetch started after the edit settled is the truth again.
  await store.load(() => Promise.resolve({ items: fresh().map((r) => (r.id === 3 ? { ...r, triageState: 'testing' } : r)) }));
  assert.equal(row(store, 3).triageState, 'testing');
});

test('an edit rejected after newer data arrived restores the newer data, not the old fields', async () => {
  const store = await loaded();
  const call = deferred();
  const edit = store.edit(row(store, 2), 'assignee', { assignee: { id: 7, name: 'Ana Diaz' }, ticket: { id: 7, name: 'Ana Diaz' } }, () => call.promise);
  assert.equal(assigneeLabel(row(store, 2)), 'Ana Diaz');
  const newer = fresh().map((r) => (r.id === 2 ? { ...r, triageState: 'in_progress', ticket: { title: 'Renamed', assignee: 'Cy Ro' } } : r));
  await store.load(() => Promise.resolve({ items: newer }));
  assert.equal(assigneeLabel(row(store, 2)), 'Ana Diaz', 'the pending edit stays shown over the refetch');
  assert.equal(row(store, 2).triageState, 'in_progress');
  call.reject(new Error('Not allowed'));
  assert.equal(await edit, false);
  assert.equal(assigneeLabel(row(store, 2)), 'Cy Ro');
  assert.equal(row(store, 2).ticket.title, 'Renamed');
  assert.equal(row(store, 2).triageState, 'in_progress');
});

test('a rejected edit with no refetch reverts to the previous value', async () => {
  const store = await loaded();
  const edit = store.edit(row(store, 3), 'status', 'done', () => Promise.reject(new Error('x')));
  assert.equal(row(store, 3).triageState, 'done');
  assert.equal(await edit, false);
  assert.equal(row(store, 3).triageState, 'new');
});

test('only the latest of overlapping fetches lands', async () => {
  const store = await loaded();
  const first = deferred(); const second = deferred();
  const a = store.load(() => first.promise); const b = store.load(() => second.promise);
  second.resolve({ items: [{ ...items[0], triageState: 'testing' }] });
  await b;
  first.resolve({ items: fresh() });
  await a;
  assert.deepEqual(store.items.map((r) => [r.id, r.triageState]), [[1, 'testing']]);
});

test('a stale refetch landing while a later edit is pending keeps the earlier success as its base', async () => {
  const store = await loaded();
  const stale = deferred();
  const refetch = store.load(() => stale.promise);
  await store.edit(row(store, 3), 'status', 'done', () => Promise.resolve());
  const call = deferred();
  const edit = store.edit(row(store, 3), 'status', 'testing', () => call.promise);
  stale.resolve({ items: fresh() }); // from before the first edit
  await refetch;
  assert.equal(row(store, 3).triageState, 'testing');
  call.reject(new Error('x'));
  await edit;
  assert.equal(row(store, 3).triageState, 'done');
});

test('a later edit rejected before a stale refetch lands keeps the earlier success', async () => {
  const store = await loaded();
  const stale = deferred();
  const refetch = store.load(() => stale.promise);
  const ok = deferred();
  const first = store.edit(row(store, 3), 'status', 'done', () => ok.promise);
  ok.resolve();
  assert.equal(await first, true);
  const bad = deferred();
  const second = store.edit(row(store, 3), 'status', 'testing', () => bad.promise);
  assert.equal(row(store, 3).triageState, 'testing');
  bad.reject(new Error('x'));
  assert.equal(await second, false);
  assert.equal(row(store, 3).triageState, 'done');
  stale.resolve({ items: fresh() }); // still says 'new'
  await refetch;
  assert.equal(row(store, 3).triageState, 'done');
  // A fetch started after both edits is the truth again.
  await store.load(() => Promise.resolve({ items: fresh() }));
  assert.equal(row(store, 3).triageState, 'new');
});

// Project filter (BICBIOENG-142).
const projectItems = [
  { id: 1, kind: 'bug', triageState: 'new', ticketKey: 'GERMANIUM-150', project: 'GERMANIUM' },
  { id: 2, kind: 'bug', triageState: 'done', ticketKey: 'BNFR-12' }, // project only from the ticket key
  { id: 3, kind: 'idea', triageState: 'new', ticketKey: null, ticket: null }, // no project at all
  { id: 4, kind: 'bug', triageState: 'done', ticketKey: 'KIDS-9', project: { key: 'GERMANIUM', name: 'Germanium' } },
];

test('projectOf reads report.project, then ticket.project, then the ticket key prefix', () => {
  assert.equal(projectOf({ project: 'GEDB', ticketKey: 'KIDS-1' }), 'GEDB');
  assert.equal(projectOf({ project: { key: 'GEDB', name: 'GeDB' } }), 'GEDB');
  assert.equal(projectOf({ project: { prefix: 'BNFR' } }), 'BNFR');
  assert.equal(projectOf({ project: { name: 'Germanium' } }), 'Germanium');
  assert.equal(projectOf({ ticket: { project: 'KIDS' }, ticketKey: 'X-1' }), 'KIDS');
  assert.equal(projectOf({ ticketKey: 'GERMANIUM-170' }), 'GERMANIUM');
  assert.equal(projectOf({ ticketKey: 'MY-APP-3' }), 'MY-APP');
  assert.equal(projectOf({ ticketKey: null }), null);
  assert.equal(projectOf({ ticketKey: 'nodash' }), null);
  assert.equal(projectOf({ project: {} }), null);
  assert.equal(projectOf(null), null);
});

test("project filter options list each project once and 'No project' when a report has none", () => {
  assert.deepEqual(filterOptions(projectItems).project, [
    { value: 'BNFR', label: 'BNFR' }, { value: 'GERMANIUM', label: 'GERMANIUM' }, { value: NO_PROJECT, label: 'No project' },
  ]);
  assert.deepEqual(filterOptions([projectItems[0]]).project, [{ value: 'GERMANIUM', label: 'GERMANIUM' }]);
  // A selected project no report holds any more stays listed.
  assert.deepEqual(filterOptions([projectItems[0]], { project: 'BNFR' }).project.map((o) => o.value), ['BNFR', 'GERMANIUM']);
  assert.deepEqual(filterOptions([projectItems[0]], { project: NO_PROJECT }).project.map((o) => o.value), ['GERMANIUM', NO_PROJECT]);
});

test('filtering by project, alone and with a status filter', () => {
  assert.deepEqual(ids(filterReports(projectItems, { project: 'GERMANIUM' })), [1, 4]);
  assert.deepEqual(ids(filterReports(projectItems, { project: 'BNFR' })), [2]);
  assert.deepEqual(ids(filterReports(projectItems, { project: NO_PROJECT })), [3]);
  assert.deepEqual(ids(filterReports(projectItems, { project: 'GERMANIUM', status: 'done' })), [4]);
  assert.deepEqual(ids(filterReports(projectItems, { project: 'BNFR', status: 'new' })), []);
});

// The reporter's scenario end to end, over a fake transport (no network).
const scenarioReports = () => [
  { id: 1, kind: 'bug', triageState: 'in_progress', summary: 'Details page crashes on empty gene', ticketKey: 'GERMANIUM-170', assignee: { id: 'u1', name: 'Etienne Gnimpieba Zohim' } },
  { id: 2, kind: 'bug', triageState: 'in_progress', summary: 'Upload stalls at 99%', ticketKey: 'BNFR-21', assignee: { id: 'u2', name: 'Ana Diaz' } },
  { id: 3, kind: 'idea', triageState: 'new', summary: 'Gamma: export as CSV', ticketKey: 'GERMANIUM-150', ticket: { assignee: null } },
  { id: 4, kind: 'bug', triageState: 'done', summary: 'Logo blurry', ticketKey: 'KIDS-4', assignee: { id: 'u1', name: 'Etienne Gnimpieba Zohim' } },
];
const scenarioMembers = [{ id: 'u1', name: 'Etienne Gnimpieba Zohim' }, { id: 'u2', name: 'Ana Diaz' }, { id: 'u3', name: 'Pat Lee' }];

function fakeTransport({ reject = false } = {}) {
  const calls = [];
  return {
    calls,
    fetchMyFeedback: async () => ({ items: scenarioReports() }),
    updateFeedbackState: async (id, state) => { calls.push(['state', id, state]); if (reject) throw new Error('Not allowed'); },
    updateTicketAssignee: async (key, assigneeId) => { calls.push(['assignee', key, assigneeId]); if (reject) throw new Error('Not allowed'); },
  };
}

// Same calls MyReports.jsx makes from the row controls.
const setStatus = (store, transport, r, state) => store.edit(r, 'status', state, () => transport.updateFeedbackState(r.id, state));
function setAssignee(store, transport, r, memberId) {
  const m = scenarioMembers.find((x) => x.id === memberId);
  const next = m ? { id: m.id, name: m.name } : null;
  return store.edit(r, 'assignee', { assignee: next, ticket: next }, () => transport.updateTicketAssignee(r.ticketKey, m ? m.id : null));
}

test('My reports: filtering by status then assignee leaves only the matching report', async () => {
  const transport = fakeTransport();
  const store = createReportStore();
  await store.load(() => transport.fetchMyFeedback());
  assert.equal(store.items.length, 4);
  const byStatus = filterReports(store.items, { status: 'in_progress' });
  assert.deepEqual(ids(byStatus), [1, 2]);
  const etienne = filterOptions(store.items, { status: 'in_progress' }).assignee.find((o) => o.label === 'Etienne Gnimpieba Zohim').value;
  const both = filterReports(store.items, { status: 'in_progress', assignee: etienne });
  assert.deepEqual(both.map((r) => r.summary), ['Details page crashes on empty gene']);
  // A project filter narrows the same way.
  assert.deepEqual(ids(filterReports(store.items, { status: 'in_progress', project: 'BNFR' })), [2]);
  assert.deepEqual(ids(filterReports(store.items, { status: 'in_progress', assignee: etienne, project: 'BNFR' })), []);
  assert.deepEqual(ids(filterReports(store.items, { project: 'GERMANIUM' })), [1, 3]);
});

test('My reports: a status and an assignee edit reach the fake transport and show in the list', async () => {
  const transport = fakeTransport();
  const store = createReportStore();
  await store.load(() => transport.fetchMyFeedback());
  assert.deepEqual(editCapability({ canEdit: true, members: scenarioMembers, transport }), { status: true, assignee: true });

  assert.equal(await setStatus(store, transport, row(store, 3), 'done'), true);
  assert.equal(await setAssignee(store, transport, row(store, 2), 'u3'), true);
  assert.deepEqual(transport.calls, [['state', 3, 'done'], ['assignee', 'BNFR-21', 'u3']]);

  assert.equal(row(store, 3).triageState, 'done');
  assert.equal(assigneeLabel(row(store, 2)), 'Pat Lee');
  assert.deepEqual(ids(filterReports(store.items, { status: 'done' })), [3, 4]);
  assert.deepEqual(ids(filterReports(store.items, { assignee: 'Pat Lee' })), [2]);
});

test('My reports: a status edit the fake transport rejects goes back to the previous status', async () => {
  const transport = fakeTransport({ reject: true });
  const store = createReportStore();
  await store.load(() => transport.fetchMyFeedback());
  const edit = setStatus(store, transport, row(store, 3), 'done');
  assert.equal(row(store, 3).triageState, 'done', 'shown at once');
  assert.equal(await edit, false);
  assert.deepEqual(transport.calls, [['state', 3, 'done']]);
  assert.equal(row(store, 3).triageState, 'new');
  assert.deepEqual(ids(filterReports(store.items, { status: 'done' })), [4]);
});
