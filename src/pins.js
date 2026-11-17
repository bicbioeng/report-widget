/**
 * Click-to-comment: the reporter clicks anywhere on the page, a numbered pin
 * drops there and they type a note. As many pins as they like; Esc or Done ends.
 *
 * Each pin is { n, note, point, scroll, element }: point is where they clicked
 * (viewport px), scroll the window scroll then, element describeElement's
 * output for what was under the click. The pins travel as context.pins and as a
 * "Pinned notes" list in the summary, so every consumer shows them as text
 * without a server change; the screenshot gets the numbered pins drawn on it.
 *
 * pinsText, pinSummaryLine and pinMarks are pure for node --test. The session
 * reuses startElementPick for each click; the note box and the page markers are
 * .kf-root, so they are never in a screenshot (the pins are drawn by drawPins).
 */
import { startElementPick, elementName } from './elementPicker.js';
import { loadImage } from './capture.js';

const NOTE_MAX = 2000;
const MARK = '#6B63D9';

/** '1. On button “Save”: the note' lines, one per pin. */
export function pinsText(pins) {
  return (pins || []).map((p) => `${p.n}. On ${elementName(p.element || { tag: 'page' })}: ${String(p.note || '').trim()}`).join('\n');
}

/**
 * The summary sent with pins: the reporter's own words, then the pinned notes.
 * With no words of their own, the notes are the summary.
 */
export function pinSummary(summary, pins) {
  const own = String(summary || '').trim();
  if (!pins?.length) return own;
  const list = pinsText(pins);
  return own ? `${own}\n\nPinned notes:\n${list}` : list;
}

/** What context.pins carries for each pin. See PAYLOAD.md. */
export function pinPayload(pins) {
  return (pins || []).map(({ n, note, point, scroll, element }) => ({ n, note, point, scroll, element: element || null }));
}

/**
 * Where to draw each pin on a quick screenshot of imageWidth x imageHeight of a
 * viewportWidth-wide page, scrolled to `scroll` now: the click point moved by
 * how far the page scrolled since, in image px. Pins off the image are left out.
 */
export function pinMarks(pins, { imageWidth, imageHeight, viewportWidth, scroll = { x: 0, y: 0 } }) {
  const k = viewportWidth > 0 ? imageWidth / viewportWidth : 1;
  return (pins || []).map((p) => ({
    n: p.n,
    x: Math.round((p.point.x + (p.scroll?.x || 0) - (scroll.x || 0)) * k),
    y: Math.round((p.point.y + (p.scroll?.y || 0) - (scroll.y || 0)) * k),
    r: Math.round(12 * k),
  })).filter((m) => m.x >= 0 && m.y >= 0 && m.x <= imageWidth && m.y <= imageHeight);
}

/** A copy of the shot with numbered pins on it; the shot itself when it can't be drawn. */
export async function drawPins(shot, pins, { viewportWidth = window.innerWidth, scroll = { x: window.scrollX, y: window.scrollY } } = {}) {
  const original = { blob: shot.blob, width: shot.width, height: shot.height };
  let img;
  try { img = typeof createImageBitmap === 'function' ? await createImageBitmap(shot.blob) : await loadImage(shot.blob); } catch { return original; }
  const w = img?.naturalWidth || img?.width;
  const h = img?.naturalHeight || img?.height;
  if (!w || !h) return original;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0);
  img.close?.();
  for (const m of pinMarks(pins, { imageWidth: w, imageHeight: h, viewportWidth, scroll })) {
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r + m.r / 6, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fillStyle = MARK;
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.round(m.r * 1.15)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(m.n), m.x, m.y + m.r / 12);
  }
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return blob ? { blob, width: w, height: h } : original;
}

/** Numbered dots on the page while pinning (page coordinates, so they scroll with it). */
function markerLayer(doc, win) {
  const layer = doc.createElement('div');
  layer.className = 'kf-root kf-pin-layer';
  doc.body.appendChild(layer);
  const dots = new Map();
  return {
    set(pins) {
      for (const [n, d] of dots) if (!pins.some((p) => p.n === n)) { d.remove(); dots.delete(n); }
      for (const p of pins) {
        let d = dots.get(p.n);
        if (!d) { d = doc.createElement('div'); d.className = 'kf-pin-dot'; layer.appendChild(d); dots.set(p.n, d); }
        d.textContent = String(p.n);
        d.style.left = `${p.point.x + p.scroll.x}px`;
        d.style.top = `${p.point.y + p.scroll.y}px`;
        d.title = p.note;
      }
    },
    remove() { layer.remove(); },
    win,
  };
}

