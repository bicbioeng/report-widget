// Element pick (BICBIOENG-99). Runs against src directly with plain objects, no DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  describeElement, pickTarget, chipLabel, pickSummary, outlineRect, startElementPick,
  frameAt, scrollLockKeys, suspendScrollLocks,
} from '../src/elementPicker.js';

// Just enough of an Element: tag, attributes, tree, text, class selectors for matches().
function el(tag, { attrs = {}, text, outerHTML, rect = { x: 0, y: 0, width: 10, height: 10 } } = {}, kids = []) {
  const node = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    id: attrs.id || '',
    parentElement: null,
    children: [],
    textContent: text ?? '',
    outerHTML: outerHTML ?? `<${tag}>${text ?? ''}</${tag}>`,
    getAttribute: (n) => (n in attrs ? attrs[n] : null),
    matches: (s) => s.startsWith('.') && String(attrs.class || '').split(/\s+/).includes(s.slice(1)),
    getBoundingClientRect: () => ({ ...rect, left: rect.x, top: rect.y, right: rect.x + rect.width, bottom: rect.y + rect.height }),
  };
  for (const k of kids) { k.parentElement = node; node.children.push(k); }
  return node;
}

test('selector: an id is the whole path', () => {
  const logo = el('img', { attrs: { id: 'main-logo', class: 'logo big' } });
  el('body', {}, [el('header', {}, [logo])]);
  assert.equal(describeElement(logo).selector, '#main-logo');
});

test('selector: tag, at most two classes and nth-of-type among same-tag siblings', () => {
  const second = el('a', { attrs: { class: 'nav-link active extra' } });
  const nav = el('nav', {}, [el('a', { attrs: { class: 'nav-link' } }), second, el('span')]);
  el('body', {}, [nav]);
  assert.equal(describeElement(second).selector, 'nav > a.nav-link.active:nth-of-type(2)');
});

test('selector: starts at the nearest ancestor id and walks up at most 5 levels', () => {
  const link = el('a', { attrs: { class: 'nav-link' } });
  el('div', { attrs: { id: 'site-nav' } }, [link]);
  assert.equal(describeElement(link).selector, '#site-nav > a.nav-link');

  let deep = el('b');
  const leaf = deep;
  for (let i = 0; i < 8; i += 1) deep = el('div', {}, [deep]);
  el('main', { attrs: { id: 'far' } }, [deep]);
  const parts = describeElement(leaf).selector.split(' > ');
  assert.equal(parts.length, 6, 'the element and 5 ancestors');
  assert.ok(!parts.includes('#far'));
});

