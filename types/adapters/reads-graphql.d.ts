import type { ReportTransport, ReportPayload } from '../index.js';

export interface ReadsGraphqlOptions {
  /** An ApolloClient (anything with query/mutate) — pass with gql. */
  client?: { query(opts: any): Promise<{ data: any }>; mutate(opts: any): Promise<{ data?: any }> };
  /** gql from @apollo/client (or graphql-tag). */
  gql?: (source: string) => unknown;
  /** Plain-fetch alternative to client. */
  url?: string;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  /** 'gedb' | 'bnfr' — prefixes the title "[GEDB] …" and tags the JSON. */
  app?: 'gedb' | 'bnfr' | (string & {});
  getEmail?: () => string | null | undefined | Promise<string | null | undefined>;
  /** S3 folder for getUploadUrl. Default `${app}-feedback`. */
  folder?: string;
  /** Header text project name. Default GeDB / BNFR. */
  projectName?: string;
}

export function createReadsGraphqlTransport(opts: ReadsGraphqlOptions): ReportTransport;
export function buildDescription(payload: ReportPayload, screenshotUrl: string | null, attachments: { name: string; url: string }[], app?: string | null): string;
