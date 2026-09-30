/**
 * Annotator zoom and coordinate maths. Pure: no React, no DOM, so it is unit-tested from src.
 */

// Clamp a zoom multiplier (1 = Fit) to [1, maxZoom], snapping float drift onto the bounds.
export function clampZoom(next, maxZoom) {
  let z = Math.min(maxZoom, Math.max(1, next));
  if (z - 1 < 1e-6) z = 1;
  if (maxZoom - z < 1e-6) z = maxZoom;
  return z;
}

// Up to 400% of natural size (the readout's unit); fit is never above 1, so this is always ≥ Fit.
export const MAX_PCT = 400;
export const maxZoomFor = (fit) => Math.max(1, MAX_PCT / 100 / fit);

// One zoom button/key step: the readout (percent of natural size) moves to the next multiple of 25
// up (dir 1) or down (dir -1), so 100% and 400% are exact stops. Returns the zoom multiplier (1 = Fit), clamped.
export const PCT_STEP = 25;
export function stepZoom(zoom, fit, dir) {
  const pct = zoom * fit * 100;
  const k = pct / PCT_STEP;
  const next = (dir > 0 ? Math.floor(k + 1e-6) + 1 : Math.ceil(k - 1e-6) - 1) * PCT_STEP;
  return clampZoom(next / 100 / fit, maxZoomFor(fit));
}

// Client point → natural image pixels, given the canvas's on-screen rect. Clamped to the image.
export function clientToImage(clientX, clientY, rect, natW, natH) {
  const x = Math.min(natW, Math.max(0, ((clientX - rect.left) / rect.width) * natW));
  const y = Math.min(natH, Math.max(0, ((clientY - rect.top) / rect.height) * natH));
  return { x, y };
}

// One axis of a zoom anchor. The image coordinate (natural px) under client point c, on a canvas at
// rectStart..rectStart+rectSize, and the scroll that puts image point i back under c once the canvas is resized.
export const imageCoordAt = (c, rectStart, rectSize, nat) => ((c - rectStart) / rectSize) * nat;
export const scrollToAnchor = (scroll, rectStart, rectSize, nat, i, c) => scroll + rectStart + (i / nat) * rectSize - c;

// The anchor to reuse for a zoom at (px, py): the previous zoom's exact image point, if the pointer and the scroll
// are where that zoom left them. Re-reading it from the layout would pick up the scroll's integer rounding on every
// wheel step, and the spot would creep away from the cursor. Otherwise null: measure afresh.
export function heldAnchor(last, px, py, sl, st) {
  return last && last.px === px && last.py === py && last.sl === sl && last.st === st ? { ix: last.ix, iy: last.iy } : null;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));

// The text box at display point (cx, cy) on a dw×dh canvas: fully inside it, and narrower on a tiny canvas.
export function textBoxRect(cx, cy, dw, dh) {
  const width = Math.max(0, Math.min(200, dw - 4));
  return { left: clamp(cx, 0, dw - width - 4), top: clamp(cy - 18, 0, dh - 28), width };
}

// Space on a control focused with Tab presses it; anywhere else (body, stage, a mouse-clicked button) it pans.
// tabFocused is the element Tab last moved focus to. Not :focus-visible — Chrome sets that on any keydown,
// so a clicked button would match by the time Space arrives.
const ACTIVATES = 'button, a, [role="button"], [role="tab"], [role="checkbox"]';
export const spaceActivates = (t, tabFocused) => Boolean(t && t === tabFocused && t.matches && t.matches(ACTIVATES));

// Shapes plus the open text box, if it has any text — what commitText adds.
export function withPendingText(shapes, textAt, textValue, color) {
  const text = textValue.trim();
  return textAt && text ? [...shapes, { type: 'text', color, x: textAt.x, y: textAt.y, text }] : shapes;
}

// Read a ref's pending value and clear it, so only the first of several commits in one tick gets it.
export function takeOnce(ref) {
  const v = ref.current;
  ref.current = null;
  return v;
}

// Export size never depends on zoom, so the copy doesn't mention it.
export const exportErrorText = (subject) => `The marked-up ${subject.toLowerCase()} couldn't be saved. Cancel to keep the original attached.`;