test('text is collapsed, clipped to 200, and classes capped at 8', () => {
  assert.equal(describeElement(el('a', { text: '  Docs\n\n  page ' })).text, 'Docs page');
  assert.equal(describeElement(el('p', { text: 'x'.repeat(500) })).text.length, 200);
  assert.equal(describeElement(el('div')).text, null);
  const many = el('div', { attrs: { class: 'a b c d e f g h i j' } });
  assert.deepEqual(describeElement(many).classes, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
});

test('a link is described with its tag, text, target, label and rect', () => {
  const docs = el('a', {
    attrs: { href: '#docs', class: 'nav-link', 'aria-label': 'Documentation', role: 'link' },
    text: 'Docs',
    rect: { x: 10.4, y: 20.6, width: 99.5, height: 0.2 },
  });
  const d = describeElement(docs);
  assert.equal(d.tag, 'a');
  assert.equal(d.id, null);
  assert.equal(d.text, 'Docs');
  assert.equal(d.href, '#docs');
  assert.equal(d.ariaLabel, 'Documentation');
  assert.equal(d.role, 'link');
  assert.equal(d.alt, null);
  assert.deepEqual(d.rect, { x: 10, y: 21, width: 100, height: 0 });
});

test('typed form values and token- or password-like attributes are not in html', () => {
  const form = el('form', {
    outerHTML: '<form data-token="t0k" data-auth-token="abc" api-key="k3y" password="p4ss" class="f">'
      + '<input name="q" value="secret" type="text"><input type="password" value="hunter2"/>'
      + '<textarea name="note">typed secret note</textarea>'
      + '<select name="s"><option value="opt-secret" selected>One</option></select></form>',
  });
  const { html } = describeElement(form);
  for (const s of ['secret', 'hunter2', 't0k', 'abc', 'k3y', 'p4ss', 'selected', 'data-token', 'data-auth-token', 'api-key', 'password=']) {
    assert.ok(!html.includes(s), `${s} is not in ${html}`);
  }
  assert.match(html, /<input name="q" type="text">/);
  assert.match(html, /<textarea name="note"><\/textarea>/);
  assert.match(html, /class="f"/);
  assert.equal(describeElement(el('textarea', { text: 'typed' })).text, null);
});

test('html is never longer than 2000 characters', () => {
  const big = el('div', { outerHTML: `<div>${'<span class="x">hello</span>'.repeat(500)}</div>` });
  assert.ok(describeElement(big).html.length <= 2000);
  const cut = el('div', { outerHTML: `<div>${'a'.repeat(7990)}<input value="secret-cut-off-here" name="n"></div>` });
  assert.ok(!describeElement(cut).html.includes('secret'));
});

test('pickTarget rejects html, body and the widget, and returns an ordinary link', () => {
  const link = el('a', { attrs: { href: '#docs' } });
  const fabIcon = el('span');
  const dialogBtn = el('button');
  const layer = el('div', { attrs: { class: 'kf-root kf-picker' } });
  const body = el('body', {}, [
    el('nav', {}, [link]),
    el('div', { attrs: { class: 'kids-feedback-root' } }, [el('button', {}, [fabIcon])]),
    el('div', { attrs: { class: 'kf-root' } }, [el('div', {}, [dialogBtn])]),
    layer,
  ]);
  const html = el('html', {}, [body]);
  assert.equal(pickTarget(html), null);
  assert.equal(pickTarget(body), null);
  assert.equal(pickTarget(fabIcon), null, 'the Report button');
  assert.equal(pickTarget(dialogBtn), null, 'the Report dialog');
  assert.equal(pickTarget(layer), null, 'the pick layer');
  assert.equal(pickTarget(link), link);
  assert.equal(pickTarget({ nodeType: 3, parentElement: link }), link, 'a text node picks its element');
});

test('chipLabel names the element by text, then aria-label, alt, then tag', () => {
  assert.equal(chipLabel(describeElement(el('a', { text: 'Docs' }))), 'Element: a “Docs”');
  assert.equal(chipLabel(describeElement(el('span', { attrs: { 'aria-label': 'Fixture logo', role: 'img' } }))), 'Element: span “Fixture logo”');
  assert.equal(chipLabel(describeElement(el('img', { attrs: { alt: 'Logo' } }))), 'Element: img “Logo”');
  const long = chipLabel(describeElement(el('p', { text: 'word '.repeat(30) })));
  assert.ok(long.endsWith('…”'));
  assert.equal(long.length, 'Element: p “'.length + 40 + 1);
  assert.equal(chipLabel(describeElement(el('div'))), 'Element: div');
  const docs = el('a', { attrs: { id: 'docs' }, text: 'Docs' });
  assert.equal(pickSummary(describeElement(docs)), '#docs “Docs”', "the 'What gets included' line");
});

test('outlineRect scales to the shot and clamps to the image', () => {
  const geo = { imageWidth: 2880, imageHeight: 1600, viewportWidth: 1440 };
  assert.deepEqual(outlineRect({ x: 100, y: 50, width: 80, height: 20 }, geo), { x: 200, y: 100, width: 160, height: 40 });
  assert.deepEqual(outlineRect({ x: 1400, y: 50, width: 200, height: 20 }, geo), { x: 2800, y: 100, width: 80, height: 40 });
  assert.equal(outlineRect({ x: 100, y: 2000, width: 80, height: 20 }, geo), null, 'scrolled off: nothing to draw');
});

// A document and window that record listeners and dispatch to them.
function fakePage() {
  const listeners = [];
  const win = {
    innerWidth: 1440,
    innerHeight: 900,
    addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }),
    removeEventListener: (type, fn, capture) => {
      const i = listeners.findIndex((l) => l.type === type && l.fn === fn && l.capture === capture);
      if (i >= 0) listeners.splice(i, 1);
    },
  };
  const node = (tag) => {
    const n = {
      nodeType: 1, tagName: tag.toUpperCase(), className: '', style: {}, children: [], parentNode: null, parentElement: null, attrs: {},
      setAttribute: (k, v) => { n.attrs[k] = v; },
      getAttribute: (k) => n.attrs[k] ?? null,
      appendChild: (c) => { c.parentNode = n; c.parentElement = n; n.children.push(c); return c; },
      removeChild: (c) => { n.children.splice(n.children.indexOf(c), 1); c.parentNode = null; c.parentElement = null; return c; },
      matches: (s) => s.startsWith('.') && String(n.className).split(/\s+/).includes(s.slice(1)),
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    };
    return n;
  };
  const body = node('body');
  const all = (n) => [n, ...n.children.flatMap(all)];
  const doc = { body, createElement: node, querySelectorAll: (q) => all(body).filter((n) => q.split(/,\s*/).includes(n.tagName.toLowerCase())) };
  const event = (type, target, extra = {}) => ({
    type, target, ...extra,
    preventDefault() { this.prevented = true; },
    stopPropagation() { this.stopped = true; },
  });
  const fire = (type, target, extra) => {
    const e = event(type, target, extra);
    for (const l of listeners.filter((x) => x.type === type)) l.fn(e);
    return e;
  };
  const link = body.appendChild(node('a'));
  link.setAttribute('href', '#docs');
  link.textContent = 'Docs';
  link.outerHTML = '<a href="#docs">Docs</a>';
  link.getBoundingClientRect = () => ({ left: 40, top: 60, right: 90, bottom: 80, x: 40, y: 60, width: 50, height: 20 });
  const fab = body.appendChild(node('div'));
  fab.className = 'kids-feedback-root';
  const fabButton = fab.appendChild(node('button'));
  return { win, doc, body, link, fabButton, listeners, fire, layer: () => body.children.find((c) => c.className === 'kf-root kf-picker') };
}

