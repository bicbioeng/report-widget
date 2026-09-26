/**
 * The floating "Report" button, mounted once in the dashboard shell so it is
 * on every authenticated page. Opens the report form; also opens on the
 * `kids:feedback:open` window event (the crash screen fires it with a prefill)
 * and on Alt+Shift+F.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Tooltip } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import FeedbackModal from './FeedbackModal';
import { ReportProvider } from './ReportProvider';

export const OPEN_EVENT = 'kids:feedback:open';

/** Open the widget from anywhere: openFeedback({ kind: 'bug', summary: '…' }). */
export function openFeedback(prefill) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: prefill || null }));
}

/**
 * config: optional — same shape as <ReportProvider config>. Use it where the
 * widget renders outside the provider (e.g. an error boundary's crash screen).
 */
export default function FeedbackWidget({ onOpenTicket, hideButton = false, config }) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [prefill, setPrefill] = useState(null);

  useEffect(() => {
    const onEvent = (e) => { setPrefill(e.detail || null); setOpen(true); };
    const onKey = (e) => {
      if (e.altKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener(OPEN_EVENT, onEvent);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener(OPEN_EVENT, onEvent); window.removeEventListener('keydown', onKey); };
  }, []);

  const handleOpenTicket = useCallback((key) => {
    if (!key) return; // transports without tickets (reads-graphql) have nothing to open
    if (onOpenTicket) onOpenTicket(key);
    else window.location.assign(`/browse/${key}`);
  }, [onOpenTicket]);

  const ui = (
    <>
      {!hideButton && (
        <div className="kids-feedback-root">
          <Tooltip title="Report a bug or share an idea (Alt+Shift+F)" placement="left">
            <button type="button" className="kids-feedback-fab" onClick={() => { setPrefill(null); setOpen(true); }} aria-label="Report a bug or share an idea">
              <MessageOutlined />
              <span className="kids-feedback-fab-label">Report</span>
            </button>
          </Tooltip>
        </div>
      )}
      <FeedbackModal
        open={open}
        hidden={hidden}
        setHidden={setHidden}
        prefill={prefill}
        onClose={() => { setOpen(false); setHidden(false); }}
        onOpenTicket={handleOpenTicket}
      />
    </>
  );
  return config ? <ReportProvider config={config}>{ui}</ReportProvider> : ui;
}
