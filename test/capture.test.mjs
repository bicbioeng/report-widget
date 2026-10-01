// Quick-capture viewport crop. Runs against src directly, no build needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  viewportCropRect, pinViewportPositioned, scrollerFrame, coverViewportOrigin, quickCaptureGeometry,
} from '../src/capture.js';

function assertWithinViewport(r, viewportWidth, viewportHeight, scale) {
  assert.ok(r.outWidth <= Math.round(viewportWidth * scale));
  assert.ok(r.outHeight <= Math.round(viewportHeight * scale));
}

test('long document-scrolled page is cropped to the visible viewport', () => {
  const args = {
    bodyRect: { left: 0, top: -1500, width: 1280, height: 6000 },
    viewportWidth: 1280, viewportHeight: 800, scale: 2, imageWidth: 2560, imageHeight: 12000,
  };
  const r = viewportCropRect(args);
  assert.deepEqual(r, { sx: 0, sy: 3000, sw: 2560, sh: 1600, dx: 0, dy: 0, dw: 2560, dh: 1600, outWidth: 2560, outHeight: 1600 });
  assertWithinViewport(r, 1280, 800, 2);
});

test('viewport-height body keeps the full image', () => {
  const r = viewportCropRect({
    bodyRect: { left: 0, top: 0, width: 1280, height: 800 },
    viewportWidth: 1280, viewportHeight: 800, scale: 1, imageWidth: 1280, imageHeight: 800,
  });
  assert.deepEqual(r, { sx: 0, sy: 0, sw: 1280, sh: 800, dx: 0, dy: 0, dw: 1280, dh: 800, outWidth: 1280, outHeight: 800 });
  assertWithinViewport(r, 1280, 800, 1);
});

test('scrolled to the very bottom stays inside the image', () => {
  const r = viewportCropRect({
    bodyRect: { left: 0, top: -(6000 - 800), width: 1280, height: 6000 },
    viewportWidth: 1280, viewportHeight: 800, scale: 1, imageWidth: 1280, imageHeight: 6000,
  });
  assert.ok(r.sy + r.sh <= 6000);
  assert.equal(r.sy, 5200);
  assert.equal(r.sh, 800);
  assert.equal(r.outHeight, 800);
  assertWithinViewport(r, 1280, 800, 1);
});

test('body shorter than the viewport is padded to viewport height', () => {
  const r = viewportCropRect({
    bodyRect: { left: 0, top: 0, width: 1280, height: 300 },
    viewportWidth: 1280, viewportHeight: 800, scale: 2, imageWidth: 2560, imageHeight: 600,
  });
  assert.equal(r.outHeight, 1600);
  assert.ok(r.sh <= 600);
  assert.equal(r.sh, 600);
  assertWithinViewport(r, 1280, 800, 2);
});

test('body starting below and right of the origin is shifted on the output', () => {
  const r = viewportCropRect({
    bodyRect: { left: 8, top: 8, width: 1264, height: 3000 },
    viewportWidth: 1280, viewportHeight: 800, scale: 2, imageWidth: 2528, imageHeight: 6000,
  });
  assert.deepEqual(r, { sx: 0, sy: 0, sw: 2528, sh: 1584, dx: 16, dy: 16, dw: 2528, dh: 1584, outWidth: 2560, outHeight: 1600 });
  assert.ok(r.dx + r.dw <= r.outWidth && r.dy + r.dh <= r.outHeight);
});

test('over-scrolled past the image draws nothing rather than out of bounds', () => {
  const r = viewportCropRect({
    bodyRect: { left: 0, top: -7000, width: 1280, height: 6000 },
    viewportWidth: 1280, viewportHeight: 800, scale: 1, imageWidth: 1280, imageHeight: 6000,
  });
  assert.equal(r.sh, 0);
  assert.ok(r.sy <= 6000);
  assert.equal(r.outHeight, 800);
});

