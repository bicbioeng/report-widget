# Report payload contract — v1

Contract version **1** ships with package major **1.x**. A change that removes, renames or retypes a field is a new contract version and a new package major; adding an optional field is not.

The widget hands every transport the same object, `transport.submitFeedback(payload)`:

| field | type | notes |
|---|---|---|
| `kind` | `'bug' \| 'idea' \| 'question'` | |
| `severity` | `'blocked' \| 'annoying' \| 'minor' \| null` | set only when `kind === 'bug'` |
| `summary` | `string` | required, trimmed, at most 20 000 chars (textarea `maxLength`) |
| `expected` | `string \| null` | "What did you expect" / "Why would this help" |
| `steps` | `string \| null` | bugs only |
| `transcript` | `string \| null` | voice note text, edited by the reporter |
| `transcriptSource` | `string \| null` | `'browser'` (Web Speech captions) or the server provider name; null when there is no transcript |
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
- **`adapters/reads-graphql`**: makes one `submitFeedback(input: { title, description, email, screenshotUrl })` call, from `finalizeFeedback`.
  - `title` is `"[GEDB] " + summary` when `app` is set (otherwise the plain summary).
  - `description` is a human-readable summary followed by a fenced JSON block: `{ app?, ...payload, screenshotUrl, attachments: [{ name, url }] }`.
  - `ticketKey` is always `null`.
