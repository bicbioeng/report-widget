# Changelog

## 1.7.1

- `STATE_LABELS` / `STATE_COLORS` include `testing` ("Testing", cyan). KIDS reports cards in the Testing column as their own state instead of "In progress".

## 1.1.1

- Subpath imports now resolve in tools that ignore `package.json` `"exports"` (Create React App's Jest 26/27, older webpack, TypeScript `moduleResolution: node`). `adapters/kids/` and `adapters/reads-graphql/` hold stub `package.json` files that point into `dist/`, and `styles.css` is also copied to the package root. `"exports"` is unchanged. `test/legacy-resolve.test.mjs` checks every exported subpath this way.

## 1.1.0

Additive. Payload contract 1.1; the transport interface is unchanged.

- **Report a problem with the Report form itself.** A "Problem with this form?" link sits in the form footer, in the error shown when Send fails, and under upload warnings. It opens a one-field form that attaches diagnostics: widget version, form state, the last error and its stack, what the reporter had filled in (free text clipped), failed attachments, browser and viewport. The report goes through the same `transport.submitFeedback` (then `finalizeFeedback`) with `kind: 'report-tool'`, a `"Report tool: "` summary prefix and `context.diagnostics`. If that fails as well, the reporter can copy the whole report. See PAYLOAD.md.
- **Report works over open antd Modals and masked Drawers.** The floating button is now portaled to `<body>` at z-index 1150. That is above antd overlays (1000, nested 1100) and below the report modal (1160) and annotator (1170). Clicking it no longer lands on a host overlay's mask, so `maskClosable` overlays stay open. When the button would cover an open Drawer or Modal panel (a right-side drawer's footer, for example), it moves onto the mask beside the panel. Alt+Shift+F is unchanged.
- New exports: `WIDGET_VERSION`, `REPORT_TOOL_KIND`, `REPORT_TOOL_PREFIX`, `buildDiagnostics`, `buildReportToolPayload`, `clipText`, `errorRecord`.
- `fixtures/vite/overlays.html`: an antd Modal and a masked right-side Drawer with footer buttons, and a stub transport.

## 1.0.0

- The KIDS Report widget packaged as `@bicbioeng/report-widget`, with the `kids` and `reads-graphql` transports.
