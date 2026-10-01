// Quick capture under the scroll models. ?model=document leaves the document
// scrolling, as in KIDS and BNERC. ?model=body makes the body the scroller
// (html overflow hidden). ?model=gedb is GeDB's style.css: body and html
// height:100% !important with the body's own overflow and its default 8px
// margin; the body's overflow goes to the viewport, but a copy of the body
// keeps it and is cut off at one window height (GeDB's blank screenshot).
// ?model=fullheight is the reporter's Home page with the Report dialog open:
// html, body { height: 100% !important }, so <html> scrolls and the body box
// stays one window tall while its content runs past it, and each capture runs
// under antd's Modal scroll lock (html body { overflow-y: hidden }). The lock's
// hidden goes to the viewport, but a copy of the body keeps it and is cut off at
// one window height (BNFR-222's flat rgb(248,250,252) screenshot).
// Imports the source directly, so no package build is needed.
import { captureQuick } from '../../../src/capture.js';

const BANDS = 60;
const BAND = 100;
const HEADER = 60;
// Distinct, saturated, never-white colours per band; the header gets its own.
const bandColour = (i) => [(i * 37) % 200 + 30, (i * 71 + 90) % 200 + 20, (i * 113 + 40) % 200 + 25];
const headerColour = [20, 20, 20];
const css = (c) => `rgb(${c.join(',')})`;

const model = new URLSearchParams(location.search).get('model') || 'document';
const style = document.createElement('style');
style.textContent = {
  body: 'html, body { height: 100% !important; } html { overflow: hidden; } body { overflow: auto; margin: 0; }',
  gedb: 'body, html { height: 100% !important; } body { overflow-y: auto; }',
  fullheight: 'html, body { height: 100% !important; } body { margin: 0; background: #f8fafc; }',
}[model] || 'body { margin: 0; }';
document.head.appendChild(style);

for (let i = 0; i < BANDS; i += 1) {
  const band = document.createElement('div');
  band.style.cssText = `height:${BAND}px;width:100%;background:${css(bandColour(i))}`;
  document.body.appendChild(band);
}
const header = document.createElement('header');
header.style.cssText = `position:fixed;top:0;left:0;right:0;height:${HEADER}px;background:${css(headerColour)};z-index:10`;
document.body.appendChild(header);

window.__fixture = { model, BANDS, BAND, HEADER, bands: Array.from({ length: BANDS }, (_, i) => bandColour(i)), header: headerColour };

// Scrolls whichever of the document and the body scrolls; returns the offset.
window.__scrollTo = (y) => {
  window.scrollTo(0, y);
  document.body.scrollTop = y;
  return Math.max(window.scrollY, document.body.scrollTop);
};

// Capture, then sample it and `screen` (a page.screenshot data URL) at the
// same points: 3 columns, every 10px row.
const pixels = async (src) => {
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const at = [];
  for (let y = 0; y < window.innerHeight; y += 10) {
    for (const x of [0.25, 0.5, 0.75].map((f) => Math.floor(window.innerWidth * f))) {
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      at.push({ x, y, rgb: [r, g, b] });
    }
  }
  return { at, png: canvas.toDataURL('image/png') };
};

// What @rc-component/portal's useScrollLocker adds while an antd Modal is open
// (plus a width calc when there is a scrollbar; headless Chromium hides them).
const scrollLock = () => {
  const lock = document.createElement('style');
  lock.textContent = 'html body { overflow-y: hidden; }';
  document.head.appendChild(lock);
  return () => lock.remove();
};

window.__capture = async (screen) => {
  const unlock = model === 'fullheight' ? scrollLock() : () => {};
  let shot;
  try {
    shot = await captureQuick({ scale: 1 });
  } finally {
    unlock();
  }
  const { blob, width, height } = shot;
  const url = URL.createObjectURL(blob);
  const cap = await pixels(url);
  URL.revokeObjectURL(url);
  const scr = await pixels(screen);
  return { width, height, cap: cap.at, screen: scr.at, png: cap.png };
};