// snapdom sizes a body capture from scrollHeight, so the image can be taller
// than the body box (QA saw 1280x6048 for a 6000px body). The surplus is at the
// bottom and must not be read as extra pixel density.
test('image taller than the body: crop stays pixel-aligned at scroll 1500', () => {
  const r = viewportCropRect({
    bodyRect: { left: 0, top: -1500, width: 1280, height: 6000 },
    viewportWidth: 1280, viewportHeight: 800, scale: 1, imageWidth: 1280, imageHeight: 6048,
  });
  assert.deepEqual(r, { sx: 0, sy: 1500, sw: 1280, sh: 800, dx: 0, dy: 0, dw: 1280, dh: 800, outWidth: 1280, outHeight: 800 });
});

test('image taller than the body: bottom of the page has no blank strip', () => {
  const r = viewportCropRect({
    bodyRect: { left: 0, top: -5200, width: 1280, height: 6000 },
    viewportWidth: 1280, viewportHeight: 800, scale: 1, imageWidth: 1280, imageHeight: 6048,
  });
  assert.deepEqual([r.sy, r.sh, r.dy, r.dh], [5200, 800, 0, 800]);
});

test('image taller than the body at scale 2', () => {
  const r = viewportCropRect({
    bodyRect: { left: 0, top: -1500, width: 1280, height: 6000 },
    viewportWidth: 1280, viewportHeight: 800, scale: 2, imageWidth: 2560, imageHeight: 12096,
  });
  assert.deepEqual(r, { sx: 0, sy: 3000, sw: 2560, sh: 1600, dx: 0, dy: 0, dw: 2560, dh: 1600, outWidth: 2560, outHeight: 1600 });
});

// snapdom clamps images to 16384 px by shrinking both axes alike.
test('clamped tall image: density comes from the clamp, same on both axes', () => {
  const clamp = 16384 / 10048; // snapdom's CSS height includes a 48px surplus
  const imageWidth = Math.round(1280 * clamp);
  const r = viewportCropRect({
    bodyRect: { left: 0, top: -1500, width: 1280, height: 10000 },
    viewportWidth: 1280, viewportHeight: 800, scale: 2, imageWidth, imageHeight: 16384,
  });
  const k = imageWidth / 1280;
  assert.equal(r.sy, Math.round(1500 * k));
  assert.equal(r.sh, Math.round(800 * k));
  assert.ok(Math.abs(r.sy - 1500 * clamp) <= 1);
  assert.equal(r.sw, imageWidth);
  assert.deepEqual([r.dx, r.dy, r.dw, r.dh, r.outWidth, r.outHeight], [0, 0, 2560, 1600, 2560, 1600]);
});

test('mobile: clamped 9000px page at scale 2', () => {
  const bodyHeight = 9000;
  const imageHeight = 16384;
  const imageWidth = Math.round(390 * (imageHeight / bodyHeight));
  const r = viewportCropRect({
    bodyRect: { left: 0, top: -1500, width: 390, height: bodyHeight },
    viewportWidth: 390, viewportHeight: 844, scale: 2, imageWidth, imageHeight,
  });
  const k = Math.min(imageWidth / 390, imageHeight / bodyHeight);
  assert.equal(r.sy, Math.round(1500 * k));
  assert.equal(r.sh, Math.round(844 * k));
  assert.deepEqual([r.dw, r.dh, r.outWidth, r.outHeight], [780, 1688, 780, 1688]);
});

// Plain objects standing in for the live DOM and snapdom's clone.
function fakeEl(name, { rect = { left: 0, top: 0, width: 0, height: 0 }, style = {}, parent = null } = {}) {
  return {
    name,
    nodeType: 1,
    parentElement: parent,
    clientLeft: 0,
    clientTop: 0,
    getBoundingClientRect: () => rect,
    computed: { position: 'static', transform: 'none', ...style },
  };
}
function fakeCopy(name) {
  const copy = { name, nodeType: 1, style: {}, parentNode: null };
  copy.cloneNode = () => ({ name: `${name}-placeholder`, nodeType: 1, style: {} });
  return copy;
}
const getStyle = (el) => el.computed;

