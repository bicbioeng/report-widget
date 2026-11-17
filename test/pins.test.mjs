import test from 'node:test';
import assert from 'node:assert/strict';
import { pinsText, pinSummary, pinPayload, pinMarks } from '../src/pins.js';
import { feedbackPayload } from '../src/reportForm.js';

const el = (tag, text) => ({ tag, text, selector: tag, rect: { x: 0, y: 0, width: 10, height: 10 } });
const pins = [
  { n: 1, note: 'Save does nothing', point: { x: 100, y: 50 }, scroll: { x: 0, y: 0 }, element: el('button', 'Save') },
  { n: 2, note: ' wrong date ', point: { x: 10, y: 400 }, scroll: { x: 0, y: 200 }, element: el('td', '') },
];

test('pinned notes read as numbered lines naming what was clicked', () => {
  assert.equal(pinsText(pins), '1. On button “Save”: Save does nothing\n2. On td: wrong date');
});

test('the summary keeps the reporter words first, or is the notes alone', () => {
  assert.equal(pinSummary('Two problems', pins), 'Two problems\n\nPinned notes:\n1. On button “Save”: Save does nothing\n2. On td: wrong date');
  assert.equal(pinSummary('  ', pins.slice(0, 1)), '1. On button “Save”: Save does nothing');
  assert.equal(pinSummary(' just text ', []), 'just text');
});

test('marks follow the page scroll and the image scale, and drop pins off the image', () => {
  const m = pinMarks(pins, { imageWidth: 2000, imageHeight: 1000, viewportWidth: 1000, scroll: { x: 0, y: 200 } });
  // pin 1 was made at scroll 0; the page is now scrolled 200 down, so it is above the image.
  assert.deepEqual(m, [{ n: 2, x: 20, y: 800, r: 24 }]);
});

test('the payload carries pins in context and in the summary; no pins, no key', () => {
  const base = { kind: 'bug', severity: 'minor', summary: '', expected: '', steps: '', voice: null, context: { a: 1 }, pageUrl: 'u', route: '/r' };
  const withPins = feedbackPayload({ ...base, picked: { description: pins[0].element }, pins });
  assert.match(withPins.summary, /^1\. On button “Save”/);
  assert.deepEqual(withPins.context.pins, pinPayload(pins));
  assert.equal(withPins.context.element.tag, 'button');
  const without = feedbackPayload({ ...base, summary: 'x', picked: null });
  assert.equal('pins' in without.context, false);
  assert.equal(without.summary, 'x');
});