test('pick session: clicking a page element resolves it, swallows the click and cleans up', async () => {
  const p = fakePage();
  const pick = startElementPick({ doc: p.doc, win: p.win });
  const layer = p.layer();
  assert.ok(layer, 'the pick layer is on the page');
  assert.ok(p.listeners.length > 0 && p.listeners.every((l) => l.capture === true), 'capture-phase listeners');
  const banner = layer.children.find((c) => c.className.startsWith('kf-picker-banner'));
  assert.equal(banner.attrs.role, 'status');
  assert.match(banner.children[0].textContent, /Click an element to attach it · Esc to cancel/);

  p.fire('pointermove', p.link);
  const box = layer.children.find((c) => c.className === 'kf-picker-box');
  assert.deepEqual([box.style.display, box.style.left, box.style.width], ['block', '40px', '50px']);
  const down = p.fire('pointerdown', p.link);
  assert.ok(down.prevented && down.stopped);
  const click = p.fire('click', p.link);
  assert.ok(click.prevented, 'the link does not navigate');
  assert.ok(click.stopped, 'the host handler does not run');

  const r = await pick;
  assert.equal(r.element, p.link);
  assert.equal(r.description.tag, 'a');
  assert.equal(r.description.text, 'Docs');
  assert.equal(r.description.href, '#docs');
  assert.deepEqual(r.description.rect, { x: 40, y: 60, width: 50, height: 20 });
  assert.equal(p.listeners.length, 0, 'every listener is removed');
  assert.equal(p.layer(), undefined, 'the pick layer is gone');
});

test('pick session: a click on the widget does not end it, Esc resolves null and is stopped', async () => {
  const p = fakePage();
  let settled = false;
  const pick = startElementPick({ doc: p.doc, win: p.win }).then((r) => { settled = true; return r; });
  const onFab = p.fire('click', p.fabButton);
  assert.ok(onFab.prevented && onFab.stopped, 'a click on the Report button is swallowed');
  p.fire('click', p.layer());
  await Promise.resolve();
  assert.equal(settled, false, 'still picking');
  assert.ok(p.layer());

  p.fire('keydown', p.link, { key: 'a' });
  await Promise.resolve();
  assert.equal(settled, false);
  const esc = p.fire('keydown', p.link, { key: 'Escape' });
  assert.ok(esc.stopped, 'the hidden Report dialog does not see Esc');
  assert.equal(await pick, null);
  assert.equal(p.listeners.length, 0);
  assert.equal(p.layer(), undefined);
});

