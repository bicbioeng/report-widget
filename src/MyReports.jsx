import React, { useEffect, useRef, useState } from 'react';
import { Empty, Skeleton, Typography, Button, Select } from 'antd';
import { useReportConfig } from './ReportProvider';
import { STATE_LABELS, KIND_LABELS, assigneeOf, assigneeLabel, assigneeMemberId, projectOf, filterOptions, filterReports, editCapability, createReportStore, NO_FILTERS } from './reportFilters';

export { STATE_LABELS, KIND_LABELS };

const { Text } = Typography;

export const STATE_COLORS = { new: 'blue', acknowledged: 'geekblue', in_progress: 'gold', testing: 'cyan', done: 'green', dismissed: 'default' };

const FILL = { in_progress: 0.5, testing: 0.75 };
const C = 2 * Math.PI * 3;

// Linear-style status glyph: dashed = new, ring = acknowledged, pie fills with progress, check = done.
export function StatusIcon({ state }) {
  const done = state === 'done';
  return (
    <svg className={`kf-st kf-st--${state}`} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill={done ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeDasharray={state === 'new' ? '2.2 1.9' : undefined} />
      {FILL[state] && <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray={`${FILL[state] * C} ${C}`} transform="rotate(-90 8 8)" />}
      {done && <path d="M5 8.2l2 2 4-4.2" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
      {state === 'dismissed' && <path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  );
}

export const StatusLabel = ({ state }) => (
  <span className="kf-status"><StatusIcon state={state} /><span className={`kf-st-label kf-st--${state}`}>{STATE_LABELS[state] || state}</span></span>
);

export function relTime(iso) {
  const d = new Date(iso);
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return d.toLocaleDateString();
}

const STATUS_OPTIONS = Object.keys(STATE_LABELS).map((st) => ({ value: st, label: <StatusLabel state={st} /> }));
const UNASSIGN = '__unassigned';

// Popups stay in antd's body portal (no getPopupContainer): the row's hover transform would clip them.
const small = { size: 'small', popupMatchSelectWidth: false };

export default function MyReports({ onOpenTicket, refreshKey, canEdit, members }) {
  const { transport, myReports } = useReportConfig();
  const [, rerender] = useState(0);
  const store = useRef(null);
  if (!store.current) store.current = createReportStore(() => rerender((n) => n + 1));
  const [filters, setFilters] = useState(NO_FILTERS);
  const statusFilter = useRef(null);
  useEffect(() => { store.current.load(() => transport.fetchMyFeedback()); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = store.current.items;
  if (items === null) return <Skeleton active paragraph={{ rows: 3 }} />;
  if (!items.length) return <Empty description="You have not reported anything yet." image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  const team = members ?? myReports?.members;
  const can = editCapability({ canEdit: canEdit ?? myReports?.canEdit, members: team, transport });
  const options = filterOptions(items, filters);
  const rows = filterReports(items, filters);
  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  const clearFilters = () => { setFilters(NO_FILTERS); statusFilter.current?.focus(); };

  // Optimistic: the store shows the change at once and reverts if the transport rejects
  // (it surfaces its own error).
  const busy = (r, field) => store.current.isBusy(r.id, field);
  const setStatus = (r, state) => store.current.edit(r, 'status', state, () => transport.updateFeedbackState(r.id, state));
  const setAssignee = (r, value) => {
    const m = value === UNASSIGN ? null : team.find((x) => x.id === value);
    const next = m ? { id: m.id, name: m.name } : null;
    store.current.edit(r, 'assignee', { assignee: next, ticket: next }, () => transport.updateTicketAssignee(r.ticketKey, m ? m.id : null));
  };
  const assigneeValue = (r) => {
    const a = assigneeOf(r);
    const id = assigneeMemberId(a, team);
    if (id === null) return UNASSIGN;
    return id !== undefined ? id : `name:${a.name}`;
  };
  const assigneeOptions = (r) => {
    const v = assigneeValue(r);
    const list = [{ value: UNASSIGN, label: 'Unassigned' }, ...team.map((m) => ({ value: m.id, label: m.name }))];
    // Someone outside the member list keeps their name in the control.
    return typeof v === 'string' && v.startsWith('name:') ? [...list, { value: v, label: v.slice(5), disabled: true }] : list;
  };

  return (
    <div>
      <div className="kf-reports-filters">
        <Select {...small} ref={statusFilter} allowClear placeholder="All statuses" aria-label="Filter by status"
          value={filters.status} onChange={setFilter('status')}
          options={options.status.map((o) => ({ value: o.value, label: <StatusLabel state={o.value} /> }))} />
        <Select {...small} allowClear placeholder="All projects" aria-label="Filter by project"
          value={filters.project} onChange={setFilter('project')} options={options.project} />
        <Select {...small} allowClear placeholder="All assignees" aria-label="Filter by assignee"
          value={filters.assignee} onChange={setFilter('assignee')} options={options.assignee} />
        {(options.kind.length > 1 || filters.kind) && (
          <Select {...small} allowClear placeholder="All kinds" aria-label="Filter by kind"
            value={filters.kind} onChange={setFilter('kind')} options={options.kind} />
        )}
      </div>
      {!rows.length && (
        <Empty description="No reports match" image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <Button type="link" onClick={clearFilters}>Clear filters</Button>
        </Empty>
      )}
      {rows.map((r) => {
        const editAssignee = can.assignee && !!r.ticketKey;
        const editing = can.status || editAssignee;
        const project = projectOf(r);
        return (
          <div className={`kf-report${editing ? ' kf-report--edit' : ''}`} key={r.id}>
            <StatusIcon state={r.triageState} />
            <div style={{ minWidth: 0 }}>
              <div className="t" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ticket?.title || r.summary}</div>
              <div className="s">
                <span className="kf-report-meta"><span className={`kf-st-label kf-st--${r.triageState}`}>{STATE_LABELS[r.triageState] || r.triageState}</span> · {KIND_LABELS[r.kind] || r.kind}{project ? ` · ${project}` : ''} · {relTime(r.createdAt)}{r.route ? ` · ${r.route}` : ''}</span>
                <span className="kf-report-who">{` · ${assigneeLabel(r)}`}</span>
              </div>
            </div>
            {(editing || r.ticketKey) && (
              <div className="kf-report-end">
                {editing && (
                  <div className="kf-report-edit">
                    {can.status && (
                      <Select {...small} className="kf-report-status" aria-label="Status" value={r.triageState}
                        options={STATUS_OPTIONS} onChange={(v) => setStatus(r, v)}
                        disabled={busy(r, 'status')} loading={busy(r, 'status')} />
                    )}
                    {editAssignee && (
                      <Select {...small} className="kf-report-assignee" aria-label="Assignee" value={assigneeValue(r)}
                        options={assigneeOptions(r)} onChange={(v) => setAssignee(r, v)} showSearch optionFilterProp="label"
                        disabled={busy(r, 'assignee')} loading={busy(r, 'assignee')} />
                    )}
                  </div>
                )}
                {r.ticketKey && <Button size="small" type="link" onClick={() => onOpenTicket?.(r.ticketKey)}>{r.ticketKey}</Button>}
              </div>
            )}
          </div>
        );
      })}
      <Text type="secondary" style={{ fontSize: 12 }}>You are notified when a report changes state or gets a reply.</Text>
    </div>
  );
}
