/**
 * The floating "Report" button, mounted once in the dashboard shell so it is
 * on every authenticated page. Opens the report form; also opens on the
 * `kids:feedback:open` window event (the crash screen fires it with a prefill)
 * and on Alt+Shift+F.
 *
 * Layering (see styles.css): the FAB is portaled to <body> at z-index 1150, so
 * it sits above antd Modals/Drawers (1000, nested 1100) and their masks, and
 * below the report modal (1160) and the annotator (1170). A click on it never
 * reaches a host overlay's mask, so maskClosable overlays stay open.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import FeedbackModal from './FeedbackModal';
import { ReportProvider } from './ReportProvider';

export const OPEN_EVENT = 'kids:feedback:open';

/** Open the widget from anywhere: openFeedback({ kind: 'bug', summary: '…' }). */
export function openFeedback(prefill) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: prefill || null }));
}

const GAP = 22;
// Host overlay panels the FAB must not sit on. Our own modals are excluded.
const PANELS = '.ant-drawer-content-wrapper, .ant-modal-wrap:not(.kids-feedback-modal-wrap):not(.kids-feedback-annotator-wrap) .ant-modal-content';

/**
 * Now that the FAB is above antd overlays it could cover their footers (the
 * 1150 regression: it hid a right-side drawer's Send button). Auto-offset,
 * rather than a draggable or collapsible FAB: it needs no extra gesture from
 * the reporter, the button stays where they expect when nothing is open, and
 * it moves onto the mask (dead space) instead of over controls. When the
 * corner overlaps an open panel, move the FAB left of the panel; if the panel
 * is too wide for that, lift it above the panel.
 * ponytail: a full-screen panel leaves no free corner, so the FAB stays put there.
 */
function useAvoidOverlays(ref) {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      let right = GAP;
      let bottom = GAP;
      const panels = Array.from(document.querySelectorAll(PANELS))
        .map((p) => p.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0);
      for (let i = 0; i < panels.length; i += 1) {
        const left = vw - right - w;
        const top = vh - bottom - h;
        const hit = panels.find((r) => r.left < left + w && r.right > left && r.top < top + h && r.bottom > top);
        if (!hit) break;
        if (vw - hit.left + GAP + w <= vw - 8) right = vw - hit.left + GAP;
        else if (vh - hit.top + GAP + h <= vh - 8) bottom = vh - hit.top + GAP;
        else break;
      }
      setPos((p) => (p && p.right === right && p.bottom === bottom ? p : { right, bottom }));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    // Drawers and modals are portaled into <body>; open/close and their
    // enter/leave animations all show up as child or class mutations.
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    schedule();
    return () => {
      mo.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      cancelAnimationFrame(frame);
    };
  }, [ref]);
  return pos;
}

// Belt and braces: even if the host renders the widget inside an antd overlay,
// React would bubble these through the portal to that overlay's handlers.
const stop = (e) => e.stopPropagation();

/**
 * config: optional — same shape as <ReportProvider config>. Use it where the
 * widget renders outside the provider (e.g. an error boundary's crash screen).
 */
export default function FeedbackWidget({ onOpenTicket, hideButton = false, config }) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef(null);
  const pos = useAvoidOverlays(rootRef);

  // Portal only after mount: the server (and the hydration pass) render the FAB inline.
  useEffect(() => { setMounted(true); }, []);

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

  const fab = !hideButton && (
    <div
      ref={rootRef}
      className="kids-feedback-root"
      style={pos || undefined}
      onPointerDown={stop}
      onMouseDown={stop}
      onMouseUp={stop}
      onClick={stop}
    >
      <Tooltip title="Report a bug or share an idea (Alt+Shift+F)" placement="left">
        <button type="button" className="kids-feedback-fab" onClick={() => { setPrefill(null); setOpen(true); }} aria-label="Report a bug or share an idea">
          <MessageOutlined />
          <span className="kids-feedback-fab-label">Report</span>
        </button>
      </Tooltip>
    </div>
  );

  const ui = (
    <>
      {fab && mounted ? createPortal(fab, document.body) : fab}
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