function documentScrolledTo(scrollY) {
  const body = fakeEl('body', { rect: { left: 0, top: -scrollY, width: 1280, height: 6000 } });
  const main = fakeEl('main', { rect: { left: 0, top: -scrollY, width: 1280, height: 6000 }, parent: body });
  const nav = fakeEl('nav', { rect: { left: 0, top: 0, width: 1280, height: 60 }, style: { position: 'fixed' }, parent: body });
  const foot = fakeEl('foot', { rect: { left: 0, top: 760, width: 1280, height: 40 }, style: { position: 'fixed' }, parent: body });
  const copies = { body: fakeCopy('body'), main: fakeCopy('main'), nav: fakeCopy('nav'), foot: fakeCopy('foot') };
  const nodeMap = new Map([[copies.body, body], [copies.main, main], [copies.nav, nav], [copies.foot, foot]]);
  return { body, copies, nodeMap };
}

test('fixed header and footer are pinned where they are on screen', () => {
  const { body, copies, nodeMap } = documentScrolledTo(1500);
  const n = pinViewportPositioned({ root: body, rootClone: copies.body, nodeMap, getStyle });
  assert.equal(n, 2);
  assert.equal(copies.body.style.position, 'relative');
  assert.deepEqual(
    [copies.nav.style.position, copies.nav.style.top, copies.nav.style.left, copies.nav.style.height, copies.nav.style.bottom],
    ['absolute', '1500px', '0px', '60px', 'auto'],
  );
  // Footer at the bottom of an 800px viewport: 1500 + 760 in body coordinates.
  assert.equal(copies.foot.style.top, '2260px');
  assert.equal(copies.main.style.position, undefined);
});

test('pinned fixed element lands inside the viewport crop', () => {
  const scrollY = 5200;
  const { body, copies, nodeMap } = documentScrolledTo(scrollY);
  pinViewportPositioned({ root: body, rootClone: copies.body, nodeMap, getStyle });
  const r = viewportCropRect({
    bodyRect: body.getBoundingClientRect(),
    viewportWidth: 1280, viewportHeight: 800, scale: 1, imageWidth: 1280, imageHeight: 6048,
  });
  const navTop = parseFloat(copies.nav.style.top);
  const footTop = parseFloat(copies.foot.style.top);
  assert.equal(navTop - r.sy, 0);
  assert.equal(footTop - r.sy, 760);
  assert.ok(footTop + 40 <= r.sy + r.sh);
});

test('at scroll 0 the fixed header stays at the top', () => {
  const { body, copies, nodeMap } = documentScrolledTo(0);
  pinViewportPositioned({ root: body, rootClone: copies.body, nodeMap, getStyle });
  assert.equal(copies.nav.style.top, '0px');
});

test('body margin is taken out of the pinned offset', () => {
  const body = fakeEl('body', { rect: { left: 8, top: -1492, width: 1264, height: 6000 } });
  const nav = fakeEl('nav', { rect: { left: 0, top: 0, width: 1280, height: 60 }, style: { position: 'fixed' }, parent: body });
  const copies = { body: fakeCopy('body'), nav: fakeCopy('nav') };
  pinViewportPositioned({ root: body, rootClone: copies.body, nodeMap: new Map([[copies.body, body], [copies.nav, nav]]), getStyle });
  assert.deepEqual([copies.nav.style.left, copies.nav.style.top], ['-8px', '1492px']);
});

test('offset is measured from a positioned ancestor, not the body', () => {
  const body = fakeEl('body', { rect: { left: 0, top: -1500, width: 1280, height: 6000 } });
  const wrap = fakeEl('wrap', { rect: { left: 100, top: -1400, width: 1000, height: 5000 }, style: { position: 'relative' }, parent: body });
  const bar = fakeEl('bar', { rect: { left: 0, top: 0, width: 1280, height: 50 }, style: { position: 'fixed' }, parent: wrap });
  wrap.clientLeft = 2;
  wrap.clientTop = 2;
  const copies = { body: fakeCopy('body'), wrap: fakeCopy('wrap'), bar: fakeCopy('bar') };
  const nodeMap = new Map([[copies.body, body], [copies.wrap, wrap], [copies.bar, bar]]);
  pinViewportPositioned({ root: body, rootClone: copies.body, nodeMap, getStyle });
  assert.deepEqual([copies.bar.style.left, copies.bar.style.top], ['-102px', '1398px']);
});

