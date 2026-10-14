// Voice-note text is not repeated in the diagnostics (BICBIOENG-111). Runs against src, no dist.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// tsup defines this at build time; src needs it before the import.
globalThis.__WIDGET_VERSION__ = 'test';
const { buildDiagnostics } = await import('../src/diagnostics.js');

test('diagnostics: a voice note whose text is in the summary does not repeat it as transcript', () => {
  const d = buildDiagnostics({
    state: 'editing',
    form: {
      // As FeedbackModal passed it before: the voice note's text again as transcript.
      kind: 'bug', summary: 'Save does nothing', transcript: 'Save does nothing',
      voice: { durationMs: 12000, mimeType: 'audio/webm', transcript: 'Save does nothing', transcriptSource: 'browser' },
    },
  });
  assert.ok('transcript' in d.form, 'the key stays');
  assert.equal(d.form.transcript, null);
  assert.equal(d.form.summary, 'Save does nothing');
  assert.deepEqual(d.form.voiceNote, { durationMs: 12000, mimeType: 'audio/webm' });
  assert.equal(JSON.stringify(d).match(/Save does nothing/g).length, 1, 'the text appears once');
});
