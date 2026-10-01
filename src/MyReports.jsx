import React, { useEffect, useState } from 'react';
import { Empty, Skeleton, Tag, Typography, Button } from 'antd';
import { useReportConfig } from './ReportProvider';

const { Text } = Typography;

export const STATE_COLORS = { new: 'blue', acknowledged: 'geekblue', in_progress: 'gold', testing: 'cyan', done: 'green', dismissed: 'default' };
export const STATE_LABELS = { new: 'New', acknowledged: 'Acknowledged', in_progress: 'In progress', testing: 'Testing', done: 'Done', dismissed: 'Dismissed' };
export const KIND_LABELS = { bug: 'Bug', idea: 'Idea', question: 'Question', 'report-tool': 'Report tool' };

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
          <Tag color={STATE_COLORS[r.triageState] || 'default'} style={{ margin: 0 }}>{STATE_LABELS[r.triageState] || r.triageState}</Tag>
          <div style={{ minWidth: 0 }}>
            <div className="t" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ticket?.title || r.summary}</div>
            <div className="s">{KIND_LABELS[r.kind] || r.kind} · {relTime(r.createdAt)}{r.route ? ` · ${r.route}` : ''}</div>
          </div>
          {r.ticketKey && <Button size="small" type="link" onClick={() => onOpenTicket?.(r.ticketKey)}>{r.ticketKey}</Button>}
        </div>
      ))}
      <Text type="secondary" style={{ fontSize: 12 }}>You are notified when a report changes state or gets a reply.</Text>
    </div>
  );
}