test('stuck sticky header is pinned and leaves a placeholder in flow', () => {
  const body = fakeEl('body', { rect: { left: 0, top: -1500, width: 1280, height: 6000 } });
  const head = fakeEl('head', { rect: { left: 0, top: 0, width: 1280, height: 64 }, style: { position: 'sticky' }, parent: body });
  const inserted = [];
  const copies = { body: fakeCopy('body'), head: fakeCopy('head') };
  copies.head.parentNode = { insertBefore: (node, before) => inserted.push([node, before]) };
  pinViewportPositioned({ root: body, rootClone: copies.body, nodeMap: new Map([[copies.body, body], [copies.head, head]]), getStyle });
  assert.equal(copies.head.style.top, '1500px');
  assert.equal(inserted.length, 1);
  const [ph, before] = inserted[0];
  assert.equal(before, copies.head);
  assert.deepEqual([ph.style.position, ph.style.visibility, ph.style.height], ['static', 'hidden', '64px']);
});

test('translated fixed element is pinned with the translation folded in', () => {
  const body = fakeEl('body', { rect: { left: 0, top: -1500, width: 1280, height: 6000 } });
  const nav = fakeEl('nav', { rect: { left: 0, top: -10, width: 1280, height: 60 }, style: { position: 'fixed', transform: 'matrix(1, 0, 0, 1, 0, -10)' }, parent: body });
  const copies = { body: fakeCopy('body'), nav: fakeCopy('nav') };
  pinViewportPositioned({ root: body, rootClone: copies.body, nodeMap: new Map([[copies.body, body], [copies.nav, nav]]), getStyle });
  assert.deepEqual([copies.nav.style.top, copies.nav.style.transform], ['1490px', 'none']);
});

test('rotated or scaled, hidden, and outside elements are left alone', () => {
  const body = fakeEl('body', { rect: { left: 0, top: -1500, width: 1280, height: 6000 } });
  const rotated = fakeEl('rotated', { rect: { left: 0, top: 0, width: 100, height: 100 }, style: { position: 'fixed', transform: 'matrix(0, 1, -1, 0, 0, 0)' }, parent: body });
  const hidden = fakeEl('hidden', { style: { position: 'fixed' }, parent: body });
  const outside = fakeEl('outside', { rect: { left: 0, top: 0, width: 100, height: 100 }, style: { position: 'fixed' } });
  const copies = { body: fakeCopy('body'), rotated: fakeCopy('rotated'), hidden: fakeCopy('hidden'), outside: fakeCopy('outside') };
  const nodeMap = new Map([[copies.body, body], [copies.rotated, rotated], [copies.hidden, hidden], [copies.outside, outside]]);
  const n = pinViewportPositioned({ root: body, rootClone: copies.body, nodeMap, getStyle });
  assert.equal(n, 0);
  assert.equal(copies.body.style.position, undefined);
  for (const c of [copies.rotated, copies.hidden, copies.outside]) assert.equal(c.style.position, undefined);
});

test('page without fixed elements is untouched', () => {
  const body = fakeEl('body', { rect: { left: 0, top: 0, width: 1280, height: 800 } });
  const main = fakeEl('main', { rect: { left: 0, top: 0, width: 1280, height: 800 }, parent: body });
  const copies = { body: fakeCopy('body'), main: fakeCopy('main') };
  assert.equal(pinViewportPositioned({ root: body, rootClone: copies.body, nodeMap: new Map([[copies.body, body], [copies.main, main]]), getStyle }), 0);
  assert.deepEqual(copies.body.style, {});
});

test('missing snapdom context is a no-op', () => {
  assert.equal(pinViewportPositioned({ root: null, rootClone: null, nodeMap: null, getStyle }), 0);
});

// Two scroll models. Document scrolling (KIDS, BNERC): the body box moves up by
// the scroll and its own offsets are 0. Body scrolling (GeDB, body and html
// height:100%): the body box stays at the top, viewport-sized, and its content
// is scrollTop above it.
const VIEWPORTS = [[1440, 900], [878, 900], [390, 844]];
const SCROLLS = [0, 300, 900, 3000];

