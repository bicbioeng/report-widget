// Annotator zoom maths. Runs against src directly, no build needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampZoom, maxZoomFor, stepZoom, clientToImage, imageCoordAt, scrollToAnchor, heldAnchor, textBoxRect, spaceActivates, withPendingText, takeOnce, exportErrorText } from '../src/annotatorMath.js';

test('clampZoom stays within [1, maxZoom] and snaps near the bounds', () => {
  assert.equal(clampZoom(0.2, 4), 1);
  assert.equal(clampZoom(-3, 4), 1);
  assert.equal(clampZoom(9, 4), 4);
  assert.equal(clampZoom(2.5, 4), 2.5);
  assert.equal(clampZoom(1 + 1e-9, 4), 1);
  assert.equal(clampZoom(4 - 1e-9, 4), 4);
  // Five zoom-outs from 1.25^5 land exactly on Fit.
  let z = 1;
  for (let i = 0; i < 5; i++) z = clampZoom(z * 1.25, 10);
  for (let i = 0; i < 5; i++) z = clampZoom(z / 1.25, 10);
  assert.equal(z, 1);
});

test('maxZoomFor reaches 400% of natural size', () => {
  assert.equal(maxZoomFor(0.25), 16);
  assert.equal(maxZoomFor(0.1), 40);
  assert.equal(maxZoomFor(1), 4);
  assert.equal(maxZoomFor(8), 1); // never below Fit
});

test('stepZoom from Fit 50% goes to 75%, stays at Fit going down, and caps at 400%', () => {
  assert.equal(stepZoom(1, 0.5, 1), 1.5);
  assert.equal(stepZoom(1, 0.5, -1), 1);
  assert.equal(stepZoom(7.9, 0.5, 1), 8);
  assert.equal(stepZoom(8, 0.5, 1), 8);
  // Fit 45.6% (2000×1000 in the 960px modal): 50%, 75%, 100%, and back down to Fit.
  const fit = 0.456;
  const a = stepZoom(1, fit, 1), b = stepZoom(a, fit, 1), c = stepZoom(b, fit, 1);
  assert.deepEqual([a, b, c].map((z) => Math.round(z * fit * 100)), [50, 75, 100]);
  assert.equal(stepZoom(a, fit, -1), 1);
});

const pctOf = (z, fit) => Math.round(z * fit * 100);

test('stepZoom moves the readout in 25% steps from Fit up to 400% and back', () => {
  for (const fit of [0.35, 0.31, 0.13, 1]) {
    const max = maxZoomFor(fit);
    let z = 1;
    const up = [pctOf(z, fit)];
    while (z < max) { z = stepZoom(z, fit, 1); up.push(pctOf(z, fit)); }
    assert.equal(up.at(-1), 400);
    assert.equal(stepZoom(z, fit, 1), max); // stays at the maximum
    for (let i = 2; i < up.length; i++) assert.equal(up[i] - up[i - 1], 25);
    assert.equal(up[1] % 25, 0);
    const down = [];
    while (z > 1) { z = stepZoom(z, fit, -1); down.push(pctOf(z, fit)); }
    assert.equal(z, 1); // lands exactly on Fit
    assert.deepEqual(down, up.slice(0, -1).reverse());
  }
});

test('stepZoom from an off-grid wheel zoom snaps to the neighbouring 25% stops', () => {
  assert.equal(pctOf(stepZoom(1.3 / 0.35, 0.35, 1), 0.35), 150);
  assert.equal(pctOf(stepZoom(1.3 / 0.35, 0.35, -1), 0.35), 125);
  assert.equal(pctOf(stepZoom(1 / 0.35, 0.35, 1), 0.35), 125); // exactly 100% steps a full 25
});

const natW = 2568, natH = 1611;
const fitRect = { left: 100, top: 50, width: 642, height: 402.75 };

test('clientToImage maps centre and corners of the rect onto the image', () => {
  const r = fitRect;
  assert.deepEqual(clientToImage(r.left + r.width / 2, r.top + r.height / 2, r, natW, natH), { x: natW / 2, y: natH / 2 });
  assert.deepEqual(clientToImage(r.left, r.top, r, natW, natH), { x: 0, y: 0 });
  assert.deepEqual(clientToImage(r.left + r.width, r.top + r.height, r, natW, natH), { x: natW, y: natH });
});

test('clientToImage clamps points outside the rect to the image edge', () => {
  const r = fitRect;
  assert.deepEqual(clientToImage(r.left - 50, r.top - 50, r, natW, natH), { x: 0, y: 0 });
  assert.deepEqual(clientToImage(r.left + r.width + 50, r.top + r.height + 50, r, natW, natH), { x: natW, y: natH });
  assert.deepEqual(clientToImage(r.left - 50, r.top + r.height / 2, r, natW, natH), { x: 0, y: natH / 2 });
});

