import type { ReportTransport } from '../index.js';

export function createKidsTransport(opts: {
  /** KIDS REST base URL, e.g. https://…/api */
  baseUrl: string;
  /** Auth (+ impersonation) headers. freshToken is true before the audio upload. */
  getAuthHeaders: (opts?: { freshToken?: boolean }) => Promise<Record<string, string>> | Record<string, string>;
  /** Error UI for non-silent calls. Default: antd message.error, deduped for 5 s. */
  onError?: (text: string) => void;
}): ReportTransport & {
  fetchFeedbackConfig(opts?: { force?: boolean }): ReturnType<ReportTransport['fetchFeedbackConfig']>;
  /** PATCH /feedback/:id/state. Toasts the server error and rejects on failure. */
  updateFeedbackState(id: string | number, state: string): Promise<unknown>;
  /** PATCH /agile/tickets/:key with { assigneeId }; null unassigns. Toasts the server error and rejects on failure. */
  updateTicketAssignee(ticketKey: string, assigneeId: string | number | null): Promise<unknown>;
};