for (const [W, H] of VIEWPORTS) {
  for (const scroll of SCROLLS) {
    for (const [scale, imageHeight] of [[1, 6000], [1, 6048], [2, 12000]]) {
      test(`body scrolling ${W}x${H} at ${scroll}, scale ${scale}, image ${imageHeight}`, () => {
        const frame = scrollerFrame({
          bodyRect: { left: 0, top: 0, width: W, height: H }, scrollLeft: 0, scrollTop: scroll, scrollWidth: W, scrollHeight: 6000,
        });
        assert.deepEqual(frame, { left: 0, top: 0 - scroll, width: W, height: 6000 });
        const r = viewportCropRect({ bodyRect: frame, viewportWidth: W, viewportHeight: H, scale, imageWidth: W * scale, imageHeight });
        assert.deepEqual([r.sy, r.sh, r.dy, r.dh], [scroll * scale, H * scale, 0, H * scale]);
        assert.deepEqual([r.sx, r.sw, r.dx, r.dw], [0, W * scale, 0, W * scale]);
        assert.deepEqual([r.outWidth, r.outHeight], [W * scale, H * scale]);
      });
    }

    test(`document scrolling ${W}x${H} at ${scroll}: same crop as the raw body rect`, () => {
      const bodyRect = { left: 0, top: 0 - scroll, width: W, height: 6000 };
      const frame = scrollerFrame({ bodyRect });
      assert.deepEqual(frame, bodyRect);
      for (const scale of [1, 2]) {
        const args = { viewportWidth: W, viewportHeight: H, scale, imageWidth: W * scale, imageHeight: 6048 * scale };
        const r = viewportCropRect({ bodyRect: frame, ...args });
        assert.deepEqual(r, viewportCropRect({ bodyRect, ...args }));
        assert.deepEqual([r.sy, r.sh, r.dy, r.dh, r.outWidth, r.outHeight], [scroll * scale, H * scale, 0, H * scale, W * scale, H * scale]);
      }
    });
  }
}

test('body-scrolled 6000px page clamped to 16384px at scale 2', () => {
  const frame = scrollerFrame({
    bodyRect: { left: 0, top: 0, width: 1440, height: 900 }, scrollTop: 3000, scrollWidth: 1440, scrollHeight: 10000,
  });
  const imageHeight = 16384;
  const imageWidth = Math.round(1440 * (imageHeight / 10000));
  const r = viewportCropRect({ bodyRect: frame, viewportWidth: 1440, viewportHeight: 900, scale: 2, imageWidth, imageHeight });
  const k = Math.min(imageWidth / 1440, imageHeight / 10000);
  assert.equal(r.sy, Math.round(3000 * k));
  assert.equal(r.sh, Math.round(900 * k));
  assert.deepEqual([r.dy, r.dh, r.outWidth, r.outHeight], [0, 1800, 2880, 1800]);
});

test('body-scrolled 6000px page at scale 2 stays unclamped and pixel-exact', () => {
  const frame = scrollerFrame({
    bodyRect: { left: 0, top: 0, width: 390, height: 844 }, scrollTop: 3000, scrollWidth: 390, scrollHeight: 6000,
  });
  const r = viewportCropRect({ bodyRect: frame, viewportWidth: 390, viewportHeight: 844, scale: 2, imageWidth: 780, imageHeight: 12000 });
  assert.deepEqual([r.sy, r.sh, r.dy, r.dh], [6000, 1688, 0, 1688]);
});

function bodyScrolledTo(scrollTop) {
  // The body box never moves; fixed elements are where they are on screen.
  const body = fakeEl('body', { rect: { left: 0, top: 0, width: 1280, height: 800 } });
  const nav = fakeEl('nav', { rect: { left: 0, top: 0, width: 1280, height: 60 }, style: { position: 'fixed' }, parent: body });
  const foot = fakeEl('foot', { rect: { left: 0, top: 760, width: 1280, height: 40 }, style: { position: 'fixed' }, parent: body });
  const wrap = fakeEl('wrap', { rect: { left: 0, top: 200 - scrollTop, width: 1280, height: 1000 }, style: { position: 'relative' }, parent: body });
  const bar = fakeEl('bar', { rect: { left: 0, top: 0, width: 1280, height: 50 }, style: { position: 'fixed' }, parent: wrap });
  const copies = { body: fakeCopy('body'), nav: fakeCopy('nav'), foot: fakeCopy('foot'), wrap: fakeCopy('wrap'), bar: fakeCopy('bar') };
  const nodeMap = new Map([[copies.body, body], [copies.nav, nav], [copies.foot, foot], [copies.wrap, wrap], [copies.bar, bar]]);
  return { body, copies, nodeMap };
}