test('a point drawn at 400% lands on the same image pixel as at Fit', () => {
  const img = { x: 1000, y: 700 };
  const at = (r) => [r.left + (img.x / natW) * r.width, r.top + (img.y / natH) * r.height];
  // 400%, scrolled so the rect starts well off-screen to the top-left.
  const zoomed = { left: -1500, top: -900, width: fitRect.width * 4, height: fitRect.height * 4 };
  const a = clientToImage(...at(fitRect), fitRect, natW, natH);
  const b = clientToImage(...at(zoomed), zoomed, natW, natH);
  assert.ok(Math.abs(a.x - img.x) < 1e-9 && Math.abs(a.y - img.y) < 1e-9);
  assert.ok(Math.abs(b.x - a.x) < 1e-9 && Math.abs(b.y - a.y) < 1e-9);
});

test('clientToImage on a 1000×500 image at Fit and zoomed ×4 hits the same pixel, clamped outside', () => {
  assert.deepEqual(clientToImage(250, 125, { left: 0, top: 0, width: 500, height: 250 }, 1000, 500), { x: 500, y: 250 });
  const zoomed = { left: -500, top: -250, width: 2000, height: 1000 };
  assert.deepEqual(clientToImage(500, 250, zoomed, 1000, 500), { x: 500, y: 250 });
  assert.deepEqual(clientToImage(5000, -5000, zoomed, 1000, 500), { x: 1000, y: 0 });
  assert.deepEqual(clientToImage(-5000, 5000, zoomed, 1000, 500), { x: 0, y: 500 });
});

// One axis of the stage: a canvas of nat × scale px, centred while smaller than the stage, and a scroll offset
// the browser keeps as an integer. Returns where image point i sits on screen after each Ctrl+wheel step at c.
function wheelDrift({ reuse, round, nat = 2000, stage = 928, fit = 0.464, c = 700, steps = 40, dy = -25 }) {
  let zoom = 1; let scroll = 0; let last = null; let i0 = null;
  const layout = (z) => {
    const size = Math.floor(nat * fit * z);
    return { size, start: Math.max(0, (stage - size) / 2) - scroll };
  };
  const drift = [];
  for (let n = 0; n < steps; n += 1) {
    let r = layout(zoom);
    const held = reuse ? heldAnchor(last, c, 0, scroll, 0) : null;
    const i = held ? held.ix : imageCoordAt(c, r.start, r.size, nat);
    if (i0 == null) i0 = i;
    zoom = clampZoom(zoom * Math.exp(-dy * 0.01), maxZoomFor(fit));
    r = layout(zoom);
    scroll = Math.min(Math.max(0, r.size - stage), Math.max(0, round(scrollToAnchor(scroll, r.start, r.size, nat, i, c))));
    last = { px: c, py: 0, ix: i, iy: 0, sl: scroll, st: 0 };
    r = layout(zoom);
    drift.push(Math.abs(r.start + (i0 / nat) * r.size - c));
  }
  return drift;
}

test('Ctrl+wheel in small steps keeps the spot under the cursor although scroll offsets are whole pixels', () => {
  for (const round of [Math.round, Math.floor, Math.trunc]) {
    const drift = wheelDrift({ reuse: true, round });
    assert.ok(Math.max(...drift) <= 1, `max drift ${Math.max(...drift)} (${round.name})`);
  }
  // Re-reading the anchor from the rounded layout on every step is what let it creep away.
  assert.ok(Math.max(...wheelDrift({ reuse: false, round: Math.floor })) > 2);
});

test('heldAnchor reuses the last image point only while the pointer and scroll are unchanged', () => {
  const last = { px: 10, py: 20, ix: 123.4, iy: 56.7, sl: 30, st: 40 };
  assert.deepEqual(heldAnchor(last, 10, 20, 30, 40), { ix: 123.4, iy: 56.7 });
  assert.equal(heldAnchor(last, 11, 20, 30, 40), null); // pointer moved
  assert.equal(heldAnchor(last, 10, 20, 31, 40), null); // panned or scrolled
  assert.equal(heldAnchor(null, 10, 20, 30, 40), null);
});

test('scrollToAnchor puts the image point back under the client point', () => {
  const i = imageCoordAt(500, 100, 1000, 2000); // 800 of 2000
  assert.equal(i, 800);
  // Canvas grew to 2000px wide at rect start 100 with scroll 0: point is at 100 + 800 = 900, 400 px right of 500.
  assert.equal(scrollToAnchor(0, 100, 2000, 2000, i, 500), 400);
});

test('textBoxRect keeps the text box inside the canvas at the right and bottom edges', () => {
  const dw = 800, dh = 500;
  const right = textBoxRect(dw - 10, 200, dw, dh);
  assert.equal(right.width, 200);
  assert.ok(right.left + right.width + 4 <= dw);
  const bottom = textBoxRect(100, dh - 10, dw, dh);
  assert.ok(bottom.top + 28 <= dh);
  assert.deepEqual(textBoxRect(5, 5, dw, dh), { left: 5, top: 0, width: 200 });
});

