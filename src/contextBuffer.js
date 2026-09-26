/**
 * What the browser saw before the reporter pressed "Report".
 *
 * A ring buffer of console errors/warnings, uncaught exceptions, unhandled
 * rejections, failed fetches (including GraphQL `errors[]` in a 200), and the
 * routes visited. Installed once at app start; the widget snapshots it at
 * submit time. Nothing leaves the browser until the reporter submits, and the
 * reporter sees what will be included.
 *
 * Deliberately not a dependency: Sentry-style breadcrumbs need a client; this
 * is eighty lines.
 */

const MAX_ENTRIES = 200;
const MAX_ROUTES = 30;
const MAX_MESSAGE = 600;

const state = { installed: false, entries: [], routes: [] };

function push(entry) {
  state.entries.push({ at: Date.now(), ...entry });
  if (state.entries.length > MAX_ENTRIES) state.entries.splice(0, state.entries.length - MAX_ENTRIES);
}

function fmt(v) {
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

function joinArgs(args) {
  return args.map(fmt).join(' ').slice(0, MAX_MESSAGE);
}

/** Query strings can carry tokens; keep path + a short, sanitised query. */
function safeUrl(input) {
  try {
    const raw = typeof input === 'string' ? input : input?.url || String(input);
    const u = new URL(raw, window.location.origin);
    const params = [...u.searchParams.keys()].filter((k) => !/token|key|secret|auth|signature|credential/i.test(k));
    const q = params.length ? `?${params.map((k) => `${k}=…`).join('&')}` : '';
    return `${u.origin === window.location.origin ? '' : u.origin}${u.pathname}${q}`.slice(0, 200);
  } catch {
    return String(input).slice(0, 120);
  }
}

export function recordRoute(path) {
  const last = state.routes[state.routes.length - 1];
  if (last && last.path === path) return;
  state.routes.push({ at: Date.now(), path });
  if (state.routes.length > MAX_ROUTES) state.routes.splice(0, state.routes.length - MAX_ROUTES);
}

export function recordError(level, message, extra = {}) {
  push({ level, message: String(message).slice(0, MAX_MESSAGE), ...extra });
}

export function installContextBuffer() {
  if (state.installed || typeof window === 'undefined') return;
  state.installed = true;

  for (const level of ['error', 'warn']) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      try { push({ level: `console.${level}`, message: joinArgs(args) }); } catch { /* never break logging */ }
      original(...args);
    };
  }

  window.addEventListener('error', (e) => {
    push({
      level: 'uncaught',
      message: e.message || fmt(e.error) || 'Unknown error',
      source: e.filename ? `${e.filename.split('/').pop()}:${e.lineno}:${e.colno}` : undefined,
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    push({ level: 'unhandledrejection', message: fmt(e.reason) });
  });

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const method = (init?.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
    const url = safeUrl(input);
    let res;
    try {
      res = await originalFetch(input, init);
    } catch (err) {
      push({ level: 'network', message: `${method} ${url} → ${fmt(err)}` });
      throw err;
    }
    try {
      if (!res.ok) {
        push({ level: 'fetch', message: `${method} ${url} → ${res.status} ${res.statusText || ''}`.trim() });
      } else if (/graphql/i.test(url) && (res.headers.get('content-type') || '').includes('json')) {
        // A GraphQL failure is a 200 with errors[]; clone so the caller's body is untouched.
        res.clone().json().then((j) => {
          if (Array.isArray(j?.errors) && j.errors.length) {
            push({ level: 'graphql', message: `${method} ${url} → ${j.errors.map((e) => e.message).join('; ')}` });
          }
        }).catch(() => {});
      }
    } catch { /* observation only */ }
    return res;
  };

  recordRoute(window.location.pathname);
}

/** A copy for the report: recent entries and routes. */
export function snapshotContext() {
  return {
    errors: state.entries.slice(-60),
    routeHistory: state.routes.slice(-20),
  };
}

/** The most recent uncaught error, for the crash-screen prefill. */
export function lastUncaught() {
  for (let i = state.entries.length - 1; i >= 0; i -= 1) {
    if (['uncaught', 'unhandledrejection'].includes(state.entries[i].level)) return state.entries[i];
  }
  return null;
}
