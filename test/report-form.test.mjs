// Element pick in the report (BICBIOENG-105): offered, attached, sent.
// Voice text in the main field, sent once (BICBIOENG-111). Runs against src, no DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickOffer, feedbackPayload, mergeTranscript, createVoiceRun, trackSegment, SUMMARY_MAX_LENGTH } from '../src/reportForm.js';
import { createKidsTransport } from '../src/adapters/kids.js';
import { createReadsGraphqlTransport } from '../src/adapters/reads-graphql.js';

// The shape describeElement returns.
const description = {
  tag: 'h2', id: null, classes: ['title'], selector: 'main > h2.title', text: 'Samples',
  ariaLabel: null, role: null, href: null, alt: null, rect: { x: 10, y: 20, width: 300, height: 40 }, html: '<h2 class="title">Samples</h2>',
};
const picked = { description };
const shot = { url: 'blob:x', blob: null };
const form = {
  kind: 'bug', severity: 'minor', summary: '  Table is empty ', expected: '', steps: '', voice: null,
  context: { buildSha: 'abc', errors: [] }, pageUrl: 'https://x/a', route: '/a',
};
const json = (status, body) => ({ ok: status < 400, status, json: async () => body });

test('Report dialog offers element-pick', () => {
  const none = pickOffer({ shot: null, picked: null, capturing: false, hidden: false });
  assert.deepEqual(none, { label: 'Pick an element', disabled: false, placement: 'actions', row: false, chip: false });

  const withShot = pickOffer({ shot, picked: null, capturing: false, hidden: false });
  assert.equal(withShot.label, 'Pick an element');
  assert.equal(withShot.placement, 'row');
  assert.equal(withShot.row, true);

  assert.equal(pickOffer({ shot: null, picked: null, capturing: true, hidden: false }).disabled, true);
  assert.equal(pickOffer({ shot: null, picked: null, capturing: false, hidden: true }).disabled, true);

  const after = pickOffer({ shot, picked, capturing: false, hidden: false });
  assert.equal(after.label, 'Pick again');
  assert.equal(after.chip, true);
  assert.equal(after.row, true);
});

test('a picked element is attached to the report', () => {
  const p = feedbackPayload({ ...form, picked });
  assert.deepEqual(p.context.element, description);
  assert.equal(p.context.buildSha, 'abc');
  assert.deepEqual(p.context.errors, []);
  assert.equal(p.summary, 'Table is empty');
  assert.equal(p.expected, null);
  assert.equal(p.severity, 'minor');

  assert.equal(feedbackPayload({ ...form, picked: null }).context.element, null);
  assert.equal(feedbackPayload({ ...form, kind: 'idea', picked }).severity, null);
});

test('the picked element is sent through the transport', async (t) => {
  const realFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = realFetch; });
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return json(200, { id: 1, ticketKey: 'KIDS-1', data: { submitFeedback: { id: '1' } } });
  };
  const payload = feedbackPayload({ ...form, picked });

  const kids = createKidsTransport({ baseUrl: 'https://kids/api', getAuthHeaders: async () => ({}), onError: () => {} });
  await kids.submitFeedback(payload);
  const post = calls.find((c) => c.url === 'https://kids/api/feedback');
  assert.equal(post?.init.method, 'POST');
  assert.equal(JSON.parse(post.init.body).context.element.selector, description.selector);

  calls.length = 0;
  const reads = createReadsGraphqlTransport({ url: '/graphql', app: 'gedb' });
  const created = await reads.submitFeedback(payload);
  await reads.finalizeFeedback(created.id);
  const { query, variables } = JSON.parse(calls.at(-1).init.body);
  assert.match(query, /submitFeedback/);
  const rich = JSON.parse(variables.input.description.match(/```json\n([\s\S]*)\n```/)[1]);
  assert.equal(rich.context.element.selector, description.selector);
});

test('a voice transcript fills an empty "What happened?" field', () => {
  assert.equal(mergeTranscript('', 'Save button does nothing').summary, 'Save button does nothing');
  assert.equal(mergeTranscript('  ', 'Save button does nothing').summary, 'Save button does nothing');
  assert.equal(mergeTranscript('', '  Save button does nothing \n').summary, 'Save button does nothing', 'transcript is trimmed');
  const none = mergeTranscript('Typed', '   ');
  assert.equal(none.summary, 'Typed', 'an empty transcript changes nothing');
  assert.equal(none.added, false);
});

