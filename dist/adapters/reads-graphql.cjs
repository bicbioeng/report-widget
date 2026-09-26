var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/adapters/reads-graphql.js
var reads_graphql_exports = {};
__export(reads_graphql_exports, {
  buildDescription: () => buildDescription,
  createReadsGraphqlTransport: () => createReadsGraphqlTransport
});
module.exports = __toCommonJS(reads_graphql_exports);
var SUBMIT = `mutation SubmitFeedback($input: FeedbackInput!) {
  submitFeedback(input: $input) { id title description email screenshotUrl status createdAt }
}`;
var UPLOAD_URL = `query GetUploadUrl($filename: String!, $contentType: String!, $folder: String) {
  getUploadUrl(filename: $filename, contentType: $contentType, folder: $folder) { uploadUrl fileUrl key }
}`;
var PROJECT_NAMES = { gedb: "GeDB", bnfr: "BNFR" };
function buildDescription(payload, screenshotUrl, attachments, app) {
  const human = [
    payload.summary,
    payload.expected ? `
Expected: ${payload.expected}` : "",
    payload.steps ? `
Steps to reproduce:
${payload.steps}` : "",
    payload.transcript ? `
Voice note transcript: ${payload.transcript}` : ""
  ].filter(Boolean).join("\n");
  const rich = {
    ...app ? { app } : {},
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
    attachments
  };
  return `${human}

\`\`\`json
${JSON.stringify(rich, null, 2)}
\`\`\``;
}
function createReadsGraphqlTransport({
  client,
  gql,
  url,
  getHeaders,
  app,
  getEmail,
  folder,
  projectName
} = {}) {
  if (client ? typeof gql !== "function" : !url) {
    throw new Error("createReadsGraphqlTransport needs { client, gql } or { url }");
  }
  const tag = app ? String(app).toLowerCase() : null;
  const uploadFolder = folder || `${tag || "gedb"}-feedback`;
  const docs = {};
  const doc = (text) => docs[text] || (docs[text] = gql(text));
  async function run(text, variables, isMutation) {
    var _a, _b, _c;
    if (client) {
      const { data } = isMutation ? await client.mutate({ mutation: doc(text), variables }) : await client.query({ query: doc(text), variables, fetchPolicy: "no-cache" });
      return data;
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getHeaders ? await getHeaders() : {} },
      body: JSON.stringify({ query: text, variables })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || ((_a = body.errors) == null ? void 0 : _a.length)) throw new Error(((_c = (_b = body.errors) == null ? void 0 : _b[0]) == null ? void 0 : _c.message) || `GraphQL request failed (${res.status})`);
    return body.data;
  }
  let pending = null;
  let seq = 0;
  return {
    /** Static — no server-side feedback config endpoint. */
    async fetchFeedbackConfig() {
      return {
        projectPrefix: (tag || "gedb").toUpperCase(),
        project: { name: projectName || PROJECT_NAMES[tag || "gedb"] || tag },
        transcription: { available: false }
      };
    },
    /** Stashes the payload; the real mutation runs in finalizeFeedback. */
    async submitFeedback(payload) {
      seq += 1;
      const id = `local-${Date.now()}-${seq}`;
      pending = { id, payload, screenshotUrl: null, attachments: [] };
      return { id, ticketKey: null, project: (tag || "gedb").toUpperCase() };
    },
    /** getUploadUrl → PUT → fileUrl. ticketKey is ignored (always null). */
    async uploadFeedbackFile(_ticketKey, file) {
      const data = await run(UPLOAD_URL, {
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        folder: uploadFolder
      });
      const info = data == null ? void 0 : data.getUploadUrl;
      if (!(info == null ? void 0 : info.uploadUrl)) throw new Error("Failed to get an upload URL");
      const res = await fetch(info.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" }
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      if (pending) {
        pending.attachments.push({ name: file.name, url: info.fileUrl });
        if (!pending.screenshotUrl && /^screenshot/i.test(file.name)) pending.screenshotUrl = info.fileUrl;
      }
      return { url: info.fileUrl };
    },
    /** Every attachment URL is known now — create the record. */
    async finalizeFeedback(id) {
      const p = pending && pending.id === id ? pending : null;
      if (!p) return {};
      pending = null;
      let email = "";
      try {
        email = await (getEmail == null ? void 0 : getEmail()) || "";
      } catch {
      }
      await run(SUBMIT, {
        input: {
          title: tag ? `[${tag.toUpperCase()}] ${p.payload.summary}` : p.payload.summary,
          description: buildDescription(p.payload, p.screenshotUrl, p.attachments, tag),
          email,
          screenshotUrl: p.screenshotUrl
        }
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
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildDescription,
  createReadsGraphqlTransport
});
//# sourceMappingURL=reads-graphql.cjs.map