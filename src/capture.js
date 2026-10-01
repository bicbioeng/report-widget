/**
 * Screenshots for a report.
 *
 * Two methods, used in this order:
 *   quick   — @zumer/snapdom renders the DOM to an image with no permission
 *             prompt. Instant, and correct for Tailwind v4 colours because the
 *             browser paints the CSS itself. Canvases and iframes come out
 *             blank, which is fine for a first look.
 *   exact   — getDisplayMedia with preferCurrentTab captures the real pixels
 *             (Sentry's approach). One permission picker; desktop only.
 *
 * Both resolve { blob, width, height, method }. The widget hides itself before
 * calling either so it is not in the picture.
 */

const WIDGET_SELECTORS = ['.kids-feedback-root', '.kids-feedback-modal-wrap', '.kids-feedback-pill'];

export function supportsExactCapture() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia) && window.isSecureContext;
}

/**
 * The rect of the body's content relative to the viewport. When the document
 * scrolls, the offsets are 0 and this is the body box itself. When the body is
 * its own scroller (body, html { height: 100% }), its box stays put and its
 * content starts scrollLeft/scrollTop before it, scrollWidth x scrollHeight in
 * size. No DOM access.
 */
export function scrollerFrame({ bodyRect, scrollLeft = 0, scrollTop = 0, scrollWidth = 0, scrollHeight = 0 }) {
  return {
    left: bodyRect.left - scrollLeft,
    top: bodyRect.top - scrollTop,
    width: Math.max(bodyRect.width, scrollWidth),
    height: Math.max(bodyRect.height, scrollHeight),
  };
}

/**
 * snapdom's image starts at the content's top-left, so when that corner is
 * inside the viewport (the body's default 8px margin at scroll 0) the strip
 * above or left of it is not in the image, nor is a fixed header pinned over
 * it. `pad` is that gap: the clone is moved down/right by it, so the image
 * starts at the viewport edge, and `frame` is where the image then starts. The
 * size stays the content's, so the clamp ratios are unchanged. No DOM access.
 */
export function coverViewportOrigin(frame) {
  const pad = { left: Math.max(0, frame.left), top: Math.max(0, frame.top) };
  return { pad, frame: { ...frame, left: frame.left - pad.left, top: frame.top - pad.top } };
}

/**
 * Where the visible viewport sits in a snapdom image of document.body.
 * bodyRect is the captured content's rect relative to the viewport (see
 * scrollerFrame; left/top go negative when the page or the body is scrolled).
 * The image starts at the content's top-left corner but can be larger than
 * that rect: snapdom sizes it from scrollHeight/scrollWidth, so a 6000px body
 * can come back 6048px tall with the surplus at the bottom.
 * Pixels per CSS px are therefore one factor for both axes, the smallest of
 * `scale` (what was requested, with dpr 1) and the two image/content ratios. The
 * ratios only matter when snapdom clamped a very tall image (16384px max), and
 * then they shrink by the same amount. Returns the source rectangle in image
 * pixels (sx/sy/sw/sh) and where to draw it on an output of viewport x scale
 * (dx/dy/dw/dh). No DOM access.
 */
export function viewportCropRect({ bodyRect, viewportWidth, viewportHeight, scale, imageWidth, imageHeight }) {
  const outWidth = Math.round(viewportWidth * scale);
  const outHeight = Math.round(viewportHeight * scale);
  let k = scale;
  if (bodyRect.width > 0) k = Math.min(k, imageWidth / bodyRect.width);
  if (bodyRect.height > 0) k = Math.min(k, imageHeight / bodyRect.height);
  const axis = (bodyStart, bodySize, viewSize, imageSize) => {
    // Visible part of the body in CSS px, measured from the body's own origin.
    // bodyStart > 0: the body begins after the viewport origin, so shift the drawing.
    const lo = Math.max(0, -bodyStart);
    const hi = Math.min(imageSize / k, viewSize - bodyStart);
    const len = Math.max(0, hi - lo);
    const src = Math.min(imageSize, Math.round(lo * k));
    const srcSize = Math.max(0, Math.min(imageSize - src, Math.round(len * k)));
    const dst = Math.round((lo + bodyStart) * scale);
    const dstSize = srcSize > 0 ? Math.round(len * scale) : 0;
    return [src, srcSize, dst, dstSize];
  };
  const [sx, sw, dx, dw] = axis(bodyRect.left, bodyRect.width, viewportWidth, imageWidth);
  const [sy, sh, dy, dh] = axis(bodyRect.top, bodyRect.height, viewportHeight, imageHeight);
  return { sx, sy, sw, sh, dx, dy, dw, dh, outWidth, outHeight };
}