test('typed text is kept and the transcript goes on a new line under it', () => {
  const r = mergeTranscript('On the samples page', 'Save does nothing');
  assert.equal(r.summary, 'On the samples page\nSave does nothing');
  assert.equal(r.added, true);
});

test('a later server transcript replaces the browser captions it was inserted after', () => {
  const first = mergeTranscript('', 'save dose nothing');
  assert.equal(first.summary, 'save dose nothing');
  const second = mergeTranscript(first.summary, 'Save does nothing', first.inserted);
  assert.equal(second.summary, 'Save does nothing');
  assert.doesNotMatch(second.summary, /dose/);
  assert.equal(second.added, true);

  // Under typed text, in place.
  const a = mergeTranscript('On the samples page', 'save dose nothing');
  const b = mergeTranscript(`${a.summary}`, 'Save does nothing', a.inserted);
  assert.equal(b.summary, 'On the samples page\nSave does nothing');
});

test('once the reporter edits the inserted text, a later transcript neither overwrites it nor appears twice', () => {
  const first = mergeTranscript('', 'save dose nothing');
  const second = mergeTranscript('save does nothing!!', 'Save does nothing', first.inserted);
  assert.equal(second.summary, 'save does nothing!!');
  assert.equal(second.added, false);
  // And it stays theirs for any later text from the same recording.
  assert.equal(mergeTranscript(second.summary, 'Save does nothing.', second.inserted).summary, 'save does nothing!!');
});

test('punctuation added straight after the inserted captions counts as an edit', () => {
  const first = mergeTranscript('', 'save dose nothing');
  const late = mergeTranscript('save dose nothing!!', 'Save does nothing', first.inserted);
  assert.equal(late.summary, 'save dose nothing!!');
  assert.equal(late.added, false);
  // Also in front of it, and under typed text.
  assert.equal(mergeTranscript('Oh, save dose nothing', 'Save does nothing', first.inserted).summary, 'Oh, save dose nothing');
  const a = mergeTranscript('On the samples page', 'save dose nothing');
  assert.equal(mergeTranscript(`${a.summary}.`, 'Save does nothing', a.inserted).summary, 'On the samples page\nsave dose nothing.');
  // A new line typed under it leaves the segment itself untouched.
  const below = trackSegment(first.summary, 'save dose nothing\nOn Chrome', first.inserted);
  assert.equal(mergeTranscript('save dose nothing\nOn Chrome', 'Save does nothing', below).summary, 'Save does nothing\nOn Chrome');
  // Text changed above it moves it.
  const above = trackSegment(a.summary, `Hi\n${a.summary}`, a.inserted);
  assert.equal(mergeTranscript(`Hi\n${a.summary}`, 'Save does nothing', above).summary, 'Hi\nOn the samples page\nSave does nothing');
});

