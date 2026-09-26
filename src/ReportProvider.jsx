/**
 * Host-app wiring for the widget: the transport and the facts the package
 * must not read from the bundler (build SHA, app name, "acting as").
 *
 * config: {
 *   transport,          // required — see adapters/ or PAYLOAD.md
 *   buildSha?,          // default 'dev'
 *   appName?,           // default 'KIDS' (v1 copy is unchanged)
 *   getImpersonation?,  // () => ({ email } | null)
 * }
 */
import React, { createContext, useContext, useEffect } from 'react';
import { installContextBuffer } from './contextBuffer';

const ReportContext = createContext(null);

export function ReportProvider({ config, children }) {
  // Idempotent; hosts that want errors from before first render call
  // installContextBuffer() themselves at app start.
  useEffect(() => { installContextBuffer(); }, []);
  return <ReportContext.Provider value={config}>{children}</ReportContext.Provider>;
}

export function useReportConfig() {
  const config = useContext(ReportContext);
  if (!config?.transport) {
    throw new Error('@bicbioeng/report-widget: wrap the app in <ReportProvider config={{ transport }}> (or pass config to <FeedbackWidget>).');
  }
  return { buildSha: 'dev', appName: 'KIDS', getImpersonation: null, ...config };
}
