// Proof for 1.1: Report over an antd Modal and a masked Drawer, and "Problem with this form?".
// npm run build && npx vite preview --port 4817, then:
//   PLAYWRIGHT=/path/to/node_modules/playwright SHOTS=/some/dir node overlays.e2e.cjs
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');

const BASE = process.env.BASE || 'http://localhost:4817';
const SHOTS = process.env.SHOTS; // screenshots are skipped when unset
const log = (...a) => console.log(...a);

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(`${BASE}/overlays.html`);
  await page.waitForSelector('.kids-feedback-fab');

  const shot = (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}` });
  const settle = () => page.waitForTimeout(600); // antd enter/leave motions
  // What is at the centre of `sel`? Returns { hit, rect } where hit says whether elementFromPoint lands in `sel`.
  const probe = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2; const y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return { x, y, hit: el.contains(top), top: `${top.tagName.toLowerCase()}.${String(top.className).split(' ').slice(0, 2).join('.')}`, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom } };
  }, sel);
  const reportOpen = () => page.evaluate(() => { const w = document.querySelector('.kids-feedback-modal-wrap'); return !!w && getComputedStyle(w).display !== 'none' && !!w.querySelector('.kf-head'); });
  const hostModalOpen = () => page.evaluate(() => [...document.querySelectorAll('.ant-modal-wrap')].some((w) => w.textContent.includes('Host modal') && getComputedStyle(w).display !== 'none'));
  const drawerOpen = () => page.evaluate(() => !!document.querySelector('.ant-drawer-open .ant-drawer-content-wrapper'));
  const closeReport = async () => { await page.click('.kids-feedback-modal-wrap button[aria-label="Close"]'); await settle(); assert.equal(await reportOpen(), false); };
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

  // Read the actual attachment pixels, rather than the scaled thumbnail.
  const pixels = () => page.evaluate(async () => {
    const img = document.querySelector('.kf-shot img');
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return { width: canvas.width, height: canvas.height,
      data: Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data) };
  });
  const firstScreenshot = async (host = false) => {
    await page.waitForSelector('.kf-shot img', { timeout: 30000 });
    const first = await pixels();
    const scale = first.width / 1280;
    // Empty page background, or white interior of the host Modal.
    const point = host ? await page.evaluate(() => {
      const r = [...document.querySelectorAll('.ant-modal-content')]
        .find((el) => el.textContent.includes('Host modal')).getBoundingClientRect();
      return { x: r.left + 30, y: r.top + 65 };
    }) : { x: 100, y: 300 };
    const offset = (Math.round(point.y * scale) * first.width + Math.round(point.x * scale)) * 4;
    assert.ok(first.data.slice(offset, offset + 3).every((v) => v >= 250),
      'first screenshot retains the white background without the report mask tint');
    // Remove it, then take the manual one ("Take screenshot" shows only without a shot).
    await page.click('.kf-shot-actions button.ant-btn-dangerous');
    await page.click('button:has-text("Take screenshot")');
    await page.waitForFunction(() => document.querySelector('.kf-shot img')?.complete, null, { timeout: 30000 });
    const manual = await pixels();
    assert.equal(first.width, manual.width);
    assert.equal(first.height, manual.height);
    // Compare page heading and small button text, or host title/body text.
    const rect = host ? await page.evaluate(() => {
      const r = [...document.querySelectorAll('.ant-modal-content')]
        .find((el) => el.textContent.includes('Host modal')).getBoundingClientRect();
      return { x: r.left + 24, y: r.top + 20, w: 420, h: 100 };
    }) : { x: 24, y: 24, w: 320, h: 120 };
    let difference = 0; let samples = 0; let dark = 0;
    for (let y = Math.round(rect.y * scale); y < (rect.y + rect.h) * scale; y++) {
      for (let x = Math.round(rect.x * scale); x < (rect.x + rect.w) * scale; x++) {
        const i = (y * first.width + x) * 4;
        if (manual.data[i] < 180) dark++;
        for (let c = 0; c < 3; c++) {
          difference += Math.abs(first.data[i + c] - manual.data[i + c]); samples++;
        }
      }
    }
    assert.ok(dark > 100, 'comparison includes text');
    assert.ok(difference / samples < 2, `first screenshot matches sharp retake: ${difference / samples}`);
    await settle();
    assert.ok(await reportOpen(), 'report remains visible after capture');
    assert.ok((await probe('.kf-textarea textarea')).hit, 'report field receives clicks');
    await page.fill('.kf-textarea textarea', 'Screenshot is sharp');
    assert.equal(await page.inputValue('.kf-textarea textarea'), 'Screenshot is sharp');
    await page.fill('.kf-textarea textarea', '');
    log(`[first screenshot] ${host ? 'host modal' : 'plain page'} colours, sharpness and form passed`);
  };

  await page.click('.kids-feedback-fab');
  await firstScreenshot();
  // Decoding both screenshots can slow the leave motion past settle().
  await page.click('.kids-feedback-modal-wrap button[aria-label="Close"]');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.kids-feedback-modal-wrap')).display === 'none');
  // A fresh form is needed: closing intentionally preserves the draft/shot.
  await page.reload();
  await page.waitForSelector('.kids-feedback-fab');

  // 1. Modal open → Report reachable, host modal stays open.
  await page.click('#open-modal'); await settle();
  let fab = await probe('.kids-feedback-fab');
  log('[modal] elementFromPoint at FAB centre', fab);
  assert.ok(fab.hit, 'FAB is the top element over the host modal mask');
  const modalFooter = await probe('.ant-modal-footer #modal-send');
  log('[modal] elementFromPoint at host modal Send', modalFooter);
  assert.ok(modalFooter.hit, 'host modal Send is not covered');
  await shot('01-modal-open-fab-visible.png');
  await page.mouse.click(fab.x, fab.y); await settle();
  log('[modal] after FAB click: reportOpen', await reportOpen(), 'hostModalOpen', await hostModalOpen());
  assert.ok(await reportOpen(), 'report modal opened');
  assert.ok(await hostModalOpen(), 'host modal still open');
  await firstScreenshot(true);
  await shot('02-modal-report-opened-over-modal.png');
  const under = await probe('.kids-feedback-fab');
  log('[modal] with the report modal open, elementFromPoint at FAB centre', under.top, 'hit FAB:', under.hit);
  assert.equal(under.hit, false, 'FAB stays below the report modal mask');
  await closeReport();
  assert.ok(await hostModalOpen(), 'host modal still open after closing report');
  await page.keyboard.press('Alt+Shift+F'); await settle();
  log('[modal] Alt+Shift+F: reportOpen', await reportOpen(), 'hostModalOpen', await hostModalOpen());
  assert.ok(await reportOpen()); assert.ok(await hostModalOpen());
  await closeReport();
  await page.click('#modal-cancel'); await settle();
  assert.equal(await hostModalOpen(), false);

  // 2. Masked right drawer open → Report reachable, drawer stays open, FAB off the panel.
  await page.click('#open-drawer'); await settle();
  fab = await probe('.kids-feedback-fab');
  const panel = await page.evaluate(() => { const r = document.querySelector('.ant-drawer-open .ant-drawer-content-wrapper').getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; });
  log('[drawer] elementFromPoint at FAB centre', fab, 'drawer panel', panel);
  assert.ok(fab.hit, 'FAB is the top element over the drawer mask');
  assert.equal(overlaps(fab.rect, panel), false, 'FAB does not overlap the drawer panel');
  // 3. Drawer footer Send still clickable.
  const send = await probe('#drawer-send');
  log('[drawer] elementFromPoint at drawer footer Send', send);
  assert.ok(send.hit, 'drawer Send is the top element at its centre');
  await shot('03-drawer-open-fab-offset.png');
  await page.mouse.click(send.x, send.y);
  const clicks = await page.evaluate(() => window.__clicks);
  log('[drawer] clicks after Send', clicks, 'drawerOpen', await drawerOpen());
  assert.deepEqual(clicks, ['drawer-send']);
  assert.ok(await drawerOpen());
  await page.mouse.click(fab.x, fab.y); await settle();
  log('[drawer] after FAB click: reportOpen', await reportOpen(), 'drawerOpen', await drawerOpen());
  assert.ok(await reportOpen(), 'report modal opened over drawer');
  assert.ok(await drawerOpen(), 'drawer still open');
  await shot('04-drawer-report-opened-over-drawer.png');
  await closeReport();
  assert.ok(await drawerOpen(), 'drawer still open after closing report');
  await page.keyboard.press('Alt+Shift+F'); await settle();
  log('[drawer] Alt+Shift+F: reportOpen', await reportOpen(), 'drawerOpen', await drawerOpen());
  assert.ok(await reportOpen()); assert.ok(await drawerOpen());
  await closeReport();
  await page.click('#drawer-cancel'); await settle();
  assert.equal(await drawerOpen(), false);
  fab = await probe('.kids-feedback-fab');
  const vw = await page.evaluate(() => document.documentElement.clientWidth);
  log('[drawer] FAB back in the corner after close', fab.rect, 'viewport', vw);
  assert.ok(Math.abs(vw - fab.rect.right - 22) < 1, 'FAB returns to right: 22px');

  // 4. "Problem with this form?": submit fails → link in error state → report-tool sent via stub.
  await page.mouse.click(fab.x, fab.y); await settle();
  await page.fill('.kf-textarea textarea', 'The table is empty');
  await page.evaluate(() => { window.__failSubmit = true; });
  await page.click('.kf-footer button.ant-btn-primary');
  await page.waitForSelector('.kf-error');
  const errText = await page.textContent('.kf-error');
  log('[problem] error state:', errText);
  assert.match(errText, /not sent: stub: submit failed/);
  await shot('05-submit-failed-error-state.png');
  await page.click('.kf-error .kf-link'); await settle();
  assert.equal(await page.textContent('.kf-head h3'), 'Problem with this form');
  await page.fill('.kf-problem textarea', 'Send report did nothing');
  await page.click('.kf-problem .ant-collapse-header'); await settle();
  await shot('06-problem-form-with-diagnostics.png');
  await page.evaluate(() => { window.__failSubmit = false; });
  await page.click('.kf-footer button.ant-btn-primary'); await settle();
  const sent = await page.evaluate(() => window.__reports);
  const p = sent[0];
  log('[problem] stub received', JSON.stringify({ kind: p.kind, summary: p.summary, state: p.context.diagnostics.state, lastError: p.context.diagnostics.lastError.message, stage: p.context.diagnostics.lastError.stage, version: p.context.diagnostics.widgetVersion, formSummary: p.context.diagnostics.form.summary, viewport: p.context.diagnostics.viewport, browser: p.context.diagnostics.browser.name }));
  assert.equal(sent.length, 1);
  assert.equal(p.kind, 'report-tool');
  assert.equal(p.summary, 'Report tool: Send report did nothing');
  assert.equal(p.context.diagnostics.state, 'submit-failed');
  assert.equal(p.context.diagnostics.lastError.stage, 'submit');
  assert.equal(p.context.diagnostics.lastError.message, 'stub: submit failed');
  assert.equal(p.context.diagnostics.form.summary, 'The table is empty');
  assert.equal(p.context.diagnostics.widgetVersion, '1.1.0');
  assert.ok(p.context.diagnostics.viewport.width > 0 && p.context.diagnostics.browser.name);
  assert.match(await page.textContent('.kf-problem'), /Thanks, the team will look at the form itself \(FIX-1\)/);
  await shot('07-problem-sent.png');

  // 5. Footer link, and the copy fallback when the report-tool submit fails too.
  await page.click('text=Back to my report'); await settle();
  await page.click('.kf-included .kf-link'); await settle();
  await page.evaluate(() => { window.__failSubmit = true; });
  await page.fill('.kf-problem textarea', 'Still broken');
  await page.click('.kf-footer button.ant-btn-primary'); await settle();
  const copyText = await page.inputValue('textarea.kf-copy');
  await page.click('.kf-problem .ant-alert button'); await settle();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  log('[problem] copy fallback: textarea chars', copyText.length, 'clipboard matches', clip === copyText);
  assert.equal(JSON.parse(copyText).summary, 'Report tool: Still broken');
  assert.equal(JSON.parse(copyText).context.diagnostics.form.summary, 'The table is empty');
  assert.equal(clip, copyText);
  await shot('08-problem-failed-copy-fallback.png');

  log('[page errors]', pageErrors);
  assert.deepEqual(pageErrors, []);
  await browser.close();
  log('ALL ASSERTIONS PASSED');
})().catch((e) => { console.error(e); process.exit(1); });