test('an identical typed line is never taken for the inserted one', () => {
  // Typed 'Save failed', then captions that say the same.
  const a = mergeTranscript('Save failed', 'Save failed');
  assert.equal(a.summary, 'Save failed\nSave failed');
  assert.equal(a.inserted.start, 12);

  // The inserted line edited: the late server text changes nothing at all.
  const edited = 'Save failed\nSave failed on Chrome';
  const late = mergeTranscript(edited, 'Save failed.', trackSegment(a.summary, edited, a.inserted));
  assert.equal(late.summary, edited);
  assert.equal(late.added, false);

  // The inserted line deleted: likewise, the typed line stays as typed.
  const gone = mergeTranscript('Save failed', 'Save failed.', trackSegment(a.summary, 'Save failed', a.inserted));
  assert.equal(gone.summary, 'Save failed');
  assert.equal(gone.added, false);

  // The same through the voice run, told of each keystroke.
  const run = createVoiceRun();
  const id = run.next();
  let summary = run.add('Save failed', id, 'Save failed').summary;
  for (const ch of ' on Chrome') { summary += ch; run.edit(summary); }
  assert.equal(run.add(summary, id, 'Save failed.').summary, 'Save failed\nSave failed on Chrome');
  // And when it was not told: add catches up with the change itself.
  const run2 = createVoiceRun();
  const id2 = run2.next();
  const r2 = run2.add('Save failed', id2, 'Save failed');
  assert.equal(run2.add(r2.summary.slice(0, 11), id2, 'Save failed.').summary, 'Save failed');
  // Text typed above the inserted line moves it, and it is still upgraded in place.
  const run3 = createVoiceRun();
  const id3 = run3.next();
  const r3 = run3.add('Save failed', id3, 'Save failed');
  run3.edit(`Oh\n${r3.summary}`);
  assert.equal(run3.add(`Oh\n${r3.summary}`, id3, 'Save failed.').summary, 'Oh\nSave failed\nSave failed.');
  // Captions alone, then the reporter types the same line under them and deletes
  // the first: the line left is theirs, so the late server text leaves it be.
  const b = mergeTranscript('', 'abc');
  const typed = trackSegment(b.summary, 'abc\nabc', b.inserted);
  const left = trackSegment('abc\nabc', 'abc', typed);
  assert.equal(mergeTranscript('abc', 'ABC', left).summary, 'abc');
  // A change that could be read as above or below the segment counts as an edit.
  const c = mergeTranscript('abc', 'abc');
  assert.equal(trackSegment(c.summary, `${c.summary}\nabc`, c.inserted).edited, true);
});

test('voice text never takes the summary past its limit; typed text is kept whole', () => {
  assert.equal(SUMMARY_MAX_LENGTH, 20000);
  // Full of typed text: nothing is added.
  const full = 'x'.repeat(SUMMARY_MAX_LENGTH);
  const none = mergeTranscript(full, 'Save does nothing');
  assert.equal(none.summary, full);
  assert.equal(none.added, false);
  assert.equal(none.truncated, true);
  // One short of full: room only for the newline.
  assert.equal(mergeTranscript(full.slice(1), 'Save').summary, full.slice(1));
  // Near the limit: the transcript is cut to the room left after the newline.
  const typed = 'x'.repeat(SUMMARY_MAX_LENGTH - 6);
  const cut = mergeTranscript(typed, 'Save does nothing');
  assert.equal(cut.summary, `${typed}\nSave`);
  assert.equal(cut.summary.length, SUMMARY_MAX_LENGTH - 1, 'trailing space dropped');
  assert.equal(cut.truncated, true);
  assert.ok(cut.summary.startsWith(typed));
  // The replacement is bounded too, and the typed text is still kept whole.
  const caps = mergeTranscript('x'.repeat(SUMMARY_MAX_LENGTH - 10), 'abc');
  const upgraded = mergeTranscript(caps.summary, 'Save does nothing at all', caps.inserted);
  assert.equal(upgraded.summary.length, SUMMARY_MAX_LENGTH);
  assert.equal(upgraded.summary, `${'x'.repeat(SUMMARY_MAX_LENGTH - 10)}\nSave does`);
  assert.equal(upgraded.truncated, true);
  assert.equal(upgraded.inserted.text, 'Save does');
  // ...and with text below the segment.
  const mid = mergeTranscript('a', 'abc');
  const tail = `${mid.summary}\n${'y'.repeat(SUMMARY_MAX_LENGTH - 8)}`;
  const midUp = mergeTranscript(tail, 'Save does nothing', trackSegment(mid.summary, tail, mid.inserted));
  assert.equal(midUp.summary.length, SUMMARY_MAX_LENGTH - 1, 'cut to "Save ", trailing space dropped');
  assert.equal(midUp.summary, `a\nSave\n${'y'.repeat(SUMMARY_MAX_LENGTH - 8)}`);
  // An empty field takes up to the whole limit, never more.
  const long = mergeTranscript('', 'z'.repeat(SUMMARY_MAX_LENGTH + 50));
  assert.equal(long.summary.length, SUMMARY_MAX_LENGTH);
  // A cut never splits a surrogate pair.
  const emoji = mergeTranscript('x'.repeat(SUMMARY_MAX_LENGTH - 3), 'a\u{1F600}b');
  assert.equal(emoji.summary, `${'x'.repeat(SUMMARY_MAX_LENGTH - 3)}\na`);
  // Within the limit nothing is cut.
  assert.equal(mergeTranscript('Typed', 'Save').truncated, false);
});

