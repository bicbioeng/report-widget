/**
 * Pick one page element for a report.
 *
 * The dialog hides, a light layer goes over the page and the reporter clicks or
 * taps an element. The report then carries a description of it
 * (context.element) and a fresh quick screenshot with it outlined.
 *
 * The describe/target/label/rect helpers are pure: `getRect` is injectable and
 * they only read tagName, attributes, parentElement, children, text and
 * outerHTML, so node --test can drive them with plain objects. The pick session
 * takes `doc`/`win` for the same reason, and shotAfterPick its capture and
 * outline steps. drawOutline is the one canvas step.
 */
import { excludedFromCapture, loadImage } from './capture.js';

const MAX_CLASSES = 8;
const MAX_TEXT = 200;
const MAX_HTML = 2000;
const MAX_DEPTH = 5;
const CHIP_TEXT = 40;
// Form fields: what the reporter typed never leaves the page.
const FORM_TAGS = new Set(['input', 'textarea', 'select', 'option']);
// Attribute names that look like they hold a secret.
const SECRET_ATTR = /token|passw(or)?d|pwd|secret|api[-_]?key|auth|session|csrf|xsrf|cookie|credential/i;

const tagOf = (el) => String(el?.tagName || '').toLowerCase();
const attr = (el, name) => {
  const v = el?.getAttribute?.(name);
  return v == null || v === '' ? null : String(v);
};
const collapse = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const clip = (s, max) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
const escapeIdent = (s) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(s) : String(s).replace(/[^\w-]/g, (c) => `\\${c}`));

export function classesOf(el) {
  // SVG elements have an SVGAnimatedString className, so read the attribute.
  return String(attr(el, 'class') || '').split(/\s+/).filter(Boolean);
}