test('textBoxRect shrinks the box on a canvas narrower than 204px', () => {
  const r = textBoxRect(150, 40, 160, 20);
  assert.equal(r.width, 156);
  assert.equal(r.left, 0);
  assert.equal(r.top, 0);
  const tiny = textBoxRect(50, 50, 100, 100);
  assert.ok(tiny.width < 200 && tiny.left + tiny.width + 4 <= 100);
});

test('spaceActivates only for a control focused with Tab, so Space pans after a mouse click', () => {
  const el = (sel) => ({ matches: (q) => q.includes(sel) });
  const btn = el('button');
  assert.equal(spaceActivates(btn, btn), true); // tabbed to: Space presses it
  const role = el('[role="button"]');
  assert.equal(spaceActivates(role, role), true);
  assert.equal(spaceActivates(btn, null), false); // mouse-clicked button: Space pans
  assert.equal(spaceActivates(btn, el('button')), false); // Tab went elsewhere
  const stage = el('.kf-stage');
  assert.equal(spaceActivates(stage, stage), false); // focused stage or canvas
  assert.equal(spaceActivates(null, null), false);
  assert.equal(spaceActivates({}, {}), false); // window / document
});

test('withPendingText adds the open text box, trimmed, and ignores blank text', () => {
  const shapes = [{ type: 'rect', color: '#ef4444', x1: 0, y1: 0, x2: 9, y2: 9 }];
  const at = { x: 10, y: 20, cx: 1, cy: 2 };
  assert.deepEqual(withPendingText(shapes, at, '  hi  ', '#22c55e'), [...shapes, { type: 'text', color: '#22c55e', x: 10, y: 20, text: 'hi' }]);
  assert.equal(withPendingText(shapes, at, '', '#22c55e'), shapes);
  assert.equal(withPendingText(shapes, at, '   ', '#22c55e'), shapes);
  assert.equal(withPendingText(shapes, null, 'hi', '#22c55e'), shapes);
});

test('takeOnce hands out the pending value once, so a second commit in the same tick adds nothing', () => {
  const at = { x: 10, y: 20, cx: 1, cy: 2 };
  const ref = { current: at };
  let shapes = [];
  // e.g. zoom commits, then the input's blur fires as it unmounts.
  for (let i = 0; i < 2; i++) shapes = withPendingText(shapes, takeOnce(ref), 'abc', '#ef4444');
  assert.equal(shapes.length, 1);
  assert.equal(ref.current, null);
  assert.equal(takeOnce({ current: null }), null);
});

test('exportErrorText names the subject and does not blame zoom', () => {
  assert.equal(exportErrorText('Screenshot'), "The marked-up screenshot couldn't be saved. Cancel to keep the original attached.");
  assert.equal(exportErrorText('Image'), "The marked-up image couldn't be saved. Cancel to keep the original attached.");
  assert.doesNotMatch(exportErrorText('Image'), /zoom/i);
});

import { shapeBox, hitShape, moveShape } from '../src/annotatorMath.js';

const W = () => 40; // every text mark is 40 px wide here
const marks = [
  { type: 'rect', x1: 10, y1: 10, x2: 60, y2: 40 },
  { type: 'arrow', x1: 100, y1: 100, x2: 200, y2: 100 },
  { type: 'pen', points: [{ x: 300, y: 300 }, { x: 320, y: 340 }] },
  { type: 'text', x: 400, y: 50, text: 'ya yaha hunu arxa' },
];

test('hitShape finds the topmost mark: inside boxes and text, near lines', () => {
  assert.equal(hitShape(marks, { x: 30, y: 25 }, 6, W, 18), 0);
  assert.equal(hitShape(marks, { x: 150, y: 104 }, 6, W, 18), 1);
  assert.equal(hitShape(marks, { x: 150, y: 120 }, 6, W, 18), -1);
  assert.equal(hitShape(marks, { x: 311, y: 321 }, 6, W, 18), 2);
  assert.equal(hitShape(marks, { x: 420, y: 45 }, 6, W, 18), 3);
  const stacked = [...marks, { type: 'rect', x1: 0, y1: 0, x2: 100, y2: 100 }];
  assert.equal(hitShape(stacked, { x: 30, y: 25 }, 6, W, 18), 4);
});

test('moveShape shifts every kind of mark and keeps its text', () => {
  assert.deepEqual(moveShape(marks[0], 5, -5), { type: 'rect', x1: 15, y1: 5, x2: 65, y2: 35 });
  assert.deepEqual(moveShape(marks[2], 1, 2).points, [{ x: 301, y: 302 }, { x: 321, y: 342 }]);
  assert.deepEqual(moveShape(marks[3], 10, 10), { type: 'text', x: 410, y: 60, text: 'ya yaha hunu arxa' });
  assert.deepEqual(shapeBox(marks[3], W, 18), { x: 400, y: 32, w: 40, h: 18 * 1.3 });
});
