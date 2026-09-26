import type { ReactElement, ReactNode } from 'react';

/** 'report-tool' (v1.1): a report about the Report form itself, sent from "Problem with this form?". */
export type ReportKind = 'bug' | 'idea' | 'question' | 'report-tool';
export type ReportSeverity = 'blocked' | 'annoying' | 'minor';

export interface ContextEntry { at: number; level: string; message: string; source?: string; [k: string]: unknown }
export interface RouteEntry { at: number; path: string }

/** Payload contract v1 — see PAYLOAD.md. */
export interface ReportPayload {
  kind: ReportKind;
  severity: ReportSeverity | null;
  summary: string;
  expected: string | null;
  steps: string | null;
  transcript: string | null;
  transcriptSource: string | null;
  pageUrl: string;
  route: string;
  context: ReportContext;
}

export interface ReportContext {
  browser: { name?: string | null; version?: string | null; os?: string | null; osVersion?: string | null; platform?: string | null; ua: string };
  viewport: { width: number; height: number; dpr: number; screen: string };
  language: string | null;
  timezone: string | null;
  online: boolean;
  buildSha: string;
  impersonating: string | null;
  capturedAt: string;
  errors: ContextEntry[];
  routeHistory: RouteEntry[];
  /** v1.1, present only when kind === 'report-tool'. */
  diagnostics?: ReportToolDiagnostics;
}

export interface ReportToolError { stage: string | null; message: string | null; stack: string | null }

/** Contract 1.1 — see PAYLOAD.md. Free text is clipped to 280 chars. */
export interface ReportToolDiagnostics {
  widgetVersion: string;
  state: string;
  progress: string | null;
  lastError: ReportToolError | null;
  form: {
    kind: ReportKind | null;
    severity: ReportSeverity | null;
    summary: string | null;
    expected: string | null;
    steps: string | null;
    transcript: string | null;
    screenshot: { method: string | null; annotated: boolean } | null;
    voiceNote: { durationMs: number | null; mimeType: string | null } | null;
    screenRecording: { durationMs: number | null; mimeType: string | null } | null;
    files: { name: string; type: string | null; size: number | null }[];
  };
  failedAttachments: { name: string; error: string | null }[];
  browser: ReportContext['browser'] | null;
  viewport: ReportContext['viewport'] | null;
  capturedAt: string;
}

export interface FeedbackConfig {
  project?: { name: string; keyPrefix?: string; [k: string]: unknown } | null;
  transcription?: { available: boolean; provider?: string | null };
  maxAttachmentBytes?: number;
  [k: string]: unknown;
}

export interface MyReport {
  id: string | number;
  kind: ReportKind;
  summary: string;
  triageState: string;
  createdAt: string;
  route?: string | null;
  ticketKey?: string | null;
  ticket?: { title?: string } | null;
}

export interface ReportTransport {
  fetchFeedbackConfig(): Promise<FeedbackConfig>;
  /** Must throw on failure and surface its own error UI (the widget stays silent). */
  submitFeedback(payload: ReportPayload): Promise<{ id: string | number; ticketKey: string | null; project?: unknown }>;
  uploadFeedbackFile(ticketKey: string | null, file: File): Promise<unknown>;
  finalizeFeedback(id: string | number): Promise<unknown>;
  transcribeAudio(blob: Blob, opts?: { filename?: string; language?: string }): Promise<{ text?: string; provider?: string; unavailable?: boolean; error?: string }>;
  fetchMyFeedback(): Promise<{ items: MyReport[] }>;
}

export interface ReportConfig {
  transport: ReportTransport;
  /** Default 'dev'. */
  buildSha?: string;
  /** Used in the form copy. Default 'KIDS'. */
  appName?: string;
  getImpersonation?: () => { email?: string | null } | null;
}

export interface ReportPrefill { kind?: ReportKind; summary?: string; severity?: ReportSeverity; noAutoShot?: boolean }

export function ReportProvider(props: { config: ReportConfig; children?: ReactNode }): ReactElement;
export function useReportConfig(): Required<Pick<ReportConfig, 'transport' | 'buildSha' | 'appName'>> & ReportConfig;

export function FeedbackWidget(props: { onOpenTicket?: (ticketKey: string) => void; hideButton?: boolean; config?: ReportConfig }): ReactElement;
export function FeedbackModal(props: {
  open: boolean; onClose: () => void; prefill?: ReportPrefill | null; onOpenTicket?: (ticketKey: string) => void;
  hidden: boolean; setHidden: (hidden: boolean) => void;
}): ReactElement;
export function MyReports(props: { onOpenTicket?: (ticketKey: string) => void; refreshKey?: unknown }): ReactElement;
export const OPEN_EVENT: 'kids:feedback:open';
export function openFeedback(prefill?: ReportPrefill | null): void;

export function RouteRecorder(props: { pathname?: string }): null;
export function useRouteTracker(pathname?: string): void;

export function installContextBuffer(): void;
export function installHistoryTracking(): void;
export function recordRoute(path: string): void;
export function recordError(level: string, message: unknown, extra?: Record<string, unknown>): void;
export function snapshotContext(): { errors: ContextEntry[]; routeHistory: RouteEntry[] };
export function lastUncaught(): ContextEntry | null;
export function pageMetadata(opts?: { buildSha?: string; getImpersonation?: ReportConfig['getImpersonation'] }): Omit<ReportContext, 'errors' | 'routeHistory'>;

export const STATE_COLORS: Record<string, string>;
export const STATE_LABELS: Record<string, string>;
export const KIND_LABELS: Record<string, string>;
export function relTime(iso: string): string;

export const WIDGET_VERSION: string;
export const REPORT_TOOL_KIND: 'report-tool';
export const REPORT_TOOL_PREFIX: 'Report tool: ';
export function clipText(v: unknown, max?: number): string | null;
export function errorRecord(stage: string | null, e: unknown): ReportToolError | null;
export function buildDiagnostics(input?: {
  state?: string; progress?: string | null; lastError?: ReportToolError | null;
  failedAttachments?: { name: string; error?: string | null }[];
  browser?: ReportContext['browser'] | null; viewport?: ReportContext['viewport'] | null;
  form?: Record<string, unknown>; now?: Date;
}): ReportToolDiagnostics;
export function buildReportToolPayload(input: {
  text?: string; diagnostics: ReportToolDiagnostics; pageUrl?: string | null; route?: string | null; context?: Partial<ReportContext>;
}): ReportPayload;