function segment(el) {
  if (el.id) return `#${escapeIdent(el.id)}`;
  const tag = tagOf(el);
  const cls = classesOf(el).slice(0, 2).map((c) => `.${escapeIdent(c)}`).join('');
  const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => c.tagName === el.tagName) : [];
  const nth = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(el) + 1})` : '';
  return `${tag}${cls}${nth}`;
}

/** A short CSS path: the element and up to 5 ancestors, stopping at an id and before body. */
export function selectorFor(el) {
  const parts = [];
  for (let n = el, depth = 0; n && depth <= MAX_DEPTH; n = n.parentElement, depth += 1) {
    if (/^(html|body)$/.test(tagOf(n))) break;
    parts.unshift(segment(n));
    if (n.id) break;
  }
  return parts.join(' > ');
}

/**
 * outerHTML with form values, textarea contents and secret-looking attributes
 * removed, clipped to 2000 chars. Works on the serialised string, where every
 * attribute value is double-quoted.
 */
export function safeHtml(html) {
  let s = String(html || '').slice(0, MAX_HTML * 4);
  s = s.replace(/<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g, (m, tag, attrs, slash) => {
    const form = FORM_TAGS.has(tag.toLowerCase());
    const kept = (attrs.match(/[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g) || []).filter((a) => {
      const name = a.split('=')[0].trim().toLowerCase();
      if (SECRET_ATTR.test(name)) return false;
      return !(form && (name === 'value' || name === 'selected' || name === 'checked'));
    });
    return `<${tag}${kept.map((a) => ` ${a}`).join('')}${slash ? ' /' : ''}>`;
  });
  s = s.replace(/(<textarea\b[^>]*>)[\s\S]*?(?:<\/textarea>|$)/gi, '$1</textarea>');
  s = s.replace(/<[^>]*$/, ''); // a tag cut by the first clip
  return s.length > MAX_HTML ? `${s.slice(0, MAX_HTML - 1)}…` : s;
}

export function roundRect(r) {
  return {
    x: Math.round(r?.x ?? r?.left ?? 0),
    y: Math.round(r?.y ?? r?.top ?? 0),
    width: Math.round(r?.width ?? 0),
    height: Math.round(r?.height ?? 0),
  };
}

/** What context.element carries for a picked element. See PAYLOAD.md. */
export function describeElement(el, { getRect = (e) => e.getBoundingClientRect() } = {}) {
  const tag = tagOf(el);
  const text = FORM_TAGS.has(tag) ? '' : collapse(el.innerText ?? el.textContent).slice(0, MAX_TEXT);
  return {
    tag,
    id: el.id || null,
    classes: classesOf(el).slice(0, MAX_CLASSES),
    selector: selectorFor(el),
    text: text || null,
    ariaLabel: attr(el, 'aria-label'),
    role: attr(el, 'role'),
    href: typeof el.href === 'string' && el.href ? el.href : attr(el, 'href'),
    alt: attr(el, 'alt'),
    rect: roundRect(getRect(el)),
    html: safeHtml(el.outerHTML),
  };
}

/** The pickable element for an event target, or null for the widget's own UI and html/body. */
export function pickTarget(node) {
  let el = node;
  while (el && el.nodeType !== 1) el = el.parentElement || el.parentNode || null;
  if (!el || /^(html|body)$/.test(tagOf(el))) return null;
  return excludedFromCapture(el) ? null : el;
}

const nameOf = (d) => clip(collapse(d.text || d.ariaLabel || d.alt || ''), CHIP_TEXT);

/** '<tag> “text”', falling back to aria-label, alt, then the tag alone. */
export function elementName(d) {
  const name = nameOf(d);
  return name ? `${d.tag} “${name}”` : d.tag;
}

/** The 'What gets included' line: '<selector> “text”', or the selector alone. */
export function pickSummary(d) {
  const name = nameOf(d);
  return name ? `${d.selector} “${name}”` : d.selector;
}

/** The chip text: 'Element: a “Docs”'. */
export function chipLabel(d) {
  return `Element: ${elementName(d)}`;
}

/**
 * The picked rect (CSS px, viewport-relative) on a quick screenshot of
 * imageWidth x imageHeight taken of a viewportWidth-wide viewport, clamped to
 * the image. null when nothing of it is on the image.
 */
export function outlineRect(rect, { imageWidth, imageHeight, viewportWidth }) {
  const k = viewportWidth > 0 ? imageWidth / viewportWidth : 1;
  const clamp = (v, max) => Math.min(max, Math.max(0, Math.round(v)));
  const x = clamp(rect.x * k, imageWidth);
  const y = clamp(rect.y * k, imageHeight);
  const width = clamp((rect.x + rect.width) * k, imageWidth) - x;
  const height = clamp((rect.y + rect.height) * k, imageHeight) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}

// How long decoding the shot, or canvas.toBlob, may take before drawOutline gives up.
const OUTLINE_WAIT_MS = 1000;
// How long the dialog stays hidden after a pick waiting for the outlined shot.
export const PICK_SHOT_WAIT_MS = 1200;

/** `promise`, or `fallback` once `ms` pass first. Never rejects: a rejection also gives `fallback`. */
function within(promise, ms, fallback = null) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(t); resolve(v); },
      () => { clearTimeout(t); resolve(fallback); },
    );
  });
}

/**
 * A copy of a quick screenshot with the picked element outlined: 3 CSS px of
 * #6B63D9 with a 1px white halo, so it shows on light and dark pages.
 * Resolves { blob, width, height }: the shot itself, un-outlined, when it
 * cannot be decoded or drawn (no canvas context, toBlob gives nothing or never
 * calls back) instead of throwing or staying pending.
 */
export async function drawOutline(shot, rect, viewportWidth = window.innerWidth, { waitMs = OUTLINE_WAIT_MS } = {}) {
  const original = { blob: shot.blob, width: shot.width, height: shot.height };
  let img;
  try {
    img = await within(typeof createImageBitmap === 'function' ? createImageBitmap(shot.blob) : loadImage(shot.blob), waitMs);
  } catch {
    img = null;
  }
  const w = img?.naturalWidth || img?.width;
  const h = img?.naturalHeight || img?.height;
  if (!w || !h) return original;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) { img.close?.(); return original; }
  ctx.drawImage(img, 0, 0);
  img.close?.();
  const r = outlineRect(rect, { imageWidth: canvas.width, imageHeight: canvas.height, viewportWidth });
  if (r) {
    const k = viewportWidth > 0 ? canvas.width / viewportWidth : 1;
    const lw = 3 * k;
    // Just outside the element, pulled in at the image edges so the stroke stays whole.
    const x0 = Math.max(lw / 2 + k, r.x - lw / 2);
    const y0 = Math.max(lw / 2 + k, r.y - lw / 2);
    const x1 = Math.min(canvas.width - lw / 2 - k, r.x + r.width + lw / 2);
    const y1 = Math.min(canvas.height - lw / 2 - k, r.y + r.height + lw / 2);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = lw + 2 * k;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = '#6B63D9';
    ctx.lineWidth = lw;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  }
  const blob = await within(new Promise((resolve) => canvas.toBlob(resolve, 'image/png')), waitMs);
  return blob ? { blob, width: canvas.width, height: canvas.height } : original;
}

/**
 * The step after a pick: retake the quick screenshot (`capture`) and outline
 * the picked `rect` on it (`outline`). Resolves once the outlined shot is ready,
 * `waitMs` pass or `signal` aborts, whichever is first, with
 * { produced, shot, error, late }. `shot` is the outlined shot when it was ready
 * in time. `late` resolves { shot, error } whenever the shot settles, with a
 * null shot if `signal` aborted first, so the caller can still apply a shot that
 * arrives after the limit. Never rejects: a capture or outline failure is
 * reported as `error`.
 */
export function shotAfterPick({
  capture, outline = drawOutline, rect, viewportWidth, signal, waitMs = PICK_SHOT_WAIT_MS,
}) {
  const late = (async () => {
    const r = await capture();
    if (!r?.blob) return null;
    const outlined = await outline(r, rect, viewportWidth);
    return outlined?.blob ? { ...r, ...outlined } : r;
  })().then(
    (shot) => ({ shot: signal?.aborted ? null : shot, error: null }),
    (error) => ({ shot: null, error: signal?.aborted ? null : error }),
  );
  return new Promise((resolve) => {
    const done = (res) => {
      clearTimeout(t);
      signal?.removeEventListener?.('abort', onAbort);
      resolve({ produced: Boolean(res?.shot), shot: res?.shot || null, error: res?.error || null, late });
    };
    const onAbort = () => done(null);
    const t = setTimeout(() => done(null), waitMs);
    signal?.addEventListener?.('abort', onAbort);
    if (signal?.aborted) done(null);
    else late.then(done);
  });
}

const overlaps = (a, b) => a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const isWithin = (node, ancestor) => {
  for (let n = node; n; n = n.parentElement || n.parentNode) if (n === ancestor) return true;
  return false;
};

/**
 * The iframe under (x, y) when `under` (the event target) contains it. While
 * picking, iframes have pointer-events:none, so a press over one lands on its
 * container in this document instead of on the frame's own page, and the frame
 * itself is what gets picked. The last match in document order wins (nested
 * or later frames paint on top).
 */
export function frameAt(doc, x, y, under, getRect = (e) => e.getBoundingClientRect()) {
  if (typeof x !== 'number' || typeof y !== 'number' || !under) return null;
  let hit = null;
  for (const f of doc.querySelectorAll?.('iframe, frame') || []) {
    if (f === under || !isWithin(f, under)) continue;
    const r = getRect(f);
    if (x >= r.left && x < r.right && y >= r.top && y < r.bottom) hit = f;
  }
  return hit;
}

// antd/rc-util scroll locks: one <style rc-util-key="rc-util-locker-…"> per open Modal/Drawer.
const LOCKS = 'style[rc-util-key^="rc-util-locker-"]';

/** The keys of the rc-util scroll locks on the page now. */
export function scrollLockKeys(doc = typeof document !== 'undefined' ? document : null) {
  return [...(doc?.querySelectorAll?.(LOCKS) || [])].map((n) => n.getAttribute('rc-util-key'));
}

/**
 * Switch off the scroll locks with these keys (and only these), so the page
 * scrolls while picking. Resolves a function that switches them back on.
 * Other locks, such as a host Modal open behind the Report dialog, stay on.
 */
export function suspendScrollLocks(keys, doc = document) {
  const off = [...(doc.querySelectorAll?.(LOCKS) || [])]
    .filter((n) => keys.includes(n.getAttribute('rc-util-key')))
    .map((n) => {
      const media = n.getAttribute('media');
      n.setAttribute('media', 'not all');
      return [n, media];
    });
  return () => {
    for (const [n, media] of off) {
      if (media == null) n.removeAttribute('media');
      else n.setAttribute('media', media);
    }
  };
}

/**
 * Let the reporter pick one element. Resolves { element, description }, or
 * null on Esc, the banner's Cancel or `signal` aborting. Every listener is on
 * `win` in the capture phase, so it runs before the host's own handlers, and
 * the pointerdown/click on the page is swallowed: a link does not navigate and a
 * host mask does not close. The layer carries kf-root, so it is never in a
 * screenshot and pickTarget ignores it, as it does the launcher. An iframe
 * (same- or cross-origin) is picked as the iframe element; see frameAt.
 */
export function startElementPick({
  onHover, signal, doc = document, win = window, getRect = (e) => e.getBoundingClientRect(),
} = {}) {
  return new Promise((resolve) => {
    const make = (tag, className) => {
      const n = doc.createElement(tag);
      n.className = className;
      return n;
    };
    const layer = make('div', 'kf-root kf-picker');
    const box = make('div', 'kf-picker-box');
    const label = make('div', 'kf-picker-label');
    const banner = make('div', 'kf-picker-banner');
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    const hint = make('span', 'kf-picker-hint');
    const touch = Boolean(win.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches);
    hint.textContent = touch ? 'Tap an element to attach it' : 'Click an element to attach it · Esc to cancel';
    const cancel = make('button', 'kf-picker-cancel');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    banner.appendChild(hint);
    banner.appendChild(cancel);
    // Events inside a frame never reach this window: let presses fall through
    // to the frame's container, so the frame is picked and its page untouched.
    const frames = make('style', '');
    frames.textContent = 'iframe, frame { pointer-events: none !important; }';
    layer.appendChild(frames);
    layer.appendChild(box);
    layer.appendChild(label);
    layer.appendChild(banner);
    doc.body.appendChild(layer);

    let hovered = null;
    let bannerTop = banner.getBoundingClientRect?.() || null;

    const place = () => {
      if (!hovered) {
        box.style.display = 'none';
        label.style.display = 'none';
        return;
      }
      const r = getRect(hovered);
      Object.assign(box.style, {
        display: 'block', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`,
      });
      label.textContent = elementName({
        tag: tagOf(hovered),
        text: FORM_TAGS.has(tagOf(hovered)) ? null : collapse(hovered.textContent).slice(0, 80),
        ariaLabel: attr(hovered, 'aria-label'),
        alt: attr(hovered, 'alt'),
      });
      label.style.display = 'block';
      const lh = label.offsetHeight || 22;
      const lw = label.offsetWidth || 0;
      const vw = win.innerWidth || 0;
      const vh = win.innerHeight || 0;
      const above = r.top - lh - 4;
      const top = above >= 4 ? above : Math.min(r.bottom + 4, Math.max(4, vh - lh - 4));
      label.style.top = `${top}px`;
      label.style.left = `${Math.max(4, Math.min(r.left, vw - lw - 4))}px`;
      banner.className = `kf-picker-banner${overlaps(r, bannerTop) ? ' bottom' : ''}`;
    };

    const swallow = (e) => {
      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();
    };

    let finish;
    const targetOf = (e) => pickTarget(frameAt(doc, e.clientX, e.clientY, e.target, getRect) || e.target);
    const onMove = (e) => {
      const el = targetOf(e);
      if (el === hovered) return;
      hovered = el;
      place();
      if (el) onHover?.(el);
    };
    const onPress = (e) => {
      if (isWithin(e.target, cancel)) return; // let the Cancel button take the press
      swallow(e);
      if (e.type === 'pointerdown') onMove(e); // a tap has no hover first
    };
    const onClick = (e) => {
      swallow(e);
      if (isWithin(e.target, cancel)) { finish(null); return; }
      const el = targetOf(e);
      if (el) finish({ element: el, description: describeElement(el, { getRect }) });
    };
    const onKey = (e) => {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      swallow(e); // the hidden Report dialog must not close too
      finish(null);
    };
    const onViewport = () => {
      if (hovered) {
        banner.className = 'kf-picker-banner';
        bannerTop = banner.getBoundingClientRect?.() || null;
      }
      place();
    };
    const onAbort = () => finish(null);

    const listeners = [
      ['pointermove', onMove],
      ['pointerdown', onPress],
      ['pointerup', onPress],
      ['mousedown', onPress],
      ['mouseup', onPress],
      ['click', onClick],
      ['dblclick', onPress],
      ['keydown', onKey],
      ['scroll', onViewport],
      ['resize', onViewport],
    ];
    for (const [type, fn] of listeners) win.addEventListener(type, fn, true);
    signal?.addEventListener?.('abort', onAbort);

    finish = (result) => {
      for (const [type, fn] of listeners) win.removeEventListener(type, fn, true);
      signal?.removeEventListener?.('abort', onAbort);
      layer.parentNode?.removeChild(layer);
      finish = () => {};
      resolve(result);
    };
    if (signal?.aborted) finish(null);
  });
}
