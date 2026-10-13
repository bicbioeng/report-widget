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

/** The transport.submitFeedback payload. `context` is meta() + snapshotContext(). */
export function feedbackPayload({ kind, severity, summary, expected, steps, voice, picked, context, pageUrl, route }) {
  return {
    kind,
    severity: kind === 'bug' ? severity : null,
    summary: summary.trim(),
    expected: expected.trim() || null,
    steps: steps.trim() || null,
    transcript: voice?.transcript?.trim() || null,
    transcriptSource: voice?.transcript ? voice.transcriptSource || null : null,
    pageUrl,
    route,
    context: { ...context, element: picked?.description || null },
  };
}
