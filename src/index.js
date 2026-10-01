'use client';

export { default as FeedbackWidget, openFeedback, OPEN_EVENT } from './FeedbackWidget';
export { default as FeedbackModal } from './FeedbackModal';
export { default as MyReports, STATE_COLORS, STATE_LABELS, KIND_LABELS, relTime, StatusIcon, StatusLabel } from './MyReports';
export { default as RouteRecorder, useRouteTracker } from './RouteRecorder';
export { ReportProvider, useReportConfig } from './ReportProvider';
export {
  installContextBuffer, installHistoryTracking, recordRoute, recordError, snapshotContext, lastUncaught,
} from './contextBuffer';
export { pageMetadata } from './metadata';
export {
  useMediaRecorder, formatMs, supportsRecording, supportsSpeech, extensionFor, pickMime,
} from './recorders';
export {
  WIDGET_VERSION, REPORT_TOOL_KIND, REPORT_TOOL_PREFIX, buildDiagnostics, buildReportToolPayload, clipText, errorRecord,
} from './diagnostics';
