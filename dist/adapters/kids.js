// src/adapters/kids.js
import { message } from "antd";
function createKidsTransport({ baseUrl, getAuthHeaders, onError } = {}) {
  if (!baseUrl || typeof getAuthHeaders !== "function") {
    throw new Error("createKidsTransport needs { baseUrl, getAuthHeaders }");
  }
  const recentToasts = /* @__PURE__ */ new Map();
  const toastError = onError || ((text) => {
    const now = Date.now();
    const last = recentToasts.get(text) || 0;
    if (now - last < 5e3) return;
    recentToasts.set(text, now);
    message.error(text, 4);
  });
  const headersFor = async (opts) => ({ "Content-Type": "application/json", ...await getAuthHeaders(opts) });
  async function request(path, { method = "GET", body, silent = false } = {}) {
    let res;
    try {
      const headers = await headersFor();
      res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body !== void 0 ? JSON.stringify(body) : void 0
      });
    } catch (networkErr) {
      if (!silent) toastError("Network error \u2014 the KIDS server is unreachable.");
      throw networkErr;
    }
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const text = payload.error || `Request failed (${res.status})`;
      if (!silent) toastError(text);
      const err = new Error(text);
      err.status = res.status;
      throw err;
    }
    return res.json().catch(() => ({}));
  }
  let configCache = null;
  return {
    /** What the widget needs to know: landing project, transcription, labels. */
    async fetchFeedbackConfig({ force = false } = {}) {
      if (configCache && !force) return configCache;
      configCache = await request("/feedback/config", { silent: true });
      return configCache;
    },
    /** Create the report + ticket. Returns { id, ticketKey, project }. */
    submitFeedback(payload) {
      return request("/feedback", { method: "POST", body: payload });
    },
    /** After the uploads: context comment + AI triage. */
    finalizeFeedback(id) {
      return request(`/feedback/${id}/finalize`, { method: "POST", silent: true });
    },
    fetchMyFeedback() {
      return request("/feedback/mine", { silent: true });
    },
    /** Audio → text. Resolves { text, provider } or { unavailable: true }. */
    async transcribeAudio(blob, { filename = "voice.webm", language = "en" } = {}) {
      const headers = await headersFor({ freshToken: true });
      delete headers["Content-Type"];
      const send = async () => {
        const form = new FormData();
        form.append("audio", blob, filename);
        form.append("language", language);
        return fetch(`${baseUrl}/feedback/transcribe`, { method: "POST", headers, body: form });
      };
      let res;
      try {
        res = await send();
      } catch {
        await new Promise((r) => setTimeout(r, 1200));
        try {
          res = await send();
        } catch {
          throw new Error("the transcription service could not be reached");
        }
      }
      const body = await res.json().catch(() => ({}));
      if (res.status === 503 && body.unavailable) return { unavailable: true, error: body.error };
      if (!res.ok) throw new Error(body.error || `Transcription failed (${res.status})`);
      return body;
    },
    /** Upload one file to the report's ticket (presign → S3 → register). */
    async uploadFeedbackFile(ticketKey, file) {
      const key = encodeURIComponent(ticketKey);
      const { uploadUrl, s3Key } = await request(
        `/agile/tickets/${key}/attachments/presign`,
        { method: "POST", body: { filename: file.name, contentType: file.type || "application/octet-stream" } }
      );
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file
      });
      if (!put.ok) throw new Error(`S3 upload failed (${put.status})`);
      return request(`/agile/tickets/${key}/attachments`, {
        method: "POST",
        body: { s3Key, filename: file.name, contentType: file.type, sizeBytes: file.size }
      });
    }
  };
}
export {
  createKidsTransport
};
//# sourceMappingURL=kids.js.map