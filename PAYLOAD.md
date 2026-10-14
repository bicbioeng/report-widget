# Report payload contract — v1.2

Contract version **1** ships with package major **1.x**. A change that removes, renames or retypes a field is a new contract version and a new package major; adding an optional field is not.

**1.1** (package 1.1.0) is additive: a new `kind`, `'report-tool'`, and a new `context.diagnostics` object that is present only on that kind. See [Report-tool reports](#report-tool-reports-11). The payload carries no `schemaVersion` field; `context.diagnostics.widgetVersion` tells you which widget sent a report-tool report. The transport interface is unchanged.

**1.2** is additive: an optional `context.element`, the page element the reporter picked with "Pick an element" in the Screenshot card, or `null`. See [Picked element](#picked-element-12). The transport interface is unchanged.

The widget hands every transport the same object, `transport.submitFeedback(payload)`:

| field | type | notes |
|---|---|---|
| `kind` | `'bug' \| 'idea' \| 'question' \| 'report-tool'` | `'report-tool'` since 1.1 |
| `severity` | `'blocked' \| 'annoying' \| 'minor' \| null` | set only when `kind === 'bug'` |
| `summary` | `string` | required, trimmed, at most 20 000 chars (textarea `maxLength`); starts with `"Report tool: "` when `kind === 'report-tool'` |
| `expected` | `string \| null` | "What did you expect" / "Why would this help" |
| `steps` | `string \| null` | bugs only |
| `transcript` | `string \| null` | always `null` from the widget: a voice note's text is written into "What happened?" and travels in `summary`. The key stays for older servers and adapters |
| `transcriptSource` | `string \| null` | where the voice text in `summary` came from: `'browser'` (Web Speech captions) or the server provider name; null when no voice text went into `summary` |
| `pageUrl` | `string` | `window.location.href` at submit |
| `route` | `string` | `window.location.pathname` at submit |
| `context` | object | below |

`context`:

| field | type | notes |
|---|---|---|
| `browser` | `{ name, version, os, osVersion, platform, ua }` | Bowser parse; `ua` clipped to 300 chars |
| `viewport` | `{ width, height, dpr, screen }` | `screen` is `"WxH"` |
| `language`, `timezone`, `online` | | |
| `buildSha` | `string` | from `ReportProvider config.buildSha`, default `'dev'` |
| `impersonating` | `string \| null` | `config.getImpersonation()?.email` |
| `capturedAt` | ISO string | |
| `errors` | `{ at, level, message, source? }[]` | last 60; `level` is `console.error`, `console.warn`, `uncaught`, `unhandledrejection`, `network`, `fetch`, `graphql` or `react` (via `recordError`); messages at most 600 chars; URL query values are dropped and token-like keys removed |
| `routeHistory` | `{ at, path }[]` | last 20, consecutive duplicates collapsed |
| `diagnostics` | object | 1.1, only when `kind === 'report-tool'`; below |
| `element` | `object \| null` | 1.2, optional; the picked element, below. `null` when nothing is picked; absent on report-tool reports and from older widgets |

## Picked element (1.2)

"Pick an element" hides the dialog and lets the reporter click or tap one element on the page. The click is swallowed, so a link does not navigate. The dialog then shows the element as a chip, and the quick screenshot is retaken with the element outlined. Removing the chip sends `null`; removing the screenshot keeps the element. Picking is by pointer only: keyboard users can attach a screenshot or describe the element in text. Inside a cross-origin iframe or a closed shadow root, only the iframe or host element can be picked.

`context.element`:

| field | type | notes |
|---|---|---|
| `tag` | `string` | lower-case tag name |
| `id` | `string \| null` | |
| `classes` | `string[]` | at most 8 |
| `selector` | `string` | short CSS path: `#id`, or tag plus up to 2 classes plus `:nth-of-type`, for the element and up to 5 ancestors, stopping at an id |
| `text` | `string \| null` | visible text, whitespace collapsed, at most 200 chars; `null` for form fields |
| `ariaLabel`, `role`, `href`, `alt` | `string \| null` | `href` is the resolved link target |
| `rect` | `{ x, y, width, height }` | viewport position and size in CSS px, rounded, when it was picked |
| `html` | `string` | `outerHTML`, at most 2 000 chars |

What the reporter typed is never included: `value`, `selected` and `checked` on input, textarea, select and option are dropped, textarea contents are emptied, and so is any attribute whose name looks like a token, password, secret, API key, auth, session, CSRF or cookie.

## Report-tool reports (1.1)

"Problem with this form?" sits in the form footer, in the error shown when Send fails, and under upload warnings after a partial success. It switches the modal to one text field and attaches `context.diagnostics`, a snapshot taken when the link was clicked. The widget sends it with the same transport calls: `submitFeedback(payload)`, then `finalizeFeedback(id)`. There are no uploads. A failed `finalizeFeedback` counts as a failure only when `ticketKey` is `null`, because for reads-graphql that call is the send. If sending fails, the reporter gets the whole payload as JSON in a text box with a Copy button, so the report is not lost.

The payload is otherwise a normal v1 payload: `severity`, `expected`, `steps`, `transcript` and `transcriptSource` are `null`, and `context` also carries the usual page metadata, `errors` and `routeHistory`. The diagnostics go inside `context`, not at the top level, because both adapters and the KIDS server keep `context` as it is and drop unknown top-level fields.

`context.diagnostics`:

| field | type | notes |
|---|---|---|
| `widgetVersion` | `string` | package version, baked in at build |
| `state` | `string` | `editing`, `submitting`, `submit-failed`, `sent`, `sent-with-warnings`, `capturing-screenshot`, `recording-screen` or `my-reports` |
| `progress` | `string \| null` | the progress line at that moment, e.g. `Uploading screenshot.png (1/3)…` |
| `lastError` | `{ stage, message, stack } \| null` | the widget's last error; `stage` is `submit`, `upload`, `finalize`, `screenshot`, `auto-screenshot`, `exact-screenshot`, `element-pick` (1.2) or `screen-recording`; `stack` at most 2 000 chars |
| `form` | object | what the reporter had filled in: `kind`, `severity`, `summary`, `expected`, `steps`, `transcript` (always `null`, the voice text is in `summary`; each free-text field clipped to 280 chars plus `… (+N chars)`), `screenshot: { method, annotated } \| null`, `voiceNote` and `screenRecording: { durationMs, mimeType } \| null`, `files: { name, type, size }[]`, `element` (the picked element's selector) `\| null` (1.2). No file contents. |
| `failedAttachments` | `{ name, error }[]` | uploads that failed on the last send |
| `browser`, `viewport` | | same shapes as `context.browser` / `context.viewport` |
| `capturedAt` | ISO string | |

A transport must not reject an unknown `kind`. Neither bundled adapter does.

## Attachments

Attachments are not part of the payload. After `submitFeedback` resolves `{ id, ticketKey }`, the widget calls `transport.uploadFeedbackFile(ticketKey, file)` once per file, in this order:

1. `screenshot.png` or `screenshot-annotated.png` (image/png)
2. `voice-note.webm|mp4|ogg` (audio)
3. `screen-recording.webm|mp4` (video, at most 2 min)
4. user files and pasted images (at most 10, each at most `config.maxAttachmentBytes`, default 512 MiB)

When an upload fails, the widget adds a warning and moves on to the next file. After the uploads it calls `transport.finalizeFeedback(id)`. A failure there also becomes a warning. The report itself is never lost.

## Transport

```ts
fetchFeedbackConfig(): Promise<{ project?: { name }, transcription?: { available }, maxAttachmentBytes? }>
submitFeedback(payload): Promise<{ id, ticketKey: string | null }>   // throw on failure, show your own error UI
uploadFeedbackFile(ticketKey: string | null, file: File): Promise<unknown>
finalizeFeedback(id): Promise<unknown>
transcribeAudio(blob, { filename, language }): Promise<{ text, provider } | { unavailable: true }>
fetchMyFeedback(): Promise<{ items: MyReport[] }>
```

When `ticketKey` is `null`, the widget hides the "Open ticket" UI.

## How each adapter stores it

- **`adapters/kids`**: sends `POST /feedback` with the payload unchanged. The KIDS server trims text fields, keeps `errors` to 40 and `routeHistory` to 20 when `context` is too large, then creates the ticket. It returns `ticketKey`.
  - Report-tool reports: until the server lists `'report-tool'` in its `KINDS`, it stores them as `kind: 'bug'` with no severity. The ticket is then titled `Bug: Report tool: …` and `context.diagnostics` is kept in the stored context. The context comment does not render it yet.
- **`adapters/reads-graphql`**: makes one `submitFeedback(input: { title, description, email, screenshotUrl })` call, from `finalizeFeedback`.
  - `title` is `"[GEDB] " + summary` when `app` is set (otherwise the plain summary).
  - `description` is a human-readable summary followed by a fenced JSON block: `{ app?, ...payload, screenshotUrl, attachments: [{ name, url }] }`.
  - `ticketKey` is always `null`.
  - Report-tool reports: the title is `"[GEDB] Report tool: …"`, and `diagnostics` sits under `context` in the JSON block. No change is needed.