test("pick session: the banner's Cancel resolves null and cleans up", async () => {
  const p = fakePage();
  const pick = startElementPick({ doc: p.doc, win: p.win });
  const banner = p.layer().children.find((c) => c.className.startsWith('kf-picker-banner'));
  const cancel = banner.children.find((c) => c.className === 'kf-picker-cancel');
  assert.equal(cancel.textContent, 'Cancel');
  const down = p.fire('pointerdown', cancel);
  assert.ok(!down.prevented, 'the press reaches the Cancel button');
  p.fire('click', cancel);
  assert.equal(await pick, null);
  assert.equal(p.listeners.length, 0);
  assert.equal(p.layer(), undefined);
});

test('pick session: touch shows the tap hint, and an abort signal ends it', async () => {
  const p = fakePage();
  p.win.matchMedia = (q) => ({ matches: q.includes('coarse') });
  const ac = new AbortController();
  const pick = startElementPick({ doc: p.doc, win: p.win, signal: ac.signal });
  const banner = p.layer().children.find((c) => c.className.startsWith('kf-picker-banner'));
  assert.equal(banner.children[0].textContent, 'Tap an element to attach it');
  ac.abort();
  assert.equal(await pick, null);
  assert.equal(p.listeners.length, 0);
  assert.equal(p.layer(), undefined);
});

test('pick session: a press over an iframe picks the iframe, not its contents', async () => {
  const p = fakePage();
  const box = p.body.appendChild((() => { const d = p.doc.createElement('div'); return d; })());
  const frame = box.appendChild(p.doc.createElement('iframe'));
  frame.setAttribute('src', 'https://other.example/embed');
  frame.outerHTML = '<iframe src="https://other.example/embed"></iframe>';
  frame.getBoundingClientRect = () => ({ left: 100, top: 200, right: 500, bottom: 400, x: 100, y: 200, width: 400, height: 200 });
  const pick = startElementPick({ doc: p.doc, win: p.win });
  const style = p.layer().children.find((c) => c.tagName === 'STYLE');
  assert.match(style.textContent, /iframe[^{]*\{\s*pointer-events:\s*none !important/, 'frames let presses fall through while picking');

  // With pointer-events off, the browser targets the frame's container.
  assert.equal(frameAt(p.doc, 50, 50, box), null, 'outside the frame');
  assert.equal(frameAt(p.doc, 300, 300, p.link), null, 'target does not contain the frame');
  p.fire('pointermove', box, { clientX: 300, clientY: 300 });
  const hl = p.layer().children.find((c) => c.className === 'kf-picker-box');
  assert.deepEqual([hl.style.left, hl.style.width], ['100px', '400px'], 'the frame is highlighted');
  const click = p.fire('click', box, { clientX: 300, clientY: 300 });
  assert.ok(click.prevented && click.stopped);
  const r = await pick;
  assert.equal(r.element, frame);
  assert.equal(r.description.tag, 'iframe');
  assert.equal(p.listeners.length, 0);
  assert.equal(p.layer(), undefined, 'the layer, and the pointer-events rule with it, is gone');
});

test('scroll locks: only the given locks are switched off, and restored after', () => {
  const lock = (key, media) => {
    const attrs = { 'rc-util-key': key, ...(media ? { media } : {}) };
    return {
      attrs,
      getAttribute: (k) => attrs[k] ?? null,
      setAttribute: (k, v) => { attrs[k] = v; },
      removeAttribute: (k) => { delete attrs[k]; },
    };
  };
  const host = lock('rc-util-locker-1_1');
  const ours = lock('rc-util-locker-1_2');
  const printOnly = lock('rc-util-locker-1_3', 'print');
  const doc = { querySelectorAll: (q) => (q === 'style[rc-util-key^="rc-util-locker-"]' ? [host, ours, printOnly] : []) };
  assert.deepEqual(scrollLockKeys(doc), ['rc-util-locker-1_1', 'rc-util-locker-1_2', 'rc-util-locker-1_3']);

  const before = ['rc-util-locker-1_1']; // the host Modal was open before the Report dialog
  const restore = suspendScrollLocks(scrollLockKeys(doc).filter((k) => !before.includes(k)), doc);
  assert.equal(ours.attrs.media, 'not all', "the Report dialog's lock is off");
  assert.equal(printOnly.attrs.media, 'not all');
  assert.equal(host.attrs.media, undefined, "the host's lock stays on");
  restore();
  assert.equal('media' in ours.attrs, false);
  assert.equal(printOnly.attrs.media, 'print');
  assert.equal(host.attrs.media, undefined);
});
