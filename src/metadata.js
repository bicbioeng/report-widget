/**
 * Browser and page facts for a report. Nothing the reporter has to type.
 */
import Bowser from 'bowser';

export function browserInfo() {
  try {
    const p = Bowser.getParser(window.navigator.userAgent);
    const b = p.getBrowser();
    const os = p.getOS();
    const platform = p.getPlatform();
    return {
      name: b.name || null,
      version: b.version || null,
      os: os.name || null,
      osVersion: os.versionName || os.version || null,
      platform: platform.type || null,
      ua: window.navigator.userAgent.slice(0, 300),
    };
  } catch {
    return { ua: window.navigator.userAgent.slice(0, 300) };
  }
}

export function isDesktop() {
  try {
    const type = Bowser.getParser(window.navigator.userAgent).getPlatform().type;
    return !type || type === 'desktop';
  } catch {
    return true;
  }
}

export function pageMetadata({ buildSha = 'dev', getImpersonation } = {}) {
  let impersonating = null;
  try { impersonating = getImpersonation?.()?.email || null; } catch { impersonating = null; }
  return {
    browser: browserInfo(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    },
    language: window.navigator.language || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    online: window.navigator.onLine,
    buildSha: buildSha || 'dev',
    impersonating,
    capturedAt: new Date().toISOString(),
  };
}