/**
 * The note box for one pin, next to the click. Resolves the note, or null on
 * Esc / Skip / an empty Save. A transparent backdrop takes every other click,
 * so the page underneath is never clicked by accident.
 */
export function askNote({ n, label, at, doc = document, win = window, signal }) {
  return new Promise((resolve) => {
    const root = doc.createElement('div');
    root.className = 'kf-root kf-note-layer';
    const box = doc.createElement('div');
    box.className = 'kf-note';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', `Note for pin ${n}`);
    const head = doc.createElement('div');
    head.className = 'kf-note-head';
    head.textContent = `${n} · ${label}`;
    const ta = doc.createElement('textarea');
    ta.rows = 3;
    ta.maxLength = NOTE_MAX;
    ta.placeholder = 'What is wrong or what should change here?';
    ta.setAttribute('aria-label', 'Note');
    const row = doc.createElement('div');
    row.className = 'kf-note-row';
    const hint = doc.createElement('span');
    hint.textContent = 'Enter to pin · Esc to skip';
    const skip = doc.createElement('button');
    skip.type = 'button';
    skip.className = 'kf-note-skip';
    skip.textContent = 'Skip';
    const save = doc.createElement('button');
    save.type = 'button';
    save.className = 'kf-note-save';
    save.textContent = 'Pin note';
    row.append(hint, skip, save);
    box.append(head, ta, row);
    root.appendChild(box);
    doc.body.appendChild(root);
    // Beside the click, kept on screen.
    const vw = win.innerWidth || 1024;
    const vh = win.innerHeight || 768;
    const bw = Math.min(320, vw - 16);
    box.style.width = `${bw}px`;
    box.style.left = `${Math.max(8, Math.min(at.x + 16, vw - bw - 8))}px`;
    box.style.top = `${Math.max(8, Math.min(at.y + 16, vh - 170))}px`;
    setTimeout(() => ta.focus(), 0);

    let finish;
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.(); finish(null); }
      else if (e.key === 'Enter' && !e.shiftKey && doc.activeElement === ta) { e.preventDefault(); e.stopPropagation(); finish(ta.value); }
    };
    const onAbort = () => finish(null);
    win.addEventListener('keydown', onKey, true);
    signal?.addEventListener?.('abort', onAbort);
    root.addEventListener('click', (e) => { if (e.target === root) finish(ta.value); });
    skip.addEventListener('click', () => finish(null));
    save.addEventListener('click', () => finish(ta.value));
    finish = (value) => {
      win.removeEventListener('keydown', onKey, true);
      signal?.removeEventListener?.('abort', onAbort);
      root.remove();
      finish = () => {};
      const note = String(value || '').trim();
      resolve(note || null);
    };
    if (signal?.aborted) finish(null);
  });
}

/**
 * Pin notes until the reporter presses Esc or Done. Starts from `pins` (so a
 * second session adds to the first) and resolves the whole list.
 */
export async function pinSession({ pins = [], signal, doc = document, win = window } = {}) {
  const list = [...pins];
  const marks = markerLayer(doc, win);
  marks.set(list);
  try {
    for (;;) {
      const next = (list.reduce((m, p) => Math.max(m, p.n), 0)) + 1;
      const touch = Boolean(win.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches);
      const hint = `${touch ? 'Tap' : 'Click'} where your note goes${list.length ? ` · ${list.length} pinned` : ''}${touch ? '' : ' · Esc when done'}`;
      const picked = await startElementPick({ signal, doc, win, hint, cancelText: 'Done' });
      if (!picked || signal?.aborted) break;
      const at = picked.point || { x: picked.description.rect.x, y: picked.description.rect.y };
      const scroll = { x: win.scrollX || 0, y: win.scrollY || 0 };
      const draft = { n: next, note: '', point: at, scroll, element: picked.description };
      marks.set([...list, draft]);
      const note = await askNote({ n: next, label: elementName(picked.description), at, doc, win, signal });
      if (signal?.aborted) break;
      if (note) list.push({ ...draft, note });
      marks.set(list);
    }
  } finally {
    marks.remove();
  }
  return list;
}