const VIEWPORT_POSITIONED = new Set(['fixed', 'sticky', '-webkit-sticky']);
const isNone = (v) => !v || v === 'none';
// Computed transform is 'none' or a matrix; only a plain translation is safe to
// fold into the measured rect.
const isTranslateOnly = (s) => (isNone(s.transform) || /^matrix\(\s*1\s*,\s*0\s*,\s*0\s*,\s*1\s*,/.test(s.transform))
  && isNone(s.rotate) && isNone(s.scale);
const createsContainingBlock = (s) => s.position !== 'static' || !isNone(s.transform) || !isNone(s.filter)
  || !isNone(s.backdropFilter) || !isNone(s.perspective)
  || /transform|perspective|filter/.test(s.willChange || '') || /layout|paint|strict|content/.test(s.contain || '');
const parentOf = (el) => el.parentElement || el.getRootNode?.()?.host || null;

/**
 * snapdom renders an unscrolled copy of the body, so position:fixed and sticky
 * elements land where they would be at scroll 0 (fixed ones at the top of the
 * body, sticky ones back in flow) and the viewport crop misses them. snapdom
 * only freezes them itself when the captured element is the scroller, and with
 * document scrolling body.scrollTop is 0. This snapdom afterClone step pins
 * each one in the copy, as position:absolute at the on-screen rect, relative to
 * its containing block, so it is drawn where the user sees it. Sticky elements
 * leave a hidden placeholder so the content after them does not move up.
 * When the body is its own scroller, its content origin is `rootScroll` above
 * and left of its box, so offsets from the root are moved by that much.
 * `getStyle` is injectable so node --test can drive it with plain objects.
 * Returns how many elements were pinned.
 */
export function pinViewportPositioned({
  root, rootClone, nodeMap, rootScroll = { left: 0, top: 0 }, getStyle = (el) => getComputedStyle(el),
}) {
  if (!root || !rootClone?.style || !nodeMap) return 0;
  const pins = [];
  for (const [copy, orig] of nodeMap) {
    if (orig === root || orig?.nodeType !== 1 || copy?.nodeType !== 1 || !copy.style) continue;
    const s = getStyle(orig);
    if (!VIEWPORT_POSITIONED.has(s.position) || !isTranslateOnly(s)) continue;
    const rect = orig.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) continue;
    let block = parentOf(orig);
    while (block && block !== root && !createsContainingBlock(getStyle(block))) block = parentOf(block);
    if (!block) continue; // not inside the captured element
    if (block !== root && !isTranslateOnly(getStyle(block))) continue; // scaled/rotated box: offsets would not line up
    const b = block.getBoundingClientRect();
    const shift = block === root ? rootScroll : { left: 0, top: 0 };
    pins.push({
      copy,
      sticky: s.position !== 'fixed',
      left: rect.left - b.left - (block.clientLeft || 0) + (shift.left || 0),
      top: rect.top - b.top - (block.clientTop || 0) + (shift.top || 0),
      width: rect.width,
      height: rect.height,
    });
  }
  if (pins.length && getStyle(root).position === 'static') rootClone.style.position = 'relative';
  for (const p of pins) {
    const st = p.copy.style;
    if (p.sticky && p.copy.parentNode) {
      const ph = p.copy.cloneNode(false);
      ph.style.position = 'static';
      ph.style.visibility = 'hidden';
      ph.style.width = `${p.width}px`;
      ph.style.height = `${p.height}px`;
      ph.style.boxSizing = 'border-box';
      p.copy.parentNode.insertBefore(ph, p.copy);
    }
    st.position = 'absolute';
    st.left = `${p.left}px`;
    st.top = `${p.top}px`;
    st.right = 'auto';
    st.bottom = 'auto';
    st.width = `${p.width}px`;
    st.height = `${p.height}px`;
    st.margin = '0';
    st.boxSizing = 'border-box';
    st.transform = 'none';
    st.translate = 'none';
  }
  return pins.length;
}

