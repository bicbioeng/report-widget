/**
 * My reports logic MyReports renders: assignee, filter options, filtering and
 * the staff edit gate. Free of JSX and antd so node:test runs it against src.
 */
export const STATE_LABELS = { new: 'New', acknowledged: 'Acknowledged', in_progress: 'In progress', testing: 'Testing', done: 'Done', dismissed: 'Dismissed' };
export const KIND_LABELS = { bug: 'Bug', idea: 'Idea', question: 'Question', 'report-tool': 'Report tool' };

/** Filter value for reports nobody is assigned to. */
export const UNASSIGNED = 'unassigned';
/** Filter value for reports with no project. */
export const NO_PROJECT = 'no-project';
/** Every filter cleared: the starting state and what 'Clear filters' sets. */
export const NO_FILTERS = { status: undefined, project: undefined, assignee: undefined, kind: undefined };

function readAssignee(v) {
  if (!v) return null;
  if (typeof v === 'string') return { id: null, name: v };
  if (typeof v !== 'object') return null;
  const name = v.name || v.displayName || v.email;
  return name ? { id: v.id ?? null, name: String(name) } : null;
}

/** { id, name } from report.assignee, else report.ticket.assignee, else null. */
export function assigneeOf(report) {
  return readAssignee(report?.assignee) || readAssignee(report?.ticket?.assignee);
}

export function assigneeLabel(report) {
  return assigneeOf(report)?.name || 'Unassigned';
}

/**
 * The member id the row's Assignee control selects for assigneeOf(report):
 * null for no assignee; with an id, the member with that id (never a name
 * match); without one, the only member of that name. undefined when none fits.
 */
export function assigneeMemberId(assignee, members) {
  if (!assignee) return null;
  const list = members || [];
  if (assignee.id != null && assignee.id !== '') return list.find((m) => String(m.id) === String(assignee.id))?.id;
  const named = list.filter((m) => m.name === assignee.name);
  return named.length === 1 ? named[0].id : undefined;
}

function readProject(v) {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v !== 'object') return null;
  const p = v.key || v.prefix || v.name;
  return p ? String(p) : null;
}

/** report.project (string or { key | prefix | name }), else ticket.project, else the ticket key's prefix, else null. */
export function projectOf(report) {
  const p = readProject(report?.project) || readProject(report?.ticket?.project);
  if (p) return p;
  const key = typeof report?.ticketKey === 'string' ? report.ticketKey : '';
  const dash = key.lastIndexOf('-');
  return dash > 0 ? key.slice(0, dash) : null;
}

const assigneeKey =(report) => assigneeOf(report)?.name ?? UNASSIGNED;
const projectKey = (report) => projectOf(report) ?? NO_PROJECT;

const stateLabel = (s) => STATE_LABELS[s] || s;
const kindLabel = (k) => KIND_LABELS[k] || k;
const ORDER = Object.keys(STATE_LABELS);
const byState = (a, b) => {
  const i = ORDER.indexOf(a); const j = ORDER.indexOf(b);
  return (i < 0 ? ORDER.length : i) - (j < 0 ? ORDER.length : j);
};

/**
 * Options for the four filters, drawn from what the items hold. A selected
 * value no item has any more (after an edit) stays listed, so the Select
 * keeps its readable label instead of a raw key.
 */
export function filterOptions(items, selected = {}) {
  const list = items || [];
  const states = new Set(list.map((r) => r.triageState).filter(Boolean));
  const kinds = new Set(list.map((r) => r.kind).filter(Boolean));
  const names = new Set(list.map((r) => assigneeOf(r)?.name).filter(Boolean));
  const projects = new Set(list.map(projectOf).filter(Boolean));
  const noProject = list.some((r) => !projectOf(r)) || selected.project === NO_PROJECT;
  if (selected.status) states.add(selected.status);
  if (selected.project && selected.project !== NO_PROJECT) projects.add(selected.project);
  if (selected.kind) kinds.add(selected.kind);
  if (selected.assignee && selected.assignee !== UNASSIGNED) names.add(selected.assignee);
  return {
    status: [...states].sort(byState).map((s) => ({ value: s, label: stateLabel(s) })),
    assignee: [
      { value: UNASSIGNED, label: 'Unassigned' },
      ...[...names].sort((a, b) => a.localeCompare(b)).map((n) => ({ value: n, label: n })),
    ],
    kind: [...kinds].map((k) => ({ value: k, label: kindLabel(k) })),
    project: [
      ...[...projects].sort((a, b) => a.localeCompare(b)).map((p) => ({ value: p, label: p })),
      ...(noProject ? [{ value: NO_PROJECT, label: 'No project' }] : []),
    ],
  };
}

