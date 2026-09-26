/**
 * Feeds the route history into the context buffer, with any router:
 *   <RouteRecorder pathname={useLocation().pathname} />   react-router
 *   <RouteRecorder pathname={usePathname()} />            Next.js App Router
 *   <RouteRecorder />                                     anything else — patches
 *     history.pushState/replaceState and listens to popstate.
 */
import { useEffect } from 'react';
import { recordRoute, installHistoryTracking } from './contextBuffer';

export function useRouteTracker(pathname) {
  const tracked = pathname !== undefined;
  useEffect(() => { if (tracked) recordRoute(pathname); }, [tracked, pathname]);
  useEffect(() => { if (!tracked) installHistoryTracking(); }, [tracked]);
}

export default function RouteRecorder({ pathname }) {
  useRouteTracker(pathname);
  return null;
}
