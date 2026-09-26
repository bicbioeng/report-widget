/** Feeds the route history into the context buffer. Must sit inside the Router. */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { recordRoute } from './contextBuffer';

export default function RouteRecorder() {
  const location = useLocation();
  useEffect(() => { recordRoute(location.pathname); }, [location.pathname]);
  return null;
}