const SCROLLING = new Set(['auto', 'scroll', 'overlay']);

// Scroll offsets and content size of the body when its computed overflow
// would clip the copy: it is its own scroller, separate from
// document.scrollingElement (in quirks mode the body is the scrollingElement
// and its scrollTop is the document's), or its overflow went to the viewport
// (html overflow visible) but the copy keeps it, so a height:100% body would
// be cut off at one window height. That last case is not only GeDB's
// overflow-y:auto: an antd Modal (the Report dialog) locks scrolling with
// `html body { overflow-y: hidden }`, so with html and body height:100% the
// page stays scrolled on <html> but the copy is clipped to the first window.
// The offsets are then 0, as the document scroll is already in the body rect.
// Only the vertical axis counts hidden/clip, and only while html's overflow is
// visible: a body overflow-x:hidden clips on screen too, and with html
// overflow:hidden the body really clips, so growing the copy would not match.
// null otherwise.
function bodyScroller(body, scrollingElement, getStyle) {
  if (body === scrollingElement) return null;
  const s = getStyle(body);
  const html = body.parentElement;
  const h = html ? getStyle(html) : null;
  const propagated = Boolean(h) && h.overflowX === 'visible' && h.overflowY === 'visible';
  const clipsY = SCROLLING.has(s.overflowY)
    || (propagated && (s.overflowY === 'hidden' || s.overflowY === 'clip'));
  const overflows = (clipsY && body.scrollHeight > body.clientHeight)
    || (SCROLLING.has(s.overflowX) && body.scrollWidth > body.clientWidth);
  if (!body.scrollTop && !body.scrollLeft && !overflows) return null;
  return {
    left: body.scrollLeft, top: body.scrollTop, width: body.scrollWidth, height: body.scrollHeight,
    sideways: body.scrollLeft !== 0 || body.scrollWidth > body.clientWidth,
  };
}

// What the browser paints outside the body box: html's background, else the
// body's, which then covers the whole canvas.
function canvasBackground() {
  const clear = (c) => !c || c === 'transparent' || /^rgba\(.*,\s*0\)$/.test(c);
  for (const el of [document.documentElement, document.body]) {
    const c = getComputedStyle(el).backgroundColor;
    if (!clear(c)) return c;
  }
  return '#ffffff';
}

/**
 * Make the clone of a scrolling body show its whole content from the top-left,
 * unscrolled, so the image lines up with scrollerFrame(). snapdom shows a
 * scrolled root's visible window instead: it clips the clone, wraps its
 * children in a div translated by -scroll and moves inline absolute/fixed
 * descendants by +scroll. Both are undone here, so the scroll is applied once,
 * by the crop. A body whose overflow went to the viewport has no wrapper; its
 * copy just grows to the content size.
 */
