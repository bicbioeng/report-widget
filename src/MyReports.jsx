import React, { useEffect, useState } from 'react';
import { Empty, Skeleton, Typography, Button } from 'antd';
import { useReportConfig } from './ReportProvider';

const { Text } = Typography;

export const STATE_COLORS = { new: 'blue', acknowledged: 'geekblue', in_progress: 'gold', testing: 'cyan', done: 'green', dismissed: 'default' };
export const STATE_LABELS = { new: 'New', acknowledged: 'Acknowledged', in_progress: 'In progress', testing: 'Testing', done: 'Done', dismissed: 'Dismissed' };
export const KIND_LABELS = { bug: 'Bug', idea: 'Idea', question: 'Question', 'report-tool': 'Report tool' };

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

export default function MyReports({ onOpenTicket, refreshKey }) {
  const { transport } = useReportConfig();
  const [items, setItems] = useState(null);
  useEffect(() => {
    let alive = true;
    transport.fetchMyFeedback().then((r) => { if (alive) setItems(r.items || []); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (items === null) return <Skeleton active paragraph={{ rows: 3 }} />;
  if (!items.length) return <Empty description="You have not reported anything yet." image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  return (
    <div>
      {items.map((r) => (
        <div className="kf-report" key={r.id}>
          <StatusIcon state={r.triageState} />
          <div style={{ minWidth: 0 }}>
            <div className="t" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ticket?.title || r.summary}</div>
            <div className="s"><span className={`kf-st-label kf-st--${r.triageState}`}>{STATE_LABELS[r.triageState] || r.triageState}</span> · {KIND_LABELS[r.kind] || r.kind} · {relTime(r.createdAt)}{r.route ? ` · ${r.route}` : ''}</div>
          </div>
          {r.ticketKey && <Button size="small" type="link" onClick={() => onOpenTicket?.(r.ticketKey)}>{r.ticketKey}</Button>}
        </div>
      ))}
      <Text type="secondary" style={{ fontSize: 12 }}>You are notified when a report changes state or gets a reply.</Text>
    </div>
  );
}
