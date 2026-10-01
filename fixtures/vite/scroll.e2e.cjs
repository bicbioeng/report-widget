// Proof for BNFR-207 and BNFR-222: the quick screenshot is what is on screen,
// whether the document scrolls (KIDS, BNERC), the body does, GeDB's body/html
// height:100% style is in place, or html and body are both height:100% so <html>
// scrolls and the Report dialog's antd scroll lock is on (fullheight, the
// reporter's Home page). Each capture is compared with page.screenshot.
// npx vite build && npx vite preview --port 4817, then:
//   PLAYWRIGHT=/path/to/node_modules/playwright SHOTS=/some/dir node scroll.e2e.cjs
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const BASE = process.env.BASE || 'http://localhost:4817';
const SHOTS = process.env.SHOTS; // screenshots are skipped when unset
const log = (...a) => console.log(...a);
const TOL = 8;
const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= TOL);
const isWhite = (c) => c.every((v) => v >= 250);

(async () => {
  const browser = await chromium.launch();
  const failures = [];
  let runs = 0;
  for (const model of ['fullheight', 'gedb', 'body', 'document']) {
    for (const width of [1440, 878, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await page.goto(`${BASE}/scroll.html?model=${model}`);
      await page.waitForFunction(() => typeof window.__capture === 'function');
      for (const scroll of [0, 300, 900, 3000]) {
        const tag = `${model} ${width}x900 @${scroll}`;
        runs += 1;
        try {
          const actual = await page.evaluate((y) => window.__scrollTo(y), scroll);
          assert.equal(actual, scroll, `${tag}: scrolled`);
          await page.waitForTimeout(100);
          const screen = `data:image/png;base64,${(await page.screenshot()).toString('base64')}`;
          const { width: w, height: h, cap, screen: scr, png } = await page.evaluate((src) => window.__capture(src), screen);
          const vp = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
          if (SHOTS) {
            fs.writeFileSync(`${SHOTS}/scroll-${model}-${width}-${scroll}.png`, Buffer.from(png.split(',')[1], 'base64'));
            fs.writeFileSync(`${SHOTS}/scroll-${model}-${width}-${scroll}-page.png`, Buffer.from(screen.split(',')[1], 'base64'));
          }
          assert.deepEqual([w, h], vp, `${tag}: capture is innerWidth x innerHeight`);
          const bad = [];
          cap.forEach(({ x, y, rgb }, i) => {
            const want = scr[i].rgb;
            // Every sampled column is covered by a band or the header on screen.
            if (isWhite(want)) bad.push(`(${x},${y}) white on screen`);
            else if (isWhite(rgb)) bad.push(`(${x},${y}) white, screen ${want}`);
            else if (!near(rgb, want)) bad.push(`(${x},${y}) got ${rgb}, screen ${want}`);
          });
          assert.equal(bad.length, 0, `${tag}: ${bad.length}/${cap.length} samples wrong: ${bad.slice(0, 5).join('; ')}`);
          assert.deepEqual(pageErrors, [], `${tag}: page errors`);
          log(`ok   ${tag}: ${w}x${h}, ${cap.length} samples match the screen`);
        } catch (e) {
          failures.push(e.message);
          log(`FAIL ${e.message}`);
        }
      }
      await page.close();
    }
  }
  await browser.close();
  if (failures.length) {
    log(`\n${failures.length}/${runs} combinations failed`);
    process.exit(1);
  }
  log(`\nALL ASSERTIONS PASSED (${runs} combinations)`);
})().catch((e) => { console.error(e); process.exit(1); });