function unscrollRootClone(rootClone, scroller) {
  const st = rootClone.style;
  const wrap = [...rootClone.children].find((el) => el.style?.willChange === 'transform' && /^translate\(/.test(el.style.transform));
  if (wrap) {
    wrap.style.transform = 'none';
    wrap.style.willChange = 'auto'; // the root, not the wrapper, is the containing block again
    for (const el of rootClone.querySelectorAll('*')) {
      if (el.style?.position !== 'absolute') continue;
      el.style.top = `${(parseFloat(el.style.top) || 0) - scroller.top}px`;
      el.style.left = `${(parseFloat(el.style.left) || 0) - scroller.left}px`;
    }
  }
  st.overflow = 'visible';
  st.height = 'auto';
  st.minHeight = `${scroller.height}px`;
  if (scroller.sideways) {
    st.width = 'auto';
    st.minWidth = `${scroller.width}px`;
  }
}

/**
 * What captureQuick measures before rendering, with the live globals passed in
 * so node --test can drive it with plain objects. Returns `scroller` (the
 * body's own scroll offsets and content size, or null when the document
 * scrolls and the copy would not clip; offsets 0 and the content size when
 * html scrolls past a one-window body that clips), `pad` and `frame` (see
 * coverViewportOrigin), `rootScroll` (the offset pinViewportPositioned moves
 * root-relative pins by) and the viewport size.
 */
export function quickCaptureGeometry({
  body, scrollingElement, viewportWidth, viewportHeight, getStyle = (el) => getComputedStyle(el),
}) {
  // Read before rendering: snapdom draws the body's whole layout box, so on a
  // page that scrolls the document itself it would be the full page height.
  const bodyRect = body.getBoundingClientRect();
  const scroller = bodyScroller(body, scrollingElement, getStyle);
  const { pad, frame } = coverViewportOrigin(scrollerFrame(scroller
    ? { bodyRect, scrollLeft: scroller.left, scrollTop: scroller.top, scrollWidth: scroller.width, scrollHeight: scroller.height }
    : { bodyRect }));
  const rootScroll = scroller ? { left: scroller.left, top: scroller.top } : { left: 0, top: 0 };
  return { scroller, pad, frame, rootScroll, viewportWidth, viewportHeight };
}

export async function captureQuick({ scale } = {}) {
  const { snapdom } = await import('@zumer/snapdom');
  const dpr = window.devicePixelRatio || 1;
  const s = scale || Math.min(dpr, 2);
  const {
    scroller, pad, frame, rootScroll, viewportWidth, viewportHeight,
  } = quickCaptureGeometry({
    body: document.body,
    scrollingElement: document.scrollingElement,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  });
  const background = canvasBackground();
  const result = await snapdom(document.body, {
    scale: s,
    // s already includes the pixel ratio; without this snapdom multiplies by it again.
    dpr: 1,
    exclude: WIDGET_SELECTORS,
    excludeMode: 'hide',
    backgroundColor: background,
    embedFonts: true,
    fast: true,
    plugins: [{
      name: 'kids-feedback-viewport-pin',
      afterClone: (c) => {
        if (scroller) unscrollRootClone(c.clone, scroller);
        pinViewportPositioned({ root: c.element, rootClone: c.clone, nodeMap: c.nodeMap, rootScroll });
        // snapdom zeroes the copy's margin; this one only moves it within the image.
        if (pad.left) c.clone.style.marginLeft = `${pad.left}px`;
        if (pad.top) c.clone.style.marginTop = `${pad.top}px`;
      },
    }],
  });
  const full = await loadImage(await result.toBlob({ type: 'png' }));
  const r = viewportCropRect({
    bodyRect: frame, viewportWidth, viewportHeight, scale: s,
    imageWidth: full.naturalWidth, imageHeight: full.naturalHeight,
  });
  const canvas = document.createElement('canvas');
  canvas.width = r.outWidth;
  canvas.height = r.outHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, r.outWidth, r.outHeight);
  if (r.sw > 0 && r.sh > 0) ctx.drawImage(full, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return { blob, width: r.outWidth, height: r.outHeight, method: 'quick' };
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read the screenshot.')); };
    img.src = url;
  });
}

/** Real pixels of the current tab. Throws NotAllowedError when the user cancels. */
export async function captureExact() {
  if (!supportsExactCapture()) throw new Error('Exact capture is not supported in this browser.');
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser' },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    surfaceSwitching: 'exclude',
    monitorTypeSurfaces: 'exclude',
  });
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error('Could not read the captured frame.'));
      setTimeout(() => reject(new Error('Timed out waiting for the capture.')), 8000);
    });
    await video.play();
    // Let the picker overlay fade before the frame is taken.
    await nextFrames(3);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    return { blob, width: canvas.width, height: canvas.height, method: 'exact' };
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

function nextFrames(n) {
  return new Promise((resolve) => {
    const step = (k) => (k <= 0 ? resolve() : requestAnimationFrame(() => step(k - 1)));
    step(n);
  });
}

export function imageSize(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

export function blobToFile(blob, name, type) {
  return new File([blob], name, { type: type || blob.type || 'application/octet-stream' });
}