test('body scrolling: fixed elements are pinned in the scrolled content', () => {
  const { body, copies, nodeMap } = bodyScrolledTo(1500);
  pinViewportPositioned({ root: body, rootClone: copies.body, nodeMap, rootScroll: { left: 0, top: 1500 }, getStyle });
  assert.equal(copies.nav.style.top, '1500px');
  assert.equal(copies.foot.style.top, '2260px');
  // A positioned block inside the body already moves with the scroll.
  assert.equal(copies.bar.style.top, '1300px');
});

test('body scrolling: without rootScroll the fixed header would land at scroll 0', () => {
  const { body, copies, nodeMap } = bodyScrolledTo(1500);
  pinViewportPositioned({ root: body, rootClone: copies.body, nodeMap, getStyle });
  assert.equal(copies.nav.style.top, '0px');
});

test('body scrolling: pinned header lands at sy in the crop', () => {
  for (const scrollTop of SCROLLS) {
    const { body, copies, nodeMap } = bodyScrolledTo(scrollTop);
    pinViewportPositioned({ root: body, rootClone: copies.body, nodeMap, rootScroll: { left: 0, top: scrollTop }, getStyle });
    const frame = scrollerFrame({ bodyRect: body.getBoundingClientRect(), scrollTop, scrollWidth: 1280, scrollHeight: 6000 });
    const r = viewportCropRect({ bodyRect: frame, viewportWidth: 1280, viewportHeight: 800, scale: 1, imageWidth: 1280, imageHeight: 6000 });
    assert.equal(parseFloat(copies.nav.style.top), r.sy);
    assert.equal(parseFloat(copies.foot.style.top) - r.sy, 760);
  }
});

// GeDB's body keeps its default 8px margin, so at scroll 0 the content starts
// 8px inside the viewport and a fixed header at top:0 sits 8px above it.
test('content starting inside the viewport is padded so the image starts at its edge', () => {
  for (const [W, H] of VIEWPORTS) {
    const bodyRect = { left: 8, top: 8, width: W - 16, height: H };
    const { pad, frame } = coverViewportOrigin(scrollerFrame({ bodyRect, scrollWidth: W - 16, scrollHeight: 6000 }));
    assert.deepEqual(pad, { left: 8, top: 8 });
    assert.deepEqual(frame, { left: 0, top: 0, width: W - 16, height: 6000 });
    const r = viewportCropRect({ bodyRect: frame, viewportWidth: W, viewportHeight: H, scale: 1, imageWidth: W, imageHeight: 6016 });
    assert.deepEqual([r.sx, r.sy, r.dx, r.dy, r.dw, r.dh], [0, 0, 0, 0, W, H]);
  }
});

test('no pad once the content origin is above or left of the viewport', () => {
  for (const scroll of SCROLLS.filter((y) => y >= 8)) {
    const body = coverViewportOrigin(scrollerFrame({
      bodyRect: { left: 8, top: 8, width: 1424, height: 900 }, scrollTop: scroll, scrollWidth: 1424, scrollHeight: 6000,
    }));
    assert.deepEqual(body.pad, { left: 8, top: 0 });
    assert.equal(body.frame.top, 8 - scroll);
    const doc = coverViewportOrigin(scrollerFrame({ bodyRect: { left: 0, top: -scroll, width: 1440, height: 6000 } }));
    assert.deepEqual(doc.pad, { left: 0, top: 0 });
    assert.deepEqual(doc.frame, { left: 0, top: -scroll, width: 1440, height: 6000 });
  }
});

