/**
 * Form logic FeedbackModal renders and sends, kept free of JSX and antd so
 * node --test can import it straight from src.
 */

/**
 * What the Screenshot card offers for element-pick. `placement` is 'actions'
 * (next to Take screenshot, no shot yet) or 'row' (the pick row under the shot).
 */
export function pickOffer({ shot, picked, capturing, hidden }) {
  return {
    label: picked ? 'Pick again' : 'Pick an element',
    disabled: Boolean(capturing || hidden),
    placement: shot ? 'row' : 'actions',
    row: Boolean(shot || picked),
    chip: Boolean(picked),
  };
}

/** The "What happened?" field's limit, for typed and dictated text alike. */
export const SUMMARY_MAX_LENGTH = 20000;

// The inserted segment is always a whole line, so it counts as unchanged only
// while it still is one: '!!' typed straight after it is an edit to it.
function isWholeLine(summary, start, text) {
  const end = start + text.length;
  return summary.startsWith(text, start)
    && (start === 0 || summary[start - 1] === '\n')
    && (end === summary.length || summary[end] === '\n');
}

// `text` cut to `room` characters (never half a surrogate pair), trailing space dropped.
function fit(text, room) {
  if (text.length <= room) return text;
  let cut = Math.max(0, room);
  const code = text.charCodeAt(cut - 1);
  if (code >= 0xd800 && code <= 0xdbff) cut -= 1;
  return text.slice(0, cut).trimEnd();
}

// Where `segment` sits in `next` if the change from `prev` (all but the common
// `p` leading and `s` trailing characters) left it alone, else null.
function placeAfter(prev, next, segment, p, s) {
  const changedEnd = prev.length - s;
  if (changedEnd <= segment.start) return segment.start + next.length - prev.length;
  if (p >= segment.start + segment.text.length) return segment.start;
  return null;
}

/**
 * Follows an inserted segment through one change of the summary, `prev` → `next`.
 * The change is the span between their common prefix and suffix, matched both
 * ways round (prefix first, then suffix first): the segment survives only if
 * both put the change outside it and agree where it now sits, and it is still a
 * whole line. Anything else (typing on its line, deleting it, a change that
 * could be read either way) marks it edited. The segment is never looked for
 * elsewhere in the text, so an identical line the reporter typed is never
 * taken for it.
 */
export function trackSegment(prev, next, segment) {
  if (!segment || segment.edited || prev === next) return segment;
  const min = Math.min(prev.length, next.length);
  const same = (i) => prev[i] === next[i];
  const sameFromEnd = (i) => prev[prev.length - 1 - i] === next[next.length - 1 - i];
  let p = 0;
  while (p < min && same(p)) p += 1;
  let s = 0;
  while (s < min - p && sameFromEnd(s)) s += 1;
  let s2 = 0;
  while (s2 < min && sameFromEnd(s2)) s2 += 1;
  let p2 = 0;
  while (p2 < min - s2 && same(p2)) p2 += 1;
  const start = placeAfter(prev, next, segment, p, s);
  const ok = start !== null && start === placeAfter(prev, next, segment, p2, s2)
    && isWholeLine(next, start, segment.text);
  return ok ? { ...segment, start } : { ...segment, edited: true };
}

/**
 * A voice transcript into the "What happened?" text. `last` is what the earlier
 * call returned as `inserted` for the same recording (null for a new one), moved
 * through the reporter's edits since by trackSegment: its segment is replaced in
 * place while still unchanged, and once the reporter has edited it the recording
 * writes nothing more. The result stays within SUMMARY_MAX_LENGTH: the typed text
 * is kept whole and the transcript is cut to the room left (`truncated`).
 * Returns { summary, inserted, added, truncated }.
 */
export function mergeTranscript(summary, transcript, last = null) {
  const text = String(transcript || '').trim();
  if (!text || last?.edited) return { summary, inserted: last, added: false, truncated: false };
  if (last) {
    if (!isWholeLine(summary, last.start, last.text)) {
      return { summary, inserted: { ...last, edited: true }, added: false, truncated: false };
    }
    const fitted = fit(text, SUMMARY_MAX_LENGTH - (summary.length - last.text.length));
    const truncated = fitted !== text;
    if (!fitted) return { summary, inserted: last, added: false, truncated };
    return {
      summary: summary.slice(0, last.start) + fitted + summary.slice(last.start + last.text.length),
      inserted: { start: last.start, text: fitted },
      added: true,
      truncated,
    };
  }
  const blank = !summary.trim();
  const fitted = fit(text, blank ? SUMMARY_MAX_LENGTH : SUMMARY_MAX_LENGTH - summary.length - 1);
  const truncated = fitted !== text;
  if (!fitted) return { summary, inserted: null, added: false, truncated };
  if (blank) return { summary: fitted, inserted: { start: 0, text: fitted }, added: true, truncated };
  return { summary: `${summary}\n${fitted}`, inserted: { start: summary.length + 1, text: fitted }, added: true, truncated };
}

/**
 * The voice notes of one FeedbackModal: recording ids that never repeat (the
 * panel remounts, the form is reset) and the segment the current recording
 * inserted. Only the current id may write; `next()` and `clear()` drop the rest.
 * `edit(summary)` is told every change to the summary, so the segment follows
 * the reporter's typing; `add` catches up with any change it was not told of.
 */
export function createVoiceRun() {
  let id = 0;
  let segment = null; // { id, inserted }
  let known = null;   // the summary as the segment was last placed in it
  const edit = (summary) => {
    if (segment && known !== null) segment = { ...segment, inserted: trackSegment(known, summary, segment.inserted) };
    known = summary;
  };
  return {
    next: () => ++id,
    isCurrent: (i) => i === id,
    clear: () => { id += 1; segment = null; known = null; },
    edit,
    add(summary, i, text) {
      if (i !== id) return { summary, inserted: null, added: false, truncated: false };
      edit(summary);
      const r = mergeTranscript(summary, text, segment?.id === i ? segment.inserted : null);
      segment = { id: i, inserted: r.inserted };
      known = r.summary;
      return r;
    },
  };
}

/** The transport.submitFeedback payload. `context` is meta() + snapshotContext(). */
export function feedbackPayload({ kind, severity, summary, expected, steps, voice, picked, context, pageUrl, route }) {
  return {
    kind,
    severity: kind === 'bug' ? severity : null,
    summary: summary.trim(),
    expected: expected.trim() || null,
    steps: steps.trim() || null,
    // The voice note's text is already in summary; the key stays for older consumers.
    transcript: null,
    transcriptSource: voice?.transcript ? voice.transcriptSource || null : null,
    pageUrl,
    route,
    context: { ...context, element: picked?.description || null },
  };
}
