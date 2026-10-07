// "What gets included" popover legibility (BNFR-230). Reads src/styles.css directly, no build needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const jsx = readFileSync(new URL('../src/FeedbackModal.jsx', import.meta.url), 'utf8');

// Flat rules only; selectors are matched exactly (whitespace-normalised). Later declarations win.
function decls(selector) {
  const out = {};
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (sel.trim().replace(/\s+/g, ' ') !== selector) continue;
    for (const d of body.split(';')) {
      const i = d.indexOf(':');
      if (i > 0) out[d.slice(0, i).trim()] = d.slice(i + 1).replace(/!important/, '').trim();
    }
  }
  return out;
}

const LIGHT = '.kids-feedback-root, .kids-feedback-pill, .kf-root, .kf-pop, .fi-page, .fi-drawer';
const DARK = ':root[data-theme="dark"] :is(.kids-feedback-root, .kids-feedback-pill, .kf-root, .kf-pop, .fi-page, .fi-drawer)';
const themes = { light: decls(LIGHT), dark: { ...decls(LIGHT), ...decls(DARK) } };

const resolve = (v, tokens) => v.replace(/var\((--[\w-]+)\)/g, (_, name) => {
  assert.ok(tokens[name], `token ${name} is defined`);
  return resolve(tokens[name], tokens);
});

function rgba(v) {
  let m = v.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  m = v.match(/^rgba?\(([^)]+)\)$/);
  assert.ok(m, `parseable colour: ${v}`);
  const [r, g, b, a = 1] = m[1].split(',').map(Number);
  return [r, g, b, a];
}

const lum = ([r, g, b]) => {
  const c = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
};
function contrast(fg, bg) {
  const [r, g, b, a] = fg;
  const mixed = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
  const [hi, lo] = [lum(mixed), lum(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const inner = decls('.kf-pop .ant-popover-inner');
const arrow = decls('.kf-pop .ant-popover-arrow::before');
const desc = decls('.kf-pop .kf-context .ant-typography-secondary');
const pre = decls('.kf-pop .kf-context pre');

for (const [name, tokens] of Object.entries(themes)) {
  test(`${name}: popover panel and arrow are opaque, with no backdrop blur`, () => {
    const panel = rgba(resolve(inner.background, tokens));
    assert.equal(panel[3], 1);
    assert.deepEqual(rgba(resolve(arrow.background, tokens)), panel);
    assert.equal(inner['backdrop-filter'], 'none');
    assert.equal(inner['-webkit-backdrop-filter'], 'none');
  });

  test(`${name}: popover description and title reach 7:1 on the panel`, () => {
    const panel = rgba(resolve(inner.background, tokens));
    const ratio = contrast(rgba(resolve(desc.color, tokens)), panel);
    assert.ok(ratio >= 7, `description ${ratio.toFixed(2)}:1`);
    const title = contrast(rgba(resolve(decls('.kf-pop .ant-popover-title').color, tokens)), panel);
    assert.ok(title >= 7, `title ${title.toFixed(2)}:1`);
  });

  test(`${name}: popover JSON reaches 7:1 on its dark block`, () => {
    const ratio = contrast(rgba(resolve(pre.color, tokens)), rgba(resolve(pre.background, tokens)));
    assert.ok(ratio >= 7, `JSON ${ratio.toFixed(2)}:1`);
  });
}

test('popover JSON is 12.5px with line-height >= 1.45 and still scrolls', () => {
  assert.equal(pre['font-size'], '12.5px');
  assert.ok(Number(pre['line-height']) >= 1.45);
  const shared = decls('.kf-context pre');
  assert.equal(shared['max-height'], '220px');
  assert.equal(shared.overflow, 'auto');
});

test('shared diagnostics pre keeps its look', () => {
  const shared = decls('.kf-context pre');
  assert.equal(shared['font-size'], '11.5px');
  assert.equal(shared.color, '#e2e8f0');
});

test('popover description is 13px and the content is capped to the viewport', () => {
  assert.match(jsx, /<Text type="secondary" style=\{\{ fontSize: 13 \}\}>Sent with the report/);
  assert.match(jsx, /className="kf-context" style=\{\{ maxWidth: 'min\(420px, calc\(100vw - 32px\)\)' \}\}/);
});
