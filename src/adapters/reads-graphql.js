/**
 * READS GraphQL transport — a port of reads-germanium-database
 * src/utils/feedbackApi.js, for apps whose backend only has the single-shot
 * `submitFeedback(input: FeedbackInput!)` mutation + `getUploadUrl`.
 *
 *   createReadsGraphqlTransport({
 *     client, gql,        // an ApolloClient + @apollo/client's gql …
 *     url, getHeaders,    // … or a GraphQL endpoint for plain fetch
 *     app,                // 'gedb' | 'bnfr' — title becomes "[GEDB] …"
 *     getEmail?,          // () => string | Promise<string>
 *     folder?,            // S3 folder, default `${app}-feedback`
 *     projectName?,       // shown in the header, default GeDB / BNFR
 *   })
 *
 * There is no ticket and no update-after-create, but the widget uploads
 * attachments AFTER submitFeedback. So submitFeedback stashes the text,
 * uploadFeedbackFile collects URLs, and finalizeFeedback sends the one
 * mutation once every URL is known. ticketKey is always null.
 */

const SUBMIT = `mutation SubmitFeedback($input: FeedbackInput!) {
  submitFeedback(input: $input) { id title description email screenshotUrl status createdAt }
}`;
const UPLOAD_URL = `query GetUploadUrl($filename: String!, $contentType: String!, $folder: String) {
  getUploadUrl(filename: $filename, contentType: $contentType, folder: $folder) { uploadUrl fileUrl key }
}`;
const PROJECT_NAMES = { gedb: 'GeDB', bnfr: 'BNFR' };

export function buildDescription(payload, screenshotUrl, attachments, app) {
  const human = [
    payload.summary,
    payload.expected ? `\nExpected: ${payload.expected}` : '',
    payload.steps ? `\nSteps to reproduce:\n${payload.steps}` : '',
    payload.transcript ? `\nVoice note transcript: ${payload.transcript}` : '',
  ].filter(Boolean).join('\n');

  const rich = {
    ...(app ? { app } : {}),
    kind: payload.kind,
    severity: payload.severity,
    summary: payload.summary,
    expected: payload.expected,
    steps: payload.steps,
    transcript: payload.transcript,
    transcriptSource: payload.transcriptSource,
    pageUrl: payload.pageUrl,
    route: payload.route,
    context: payload.context,
    screenshotUrl,
    attachments,
  };
  return `${human}\n\n\`\`\`json\n${JSON.stringify(rich, null, 2)}\n\`\`\``;
}

export function createReadsGraphqlTransport({
  client, gql, url, getHeaders, app, getEmail, folder, projectName,
} = {}) {
  if (client ? typeof gql !== 'function' : !url) {
    throw new Error('createReadsGraphqlTransport needs { client, gql } or { url }');
  }
  const tag = app ? String(app).toLowerCase() : null;
  const uploadFolder = folder || `${tag || 'gedb'}-feedback`;
  const docs = {};
  const doc = (text) => (docs[text] ||= gql(text));

  async function run(text, variables, isMutation) {
    if (client) {
      const { data } = isMutation
        ? await client.mutate({ mutation: doc(text), variables })
        : await client.query({ query: doc(text), variables, fetchPolicy: 'no-cache' });
      return data;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(getHeaders ? await getHeaders() : {}) },
      body: JSON.stringify({ query: text, variables }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.errors?.length) throw new Error(body.errors?.[0]?.message || `GraphQL request failed (${res.status})`);
    return body.data;
  }

  // ponytail: one in-flight report per transport — the widget disables Send
  // while submitting. Concurrent submits would need a Map keyed by id.
  let pending = null;
  let seq = 0;

  return {
    /** Static — no server-side feedback config endpoint. */
    async fetchFeedbackConfig() {
      return {
        projectPrefix: (tag || 'gedb').toUpperCase(),
        project: { name: projectName || PROJECT_NAMES[tag || 'gedb'] || tag },
        transcription: { available: false },
      };
    },

    /** Stashes the payload; the real mutation runs in finalizeFeedback. */
    async submitFeedback(payload) {
      seq += 1;
      const id = `local-${Date.now()}-${seq}`;
      pending = { id, payload, screenshotUrl: null, attachments: [] };
      return { id, ticketKey: null, project: (tag || 'gedb').toUpperCase() };
    },

    /** getUploadUrl → PUT → fileUrl. ticketKey is ignored (always null). */
    async uploadFeedbackFile(_ticketKey, file) {
      const data = await run(UPLOAD_URL, {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        folder: uploadFolder,
      });
      const info = data?.getUploadUrl;
      if (!info?.uploadUrl) throw new Error('Failed to get an upload URL');
      const res = await fetch(info.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      if (pending) {
        pending.attachments.push({ name: file.name, url: info.fileUrl });
        // The widget names the primary shot screenshot(-annotated).png.
        if (!pending.screenshotUrl && /^screenshot/i.test(file.name)) pending.screenshotUrl = info.fileUrl;
      }
      return { url: info.fileUrl };
    },

    /** Every attachment URL is known now — create the record. */
    async finalizeFeedback(id) {
      const p = pending && pending.id === id ? pending : null;
      if (!p) return {};
      pending = null;
      let email = '';
      try { email = (await getEmail?.()) || ''; } catch { /* not signed in */ }
      await run(SUBMIT, {
        input: {
          title: tag ? `[${tag.toUpperCase()}] ${p.payload.summary}` : p.payload.summary,
          description: buildDescription(p.payload, p.screenshotUrl, p.attachments, tag),
          email,
          screenshotUrl: p.screenshotUrl,
        },
      }, true);
      return {};
    },

    /** No transcription service — the widget keeps the browser's captions. */
    async transcribeAudio() {
      return { unavailable: true };
    },

    /** No "mine" filter server-side; keep My reports empty rather than show everyone's. */
    async fetchMyFeedback() {
      return { items: [] };
    },
  };
}