/** Empty filters mean 'all'; set ones combine with AND. */
export function filterReports(items, { status, assignee, kind, project } = {}) {
  return (items || []).filter((r) => (!status || r.triageState === status)
    && (!kind || r.kind === kind)
    && (!assignee || assigneeKey(r) === assignee)
    && (!project || projectKey(r) === project));
}

/** Which row controls the host allows. The Assignee control also needs a ticketKey on the row. */
export function editCapability({ canEdit, members, transport } = {}) {
  const can = canEdit === true;
  return {
    status: can && typeof transport?.updateFeedbackState === 'function',
    assignee: can && Array.isArray(members) && members.length > 0 && typeof transport?.updateTicketAssignee === 'function',
  };
}

// Row fields the staff controls edit: how to read one off a row and write it back.
const FIELDS = {
  status: { read: (r) => r.triageState, write: (r, v) => ({ ...r, triageState: v }) },
  // Both places, so an explicit unassign is not read back from ticket.assignee.
  assignee: {
    read: (r) => ({ assignee: r.assignee, ticket: r.ticket?.assignee }),
    write: (r, v) => ({ ...r, assignee: v.assignee, ticket: r.ticket ? { ...r.ticket, assignee: v.ticket } : r.ticket }),
  },
};

/**
 * The My reports list with refetches and optimistic edits that cannot
 * overwrite one another. Only the latest fetch lands. A pending edit's value
 * is laid over any fetch that lands meanwhile, and a rejection restores the
 * newest server value seen, not the one from before the edit. A successful
 * edit is kept over fetches that started before it settled.
 */
export function createReportStore(onChange = () => {}) {
  let items = null;
  let started = 0; // fetches started
  let landed = 0; // the latest fetch that landed
  const edits = new Map(); // `${id}:${field}` -> { id, field, value, base, pending, settledAt, staleUntil }
  const emit = () => onChange(items);
  const write = (id, field, value) => {
    if (items) items = items.map((r) => (r.id === id ? FIELDS[field].write(r, value) : r));
  };
  return {
    get items() { return items; },
    isBusy: (id, field) => !!edits.get(`${id}:${field}`)?.pending,
    /** fetch: () => Promise<{ items }>. A failed fetch shows an empty list. */
    load(fetch) {
      const seq = ++started;
      return new Promise((res) => res(fetch())).then((r) => r?.items || [], () => []).then((list) => {
        if (seq !== started) return;
        landed = seq;
        items = list;
        for (const [k, e] of edits) {
          const row = items.find((r) => r.id === e.id);
          if (e.pending) {
            if (row && seq > e.staleUntil) e.base = FIELDS[e.field].read(row);
            write(e.id, e.field, e.value);
          } else {
            if (seq <= e.settledAt) write(e.id, e.field, e.value);
            edits.delete(k);
          }
        }
        emit();
      });
    },
    /** Shows value at once, then call(); resolves true on success, false after reverting. */
    edit(row, field, value, call) {
      const k = `${row.id}:${field}`;
      const prior = edits.get(k);
      if (prior?.pending) return Promise.resolve(false);
      const cur = items?.find((r) => r.id === row.id) || row;
      // Fetches already out when an earlier edit settled still carry the value from before it.
      const e = { id: row.id, field, value, base: FIELDS[field].read(cur), pending: true, staleUntil: prior ? prior.settledAt : 0 };
      edits.set(k, e);
      write(row.id, field, value);
      emit();
      return new Promise((res) => res(call())).then(() => {
        if (edits.get(k) !== e) return true;
        e.pending = false;
        e.settledAt = started;
        if (landed === started) edits.delete(k);
        emit();
        return true;
      }, () => {
        if (edits.get(k) === e) {
          // An earlier success still guards against fetches that started before it and have not landed.
          if (prior && !prior.pending && prior.settledAt > landed) edits.set(k, prior);
          else edits.delete(k);
          write(e.id, field, e.base);
          emit();
        }
        return false;
      });
    },
  };
}