test('the pad keeps the clamp ratio: content size is unchanged', () => {
  const { frame } = coverViewportOrigin({ left: 8, top: 8, width: 1424, height: 10000 });
  const imageHeight = 16384;
  const imageWidth = Math.round(1424 * (imageHeight / 10000));
  const r = viewportCropRect({ bodyRect: frame, viewportWidth: 1440, viewportHeight: 900, scale: 2, imageWidth, imageHeight });
  const k = Math.min(imageWidth / 1424, imageHeight / 10000);
  assert.deepEqual([r.sy, r.sh, r.dy, r.dh], [0, Math.round(900 * k), 0, 1800]);
});

test('fixed header over the body margin lands at the top of the padded image', () => {
  const body = fakeEl('body', { rect: { left: 8, top: 8, width: 1424, height: 900 } });
  const nav = fakeEl('nav', { rect: { left: 0, top: 0, width: 1440, height: 60 }, style: { position: 'fixed' }, parent: body });
  const copies = { body: fakeCopy('body'), nav: fakeCopy('nav') };
  const nodeMap = new Map([[copies.body, body], [copies.nav, nav]]);
  pinViewportPositioned({ root: body, rootClone: copies.body, nodeMap, getStyle });
  const { pad } = coverViewportOrigin(scrollerFrame({ bodyRect: body.getBoundingClientRect(), scrollHeight: 6000 }));
  assert.equal(parseFloat(copies.nav.style.top) + pad.top, 0);
  assert.equal(parseFloat(copies.nav.style.left) + pad.left, 0);
});

// A body that is its own scroller, as on a height:100%; overflow:auto page.
const scrolledBody = () => ({
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1024, height: 768 }),
  scrollTop: 1200, scrollLeft: 0, scrollHeight: 6000, scrollWidth: 1024, clientHeight: 768, clientWidth: 1024,
});
const bodyStyle = () => ({ overflowY: 'auto', overflowX: 'visible' });

test('body scrolled to 1200 inside a 1024x768 viewport, window not scrolled: crop starts 1200px down', () => {
  const body = scrolledBody();
  const html = { scrollTop: 0, scrollLeft: 0 }; // window.scrollY 0
  const g = quickCaptureGeometry({ body, scrollingElement: html, viewportWidth: 1024, viewportHeight: 768, getStyle: bodyStyle });
  assert.deepEqual(g.rootScroll, { left: 0, top: 1200 });
  assert.deepEqual(g.frame, { left: 0, top: -1200, width: 1024, height: 6000 });
  const r1 = viewportCropRect({ bodyRect: g.frame, viewportWidth: 1024, viewportHeight: 768, scale: 1, imageWidth: 1024, imageHeight: 6000 });
  assert.deepEqual([r1.outWidth, r1.outHeight], [1024, 768]);
  assert.deepEqual([r1.sy, r1.sh, r1.dy, r1.dh], [1200, 768, 0, 768]);
  const r2 = viewportCropRect({ bodyRect: g.frame, viewportWidth: 1024, viewportHeight: 768, scale: 2, imageWidth: 2048, imageHeight: 12000 });
  assert.deepEqual([r2.outWidth, r2.outHeight], [2048, 1536]);
  assert.deepEqual([r2.sy, r2.sh, r2.dy, r2.dh], [2400, 1536, 0, 1536]);
});

test('quirks mode: body is the scrollingElement, so the crop follows the body rect', () => {
  const body = { ...scrolledBody(), getBoundingClientRect: () => ({ left: 0, top: -1200, width: 1024, height: 6000 }) };
  const g = quickCaptureGeometry({ body, scrollingElement: body, viewportWidth: 1024, viewportHeight: 768, getStyle: bodyStyle });
  assert.equal(g.scroller, null);
  assert.deepEqual(g.rootScroll, { left: 0, top: 0 });
  assert.deepEqual(g.frame, { left: 0, top: -1200, width: 1024, height: 6000 });
  const r = viewportCropRect({ bodyRect: g.frame, viewportWidth: 1024, viewportHeight: 768, scale: 1, imageWidth: 1024, imageHeight: 6000 });
  assert.deepEqual([r.sy, r.sh, r.outWidth, r.outHeight], [1200, 768, 1024, 768]);
});
