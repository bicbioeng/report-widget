# @bicbioeng/report-widget

This is the KIDS in-app **Report** button, packaged for any React app: Vite, CRA (react-scripts 5) or the Next.js App Router. It lets someone report a bug, idea or question and attach any of these:

- a screenshot, taken automatically or with exact pixels, which they can annotate
- a voice note with a transcript
- a screen recording
- files

It also captures context without the reporter doing anything: browser, viewport, recent errors and failed requests, and route history. The reporter can see all of it before sending.

Version 1.x behaves exactly like the KIDS widget. The payload contract is in [PAYLOAD.md](./PAYLOAD.md).

## Install

We recommend **GitHub Packages (npm registry)**:

```
# .npmrc (commit this)
@bicbioeng:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```
```
npm install @bicbioeng/report-widget@^1
```

Why GitHub Packages rather than a git tag (`npm i github:bicbioeng/report-widget#v1.0.0`):

- **Consumers get a built artifact.** `dist/` is not committed. A git dependency has to run `prepare` in every consumer install, which means installing tsup and TypeScript and building inside every Docker, Kaniko and CRA build. That is slower, and it can break when the build toolchain drifts.
- **Semver ranges work normally.** `^1.2.0`, `npm outdated`, Dependabot and lockfile integrity all behave as they do for any npm package. With git tags, you get a commit pin, and bumps are manual.
- **Published versions are immutable.** A git tag can be moved.
- **The cost is a token on every install.** GitHub Packages asks for one even when the package is public. `NODE_AUTH_TOKEN` needs `read:packages` on the `bicbioeng` org.
  - In `bicbioeng` Actions, `GITHUB_TOKEN` is enough.
  - Consumer repos in `READSTech` need an org secret holding a PAT.
  - Docker builds need a BuildKit secret: `RUN --mount=type=secret,id=npm,env=NODE_AUTH_TOKEN npm ci`.

  A private git dependency would need git credentials in the same places anyway, so the token doesn't add work compared with the alternative.

## Use

```jsx
import { ReportProvider, FeedbackWidget, RouteRecorder, installContextBuffer } from '@bicbioeng/report-widget';
import { createKidsTransport } from '@bicbioeng/report-widget/adapters/kids';
import '@bicbioeng/report-widget/styles.css';   // global, once

installContextBuffer(); // optional: call at app start to catch errors from before first render

const transport = createKidsTransport({ baseUrl: import.meta.env.VITE_REST_API_URL, getAuthHeaders });

<ReportProvider config={{ transport, buildSha: import.meta.env.VITE_BUILD_SHA, appName: 'KIDS', getImpersonation }}>
  <RouteRecorder pathname={useLocation().pathname} />   {/* or omit pathname: history patch */}
  <FeedbackWidget onOpenTicket={(key) => navigate(`/browse/${key}`)} />
</ReportProvider>
```

- **No environment reads inside the package.** Pass the build SHA, app name and impersonation through `config`. The package never reads `import.meta.env` or `process.env`.
- **Safe at import and on the server.** Nothing touches `window`, `document` or `navigator` at import time. The provider installs the context buffer in an effect; the call is idempotent.
- **Next.js App Router.** The transport holds functions, so create it and the provider inside a `'use client'` file. Pass `usePathname()` to `RouteRecorder`. Import `styles.css` from `app/layout`. See `fixtures/next`.
- **Crash screens.** An error boundary's crash screen may render outside the provider. Use `<FeedbackWidget hideButton config={config} />` there, and call `openFeedback({ kind: 'bug', summary, noAutoShot: true })`.

### Transports

- **`@bicbioeng/report-widget/adapters/kids`**:
  - Signature: `createKidsTransport({ baseUrl, getAuthHeaders, onError? })`.
  - Talks to the KIDS REST API and returns `ticketKey`.
  - Errors on calls that aren't silent go to `onError`. The default is antd `message.error`, deduplicated for 5 s. Pass KIDS' `toastError` to share its dedupe map.
- **`@bicbioeng/report-widget/adapters/reads-graphql`**:
  - Signature: `createReadsGraphqlTransport({ app: 'gedb' | 'bnfr', client, gql, getEmail?, folder?, projectName? })`, or pass `url` and `getHeaders` in place of `client` and `gql` for plain fetch.
  - Built for backends that only have the single-shot `submitFeedback` mutation plus `getUploadUrl`.
  - The title gets an app prefix, e.g. `[GEDB] …`. Nothing is sent until `finalizeFeedback`. `ticketKey` is `null`.
- **Your own transport.** Implement the six functions in PAYLOAD.md.

## Develop

```
npm install
npm run build          # tsup → dist/ (ESM .js + CJS .cjs + .d.ts/.d.cts + styles.css)
npm test               # node:test against dist: SSR render + both adapters
npm run pack:fixtures  # fixtures/report-widget.tgz
cd fixtures/vite && npm install && npm run build
cd fixtures/next && npm install && npm run build
```

Release: bump `version`, commit, then tag `vX.Y.Z` and push the tag. CI builds both fixtures, then publishes to GitHub Packages.