test('a second recording adds its text on a new line', () => {
  const first = mergeTranscript('', 'First note');
  // A new recording passes no earlier segment.
  assert.equal(mergeTranscript(first.summary, 'Second note').summary, 'First note\nSecond note');
});

test('after "Report another" the first recording fills the empty field again', () => {
  const run = createVoiceRun();
  const a = run.next();
  const sent = run.add('', a, 'Previous report');
  assert.equal(sent.summary, 'Previous report');
  run.clear(); // reset(): the field is emptied too
  const b = run.next();
  assert.notEqual(b, a, 'ids never repeat');
  const captions = run.add('', b, 'save dose nothing');
  assert.equal(captions.summary, 'save dose nothing');
  assert.equal(captions.added, true);
  assert.equal(run.add(captions.summary, b, 'Save does nothing').summary, 'Save does nothing', 'server text still upgrades it');
});

test('only the current recording writes; "Record again" appends, never replaces', () => {
  const run = createVoiceRun();
  const first = run.next();
  const one = run.add('', first, 'First note');
  // The panel unmounts and remounts (My reports, problem view): ids keep counting.
  const second = run.next();
  const two = run.add(one.summary, second, 'Second note');
  assert.equal(two.summary, 'First note\nSecond note');
  const late = run.add(two.summary, first, 'First note, from the server');
  assert.equal(late.added, false, 'a late transcript for an older recording is dropped');
  assert.equal(late.summary, 'First note\nSecond note');
  run.next(); // delete the voice note
  assert.equal(run.add(two.summary, second, 'Second note!').added, false);
});

test('a transcription still running when the panel unmounts can write when it returns', () => {
  const run = createVoiceRun();
  const id = run.next();
  const captions = run.add('', id, 'save dose nothing');
  // Nothing in an unmount bumps the id, so the server text still lands.
  assert.equal(run.isCurrent(id), true);
  assert.equal(run.add(captions.summary, id, 'Save does nothing').summary, 'Save does nothing');
});

test('closing the form drops a transcription still running', () => {
  const run = createVoiceRun();
  const id = run.next();
  const captions = run.add('', id, 'save dose nothing');
  run.clear(); // the form closed; afterClose empties the field
  assert.equal(run.isCurrent(id), false);
  const late = run.add('', id, 'Save does nothing');
  assert.equal(late.added, false, 'the late server text does not fill the reopened form');
  assert.equal(late.summary, '');
  assert.equal(captions.added, true);
});

test('dictated text is sent once, in summary; transcript stays null', async (t) => {
  const voice = { blob: null, mimeType: 'audio/webm', durationMs: 3000, filename: 'voice-note.webm', transcript: 'Save does nothing', transcriptSource: 'browser' };
  const p = feedbackPayload({ ...form, summary: 'Save does nothing', voice });
  assert.deepEqual(Object.keys(p).sort(), ['context', 'expected', 'kind', 'pageUrl', 'route', 'severity', 'steps', 'summary', 'transcript', 'transcriptSource']);
  assert.equal(p.summary, 'Save does nothing');
  assert.equal(p.transcript, null);
  assert.equal(p.transcriptSource, 'browser');
  assert.equal(feedbackPayload({ ...form, voice: null }).transcriptSource, null);

  const realFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = realFetch; });
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return json(200, { data: { submitFeedback: { id: '1' } } });
  };
  const reads = createReadsGraphqlTransport({ url: '/graphql', app: 'gedb' });
  const created = await reads.submitFeedback(p);
  await reads.finalizeFeedback(created.id);
  const { description } = JSON.parse(calls.at(-1).init.body).variables.input;
  assert.match(description, /Save does nothing/);
  assert.doesNotMatch(description, /Voice note transcript/);
  assert.equal(description.split('\n\n```json')[0].match(/Save does nothing/g).length, 1, 'the human-readable part shows it once');
});
