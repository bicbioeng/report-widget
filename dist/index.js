"use client";

// src/FeedbackWidget.jsx
import React6, { useCallback as useCallback4, useEffect as useEffect7, useState as useState6 } from "react";
import { Tooltip as Tooltip3 } from "antd";
import { MessageOutlined } from "@ant-design/icons";

// src/FeedbackModal.jsx
import React5, { useCallback as useCallback3, useEffect as useEffect6, useMemo as useMemo2, useRef as useRef3, useState as useState5 } from "react";
import { Modal, Input as Input2, Button as Button4, Tabs, Typography as Typography3, Space as Space3, Tooltip as Tooltip2, message, Collapse, Popover, Upload, Alert as Alert2 } from "antd";
import {
  BugOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
  CameraOutlined,
  EditOutlined,
  ReloadOutlined,
  DeleteOutlined as DeleteOutlined2,
  PaperClipOutlined,
  VideoCameraOutlined,
  StopOutlined as StopOutlined2,
  CheckCircleFilled,
  CloseOutlined as CloseOutlined2,
  LoadingOutlined as LoadingOutlined2
} from "@ant-design/icons";

// src/Annotator.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Space, Tooltip } from "antd";
import {
  BorderOutlined,
  ArrowRightOutlined,
  HighlightOutlined,
  EyeInvisibleOutlined,
  FontSizeOutlined,
  UndoOutlined,
  CheckOutlined,
  CloseOutlined
} from "@ant-design/icons";
import { jsx, jsxs } from "react/jsx-runtime";
var COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#0f172a", "#ffffff"];
var TOOLS = [
  { key: "rect", label: "Box", icon: /* @__PURE__ */ jsx(BorderOutlined, {}) },
  { key: "arrow", label: "Arrow", icon: /* @__PURE__ */ jsx(ArrowRightOutlined, {}) },
  { key: "pen", label: "Draw", icon: /* @__PURE__ */ jsx(HighlightOutlined, {}) },
  { key: "blur", label: "Blur", icon: /* @__PURE__ */ jsx(EyeInvisibleOutlined, {}) },
  { key: "text", label: "Text", icon: /* @__PURE__ */ jsx(FontSizeOutlined, {}) }
];
function drawShape(ctx, s, blurred, lineScale) {
  ctx.save();
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = 3 * lineScale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.type === "rect") {
    ctx.strokeRect(Math.min(s.x1, s.x2), Math.min(s.y1, s.y2), Math.abs(s.x2 - s.x1), Math.abs(s.y2 - s.y1));
  } else if (s.type === "arrow") {
    const head = 14 * lineScale;
    const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x2, s.y2);
    ctx.lineTo(s.x2 - head * Math.cos(ang - Math.PI / 6), s.y2 - head * Math.sin(ang - Math.PI / 6));
    ctx.lineTo(s.x2 - head * Math.cos(ang + Math.PI / 6), s.y2 - head * Math.sin(ang + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  } else if (s.type === "pen") {
    ctx.beginPath();
    s.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
  } else if (s.type === "blur" && blurred) {
    const x = Math.min(s.x1, s.x2), y = Math.min(s.y1, s.y2);
    const w = Math.abs(s.x2 - s.x1), h = Math.abs(s.y2 - s.y1);
    if (w > 2 && h > 2) ctx.drawImage(blurred, x, y, w, h, x, y, w, h);
  } else if (s.type === "text") {
    const size = Math.round(18 * lineScale);
    ctx.font = `600 ${size}px Inter, sans-serif`;
    ctx.lineWidth = 4 * lineScale;
    ctx.strokeStyle = s.color === "#ffffff" ? "#0f172a" : "rgba(255,255,255,0.9)";
    ctx.strokeText(s.text, s.x, s.y);
    ctx.fillText(s.text, s.x, s.y);
  }
  ctx.restore();
}
function Annotator({ src, onDone, onCancel }) {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const blurRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState("rect");
  const [color, setColor] = useState(COLORS[0]);
  const [shapes, setShapes] = useState([]);
  const [draft, setDraft] = useState(null);
  const [textAt, setTextAt] = useState(null);
  const [textValue, setTextValue] = useState("");
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const c = canvasRef.current;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const b = document.createElement("canvas");
      b.width = img.naturalWidth;
      b.height = img.naturalHeight;
      const bctx = b.getContext("2d");
      bctx.filter = `blur(${Math.max(8, Math.round(img.naturalWidth / 120))}px)`;
      bctx.drawImage(img, 0, 0);
      blurRef.current = b;
      setReady(true);
    };
    img.src = src;
  }, [src]);
  const lineScale = useMemo(() => imgRef.current ? Math.max(1, imgRef.current.naturalWidth / 1400) : 1, [ready]);
  const render = useCallback(() => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    for (const s of shapes) drawShape(ctx, s, blurRef.current, lineScale);
    if (draft) drawShape(ctx, draft, blurRef.current, lineScale);
  }, [shapes, draft, lineScale]);
  useEffect(() => {
    if (ready) render();
  }, [ready, render]);
  const toCanvas = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * c.width;
    const y = (e.clientY - r.top) / r.height * c.height;
    return { x, y, cx: e.clientX - r.left, cy: e.clientY - r.top };
  };
  const onPointerDown = (e) => {
    var _a, _b;
    if (!ready || textAt) return;
    e.preventDefault();
    const p = toCanvas(e);
    if (tool === "text") {
      setTextAt(p);
      setTextValue("");
      return;
    }
    (_b = (_a = e.currentTarget).setPointerCapture) == null ? void 0 : _b.call(_a, e.pointerId);
    if (tool === "pen") setDraft({ type: "pen", color, points: [{ x: p.x, y: p.y }] });
    else setDraft({ type: tool, color, x1: p.x, y1: p.y, x2: p.x, y2: p.y });
  };
  const onPointerMove = (e) => {
    if (!draft) return;
    const p = toCanvas(e);
    setDraft((d) => d.type === "pen" ? { ...d, points: [...d.points, { x: p.x, y: p.y }] } : { ...d, x2: p.x, y2: p.y });
  };
  const onPointerUp = () => {
    if (!draft) return;
    const tooSmall = draft.type !== "pen" && Math.abs(draft.x2 - draft.x1) < 3 && Math.abs(draft.y2 - draft.y1) < 3;
    if (!tooSmall) setShapes((s) => [...s, draft]);
    setDraft(null);
  };
  const commitText = () => {
    if (textAt && textValue.trim()) setShapes((s) => [...s, { type: "text", color, x: textAt.x, y: textAt.y, text: textValue.trim() }]);
    setTextAt(null);
    setTextValue("");
  };
  const finish = () => {
    setDraft(null);
    requestAnimationFrame(() => {
      render();
      canvasRef.current.toBlob((blob) => onDone(blob), "image/png");
    });
  };
  return /* @__PURE__ */ jsxs("div", { className: "kf-annotator", children: [
    /* @__PURE__ */ jsxs("div", { className: "kf-tools", children: [
      TOOLS.map((t) => /* @__PURE__ */ jsxs("button", { type: "button", className: `kf-tool${tool === t.key ? " active" : ""}`, onClick: () => setTool(t.key), children: [
        t.icon,
        " ",
        t.label
      ] }, t.key)),
      /* @__PURE__ */ jsx("span", { style: { width: 8 } }),
      COLORS.map((c) => /* @__PURE__ */ jsx(Tooltip, { title: c, children: /* @__PURE__ */ jsx("span", { className: `kf-swatch${color === c ? " active" : ""}`, style: { background: c }, onClick: () => setColor(c) }) }, c)),
      /* @__PURE__ */ jsx("span", { style: { flex: 1 } }),
      /* @__PURE__ */ jsx(Button, { size: "small", icon: /* @__PURE__ */ jsx(UndoOutlined, {}), disabled: !shapes.length, onClick: () => setShapes((s) => s.slice(0, -1)), children: "Undo" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "kf-stage", ref: stageRef, children: [
      /* @__PURE__ */ jsx(
        "canvas",
        {
          ref: canvasRef,
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerLeave: onPointerUp
        }
      ),
      textAt && /* @__PURE__ */ jsx("div", { className: "kf-text-input", style: { left: textAt.cx, top: textAt.cy - 18 }, children: /* @__PURE__ */ jsx(
        Input,
        {
          autoFocus: true,
          size: "small",
          value: textValue,
          placeholder: "Type, then Enter",
          style: { width: 200 },
          onChange: (e) => setTextValue(e.target.value),
          onPressEnter: commitText,
          onBlur: commitText,
          onKeyDown: (e) => {
            if (e.key === "Escape") {
              setTextAt(null);
              setTextValue("");
            }
          }
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs(Space, { style: { justifyContent: "flex-end", width: "100%" }, children: [
      /* @__PURE__ */ jsx(Button, { icon: /* @__PURE__ */ jsx(CloseOutlined, {}), onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ jsx(Button, { type: "primary", icon: /* @__PURE__ */ jsx(CheckOutlined, {}), onClick: finish, disabled: !ready, children: "Use this screenshot" })
    ] })
  ] });
}

// src/VoicePanel.jsx
import React3, { useEffect as useEffect4, useState as useState3 } from "react";
import { Button as Button2, Space as Space2, Typography, Alert } from "antd";
import { AudioOutlined, StopOutlined, DeleteOutlined, LoadingOutlined } from "@ant-design/icons";

// src/recorders.js
import { useCallback as useCallback2, useEffect as useEffect2, useRef as useRef2, useState as useState2 } from "react";
var AUDIO_MIMES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"];
var VIDEO_MIMES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
function pickMime(candidates) {
  if (typeof MediaRecorder === "undefined") return null;
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
}
function extensionFor(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("mp4")) return "mp4";
  if (m.includes("ogg")) return "ogg";
  return "webm";
}
function supportsRecording() {
  var _a;
  return typeof MediaRecorder !== "undefined" && Boolean((_a = navigator.mediaDevices) == null ? void 0 : _a.getUserMedia);
}
function supportsSpeech() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}
function useMediaRecorder({ kind = "audio", maxMs = 5 * 60 * 1e3, captions = false } = {}) {
  const [status, setStatus] = useState2("idle");
  const [elapsedMs, setElapsedMs] = useState2(0);
  const [error, setError] = useState2(null);
  const [result, setResult] = useState2(null);
  const [liveCaption, setLiveCaption] = useState2("");
  const [level, setLevel] = useState2(0);
  const recorderRef = useRef2(null);
  const streamRef = useRef2(null);
  const chunksRef = useRef2([]);
  const startedAtRef = useRef2(0);
  const timerRef = useRef2(null);
  const speechRef = useRef2(null);
  const finalCaptionRef = useRef2("");
  const audioCtxRef = useRef2(null);
  const rafRef = useRef2(null);
  const cleanup = useCallback2(() => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(rafRef.current);
    if (speechRef.current) {
      try {
        speechRef.current.stop();
      } catch {
      }
      speechRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {
      });
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }, []);
  useEffect2(() => cleanup, [cleanup]);
  const stop = useCallback2(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return;
    setStatus("processing");
    rec.stop();
  }, []);
  const start = useCallback2(async () => {
    setError(null);
    setResult(null);
    setLiveCaption("");
    finalCaptionRef.current = "";
    chunksRef.current = [];
    setStatus("requesting");
    try {
      let stream;
      if (kind === "screen") {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 15 },
          audio: false,
          preferCurrentTab: true,
          selfBrowserSurface: "include",
          surfaceSwitching: "include"
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      }
      streamRef.current = stream;
      const mimeType = pickMime(kind === "screen" ? VIDEO_MIMES : AUDIO_MIMES) || void 0;
      const rec = new MediaRecorder(stream, {
        ...mimeType ? { mimeType } : {},
        ...kind === "screen" ? { videoBitsPerSecond: 1e6 } : { audioBitsPerSecond: 64e3 }
      });
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const durationMs = Date.now() - startedAtRef.current;
        const type = rec.mimeType || mimeType || (kind === "screen" ? "video/webm" : "audio/webm");
        const blob = new Blob(chunksRef.current, { type });
        cleanup();
        setStatus("idle");
        if (!blob.size) {
          setError("The recording came out empty. Try again.");
          return;
        }
        setResult({ blob, mimeType: type, durationMs, captions: finalCaptionRef.current.trim() || null });
      };
      rec.onerror = (e) => {
        var _a;
        setError(((_a = e.error) == null ? void 0 : _a.message) || "Recording failed.");
        cleanup();
        setStatus("idle");
      };
      stream.getVideoTracks().forEach((t) => {
        t.onended = () => stop();
      });
      startedAtRef.current = Date.now();
      rec.start(1e3);
      setStatus("recording");
      setElapsedMs(0);
      timerRef.current = setInterval(() => {
        const ms = Date.now() - startedAtRef.current;
        setElapsedMs(ms);
        if (ms >= maxMs) stop();
      }, 250);
      if (kind === "audio") {
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          const ctx = new Ctx();
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          src.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i += 1) {
              const v = (data[i] - 128) / 128;
              sum += v * v;
            }
            setLevel(Math.min(1, Math.sqrt(sum / data.length) * 3));
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        } catch {
        }
        if (captions && supportsSpeech()) {
          try {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            const sr = new SR();
            sr.continuous = true;
            sr.interimResults = true;
            sr.lang = navigator.language || "en-US";
            sr.onresult = (ev) => {
              let interim = "";
              for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
                const r = ev.results[i];
                if (r.isFinal) finalCaptionRef.current += `${r[0].transcript} `;
                else interim += r[0].transcript;
              }
              setLiveCaption(`${finalCaptionRef.current}${interim}`.trim());
            };
            sr.onend = () => {
              var _a;
              if (((_a = recorderRef.current) == null ? void 0 : _a.state) === "recording") {
                try {
                  sr.start();
                } catch {
                }
              }
            };
            sr.onerror = () => {
            };
            sr.start();
            speechRef.current = sr;
          } catch {
          }
        }
      }
    } catch (err) {
      cleanup();
      setStatus("idle");
      const denied = (err == null ? void 0 : err.name) === "NotAllowedError" || (err == null ? void 0 : err.name) === "SecurityError";
      setError(denied ? kind === "screen" ? "Screen recording was cancelled." : "Microphone access was denied. Allow it in the browser and try again." : (err == null ? void 0 : err.message) || "Could not start recording.");
    }
  }, [kind, maxMs, captions, cleanup, stop]);
  const reset = useCallback2(() => {
    setResult(null);
    setError(null);
    setElapsedMs(0);
    setLiveCaption("");
  }, []);
  return { status, start, stop, reset, elapsedMs, error, result, liveCaption, level };
}
function formatMs(ms) {
  const s = Math.floor(ms / 1e3);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// src/ReportProvider.jsx
import React2, { createContext, useContext, useEffect as useEffect3 } from "react";

// src/contextBuffer.js
var MAX_ENTRIES = 200;
var MAX_ROUTES = 30;
var MAX_MESSAGE = 600;
var state = { installed: false, historyPatched: false, entries: [], routes: [] };
function push(entry) {
  state.entries.push({ at: Date.now(), ...entry });
  if (state.entries.length > MAX_ENTRIES) state.entries.splice(0, state.entries.length - MAX_ENTRIES);
}
function fmt(v) {
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
function joinArgs(args) {
  return args.map(fmt).join(" ").slice(0, MAX_MESSAGE);
}
function safeUrl(input) {
  try {
    const raw = typeof input === "string" ? input : (input == null ? void 0 : input.url) || String(input);
    const u = new URL(raw, window.location.origin);
    const params = [...u.searchParams.keys()].filter((k) => !/token|key|secret|auth|signature|credential/i.test(k));
    const q = params.length ? `?${params.map((k) => `${k}=\u2026`).join("&")}` : "";
    return `${u.origin === window.location.origin ? "" : u.origin}${u.pathname}${q}`.slice(0, 200);
  } catch {
    return String(input).slice(0, 120);
  }
}
function recordRoute(path) {
  const last = state.routes[state.routes.length - 1];
  if (last && last.path === path) return;
  state.routes.push({ at: Date.now(), path });
  if (state.routes.length > MAX_ROUTES) state.routes.splice(0, state.routes.length - MAX_ROUTES);
}
function recordError(level, message2, extra = {}) {
  push({ level, message: String(message2).slice(0, MAX_MESSAGE), ...extra });
}
function installContextBuffer() {
  if (state.installed || typeof window === "undefined") return;
  state.installed = true;
  for (const level of ["error", "warn"]) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      try {
        push({ level: `console.${level}`, message: joinArgs(args) });
      } catch {
      }
      original(...args);
    };
  }
  window.addEventListener("error", (e) => {
    push({
      level: "uncaught",
      message: e.message || fmt(e.error) || "Unknown error",
      source: e.filename ? `${e.filename.split("/").pop()}:${e.lineno}:${e.colno}` : void 0
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    push({ level: "unhandledrejection", message: fmt(e.reason) });
  });
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const method = ((init == null ? void 0 : init.method) || typeof input !== "string" && (input == null ? void 0 : input.method) || "GET").toUpperCase();
    const url = safeUrl(input);
    let res;
    try {
      res = await originalFetch(input, init);
    } catch (err) {
      push({ level: "network", message: `${method} ${url} \u2192 ${fmt(err)}` });
      throw err;
    }
    try {
      if (!res.ok) {
        push({ level: "fetch", message: `${method} ${url} \u2192 ${res.status} ${res.statusText || ""}`.trim() });
      } else if (/graphql/i.test(url) && (res.headers.get("content-type") || "").includes("json")) {
        res.clone().json().then((j) => {
          if (Array.isArray(j == null ? void 0 : j.errors) && j.errors.length) {
            push({ level: "graphql", message: `${method} ${url} \u2192 ${j.errors.map((e) => e.message).join("; ")}` });
          }
        }).catch(() => {
        });
      }
    } catch {
    }
    return res;
  };
  recordRoute(window.location.pathname);
}
function installHistoryTracking() {
  if (state.historyPatched || typeof window === "undefined") return;
  state.historyPatched = true;
  const rec = () => {
    try {
      recordRoute(window.location.pathname);
    } catch {
    }
  };
  for (const method of ["pushState", "replaceState"]) {
    const original = window.history[method];
    window.history[method] = function patched(...args) {
      const out = original.apply(this, args);
      rec();
      return out;
    };
  }
  window.addEventListener("popstate", rec);
  rec();
}
function snapshotContext() {
  return {
    errors: state.entries.slice(-60),
    routeHistory: state.routes.slice(-20)
  };
}
function lastUncaught() {
  for (let i = state.entries.length - 1; i >= 0; i -= 1) {
    if (["uncaught", "unhandledrejection"].includes(state.entries[i].level)) return state.entries[i];
  }
  return null;
}

// src/ReportProvider.jsx
import { jsx as jsx2 } from "react/jsx-runtime";
var ReportContext = createContext(null);
function ReportProvider({ config, children }) {
  useEffect3(() => {
    installContextBuffer();
  }, []);
  return /* @__PURE__ */ jsx2(ReportContext.Provider, { value: config, children });
}
function useReportConfig() {
  const config = useContext(ReportContext);
  if (!(config == null ? void 0 : config.transport)) {
    throw new Error("@bicbioeng/report-widget: wrap the app in <ReportProvider config={{ transport }}> (or pass config to <FeedbackWidget>).");
  }
  return { buildSha: "dev", appName: "KIDS", getImpersonation: null, ...config };
}

// src/VoicePanel.jsx
import { Fragment, jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
var { Text } = Typography;
function VoicePanel({ value, onChange, transcriptionAvailable }) {
  const { transport } = useReportConfig();
  const rec = useMediaRecorder({ kind: "audio", captions: true, maxMs: 5 * 60 * 1e3 });
  const [transcribing, setTranscribing] = useState3(false);
  const [note, setNote] = useState3(null);
  useEffect4(() => {
    if (!rec.result) return;
    const { blob, mimeType, durationMs, captions } = rec.result;
    const filename = `voice-note.${extensionFor(mimeType)}`;
    onChange({ blob, mimeType, durationMs, filename, transcript: captions || "", transcriptSource: captions ? "browser" : null });
    rec.reset();
    (async () => {
      setTranscribing(true);
      setNote(null);
      try {
        const out = await transport.transcribeAudio(blob, { filename });
        if (out.unavailable) {
          setNote(captions ? "Transcribed by your browser. An admin can add a transcription key under AI Settings for higher accuracy." : "No transcription is configured on the server and this browser has no speech recognition \u2014 the recording is attached as audio.");
        } else if (out.text) {
          onChange((prev) => ({ ...prev || {}, transcript: out.text, transcriptSource: out.provider }));
          setNote(null);
        }
      } catch (e) {
        setNote(captions ? `Kept your browser's captions \u2014 ${e.message}. The recording is attached either way.` : `Transcription failed: ${e.message}. The recording is still attached to the report.`);
      } finally {
        setTranscribing(false);
      }
    })();
  }, [rec.result]);
  if (!supportsRecording()) {
    return /* @__PURE__ */ jsx3(Text, { type: "secondary", style: { fontSize: 12.5 }, children: "Voice notes need a browser with microphone recording." });
  }
  const recording = rec.status === "recording";
  return /* @__PURE__ */ jsxs2("div", { style: { display: "grid", gap: 8 }, children: [
    /* @__PURE__ */ jsxs2("div", { className: "kf-voice", children: [
      recording ? /* @__PURE__ */ jsxs2(Button2, { danger: true, icon: /* @__PURE__ */ jsx3(StopOutlined, {}), onClick: rec.stop, children: [
        "Stop ",
        formatMs(rec.elapsedMs)
      ] }) : /* @__PURE__ */ jsx3(Button2, { icon: /* @__PURE__ */ jsx3(AudioOutlined, {}), loading: rec.status === "requesting", onClick: rec.start, disabled: transcribing, children: value ? "Record again" : "Describe it by voice" }),
      recording && /* @__PURE__ */ jsx3("div", { className: "kf-level", children: /* @__PURE__ */ jsx3("i", { style: { width: `${Math.round(rec.level * 100)}%` } }) }),
      !recording && value && /* @__PURE__ */ jsxs2(Fragment, { children: [
        /* @__PURE__ */ jsxs2(Text, { type: "secondary", style: { fontSize: 12 }, children: [
          value.filename,
          " \xB7 ",
          formatMs(value.durationMs || 0)
        ] }),
        /* @__PURE__ */ jsx3(Button2, { size: "small", type: "text", icon: /* @__PURE__ */ jsx3(DeleteOutlined, {}), onClick: () => onChange(null) })
      ] }),
      transcribing && /* @__PURE__ */ jsxs2(Text, { type: "secondary", style: { fontSize: 12 }, children: [
        /* @__PURE__ */ jsx3(LoadingOutlined, {}),
        " Transcribing\u2026"
      ] })
    ] }),
    recording && /* @__PURE__ */ jsx3("div", { className: "kf-caption", children: rec.liveCaption || (supportsSpeech() ? "Listening\u2026" : "Recording (live captions are not available in this browser).") }),
    !recording && !value && /* @__PURE__ */ jsx3(Text, { type: "secondary", style: { fontSize: 12 }, children: transcriptionAvailable ? "Say what happened \u2014 the recording is attached and transcribed into the report." : supportsSpeech() ? "Say what happened \u2014 your browser captions it and the recording is attached." : "Say what happened \u2014 the recording is attached to the report." }),
    rec.error && /* @__PURE__ */ jsx3(Alert, { type: "warning", showIcon: true, message: rec.error, style: { borderRadius: 8 } }),
    note && /* @__PURE__ */ jsx3(Alert, { type: "info", showIcon: true, message: note, style: { borderRadius: 8 } }),
    (value == null ? void 0 : value.transcript) && !recording && /* @__PURE__ */ jsxs2(Space2, { direction: "vertical", size: 2, style: { width: "100%" }, children: [
      /* @__PURE__ */ jsxs2(Text, { type: "secondary", style: { fontSize: 12 }, children: [
        "Transcript",
        value.transcriptSource ? ` (${value.transcriptSource})` : "",
        " \u2014 you can edit it:"
      ] }),
      /* @__PURE__ */ jsx3(
        "textarea",
        {
          className: "ant-input",
          style: { width: "100%", borderRadius: 8, minHeight: 64, fontSize: 13 },
          value: value.transcript,
          onChange: (e) => onChange({ ...value, transcript: e.target.value })
        }
      )
    ] })
  ] });
}

// src/MyReports.jsx
import React4, { useEffect as useEffect5, useState as useState4 } from "react";
import { Empty, Skeleton, Tag, Typography as Typography2, Button as Button3 } from "antd";
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
var { Text: Text2 } = Typography2;
var STATE_COLORS = { new: "blue", acknowledged: "geekblue", in_progress: "gold", done: "green", dismissed: "default" };
var STATE_LABELS = { new: "New", acknowledged: "Acknowledged", in_progress: "In progress", done: "Done", dismissed: "Dismissed" };
var KIND_LABELS = { bug: "Bug", idea: "Idea", question: "Question" };
function relTime(iso) {
  const d = new Date(iso);
  const s = Math.round((Date.now() - d.getTime()) / 1e3);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return d.toLocaleDateString();
}
function MyReports({ onOpenTicket, refreshKey }) {
  const { transport } = useReportConfig();
  const [items, setItems] = useState4(null);
  useEffect5(() => {
    let alive = true;
    transport.fetchMyFeedback().then((r) => {
      if (alive) setItems(r.items || []);
    }).catch(() => {
      if (alive) setItems([]);
    });
    return () => {
      alive = false;
    };
  }, [refreshKey]);
  if (items === null) return /* @__PURE__ */ jsx4(Skeleton, { active: true, paragraph: { rows: 3 } });
  if (!items.length) return /* @__PURE__ */ jsx4(Empty, { description: "You have not reported anything yet.", image: Empty.PRESENTED_IMAGE_SIMPLE });
  return /* @__PURE__ */ jsxs3("div", { children: [
    items.map((r) => {
      var _a;
      return /* @__PURE__ */ jsxs3("div", { className: "kf-report", children: [
        /* @__PURE__ */ jsx4(Tag, { color: STATE_COLORS[r.triageState] || "default", style: { margin: 0 }, children: STATE_LABELS[r.triageState] || r.triageState }),
        /* @__PURE__ */ jsxs3("div", { style: { minWidth: 0 }, children: [
          /* @__PURE__ */ jsx4("div", { className: "t", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: ((_a = r.ticket) == null ? void 0 : _a.title) || r.summary }),
          /* @__PURE__ */ jsxs3("div", { className: "s", children: [
            KIND_LABELS[r.kind] || r.kind,
            " \xB7 ",
            relTime(r.createdAt),
            r.route ? ` \xB7 ${r.route}` : ""
          ] })
        ] }),
        r.ticketKey && /* @__PURE__ */ jsx4(Button3, { size: "small", type: "link", onClick: () => onOpenTicket == null ? void 0 : onOpenTicket(r.ticketKey), children: r.ticketKey })
      ] }, r.id);
    }),
    /* @__PURE__ */ jsx4(Text2, { type: "secondary", style: { fontSize: 12 }, children: "You are notified when a report changes state or gets a reply." })
  ] });
}

// src/capture.js
var WIDGET_SELECTORS = [".kids-feedback-root", ".kids-feedback-modal-wrap", ".kids-feedback-pill"];
function supportsExactCapture() {
  var _a;
  return typeof navigator !== "undefined" && Boolean((_a = navigator.mediaDevices) == null ? void 0 : _a.getDisplayMedia) && window.isSecureContext;
}
async function captureQuick({ scale } = {}) {
  const { snapdom } = await import("@zumer/snapdom");
  const dpr = window.devicePixelRatio || 1;
  const result = await snapdom(document.body, {
    scale: scale || Math.min(dpr, 2),
    exclude: WIDGET_SELECTORS,
    excludeMode: "hide",
    backgroundColor: "#ffffff",
    embedFonts: true,
    fast: true
  });
  const blob = await result.toBlob({ type: "png" });
  const { width, height } = await imageSize(blob);
  return { blob, width, height, method: "quick" };
}
async function captureExact() {
  if (!supportsExactCapture()) throw new Error("Exact capture is not supported in this browser.");
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: "browser" },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: "include",
    surfaceSwitching: "exclude",
    monitorTypeSurfaces: "exclude"
  });
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error("Could not read the captured frame."));
      setTimeout(() => reject(new Error("Timed out waiting for the capture.")), 8e3);
    });
    await video.play();
    await nextFrames(3);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    return { blob, width: canvas.width, height: canvas.height, method: "exact" };
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}
function nextFrames(n) {
  return new Promise((resolve) => {
    const step = (k) => k <= 0 ? resolve() : requestAnimationFrame(() => step(k - 1));
    step(n);
  });
}
function imageSize(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
function blobToFile(blob, name, type) {
  return new File([blob], name, { type: type || blob.type || "application/octet-stream" });
}

// src/metadata.js
import Bowser from "bowser";
function browserInfo() {
  try {
    const p = Bowser.getParser(window.navigator.userAgent);
    const b = p.getBrowser();
    const os = p.getOS();
    const platform = p.getPlatform();
    return {
      name: b.name || null,
      version: b.version || null,
      os: os.name || null,
      osVersion: os.versionName || os.version || null,
      platform: platform.type || null,
      ua: window.navigator.userAgent.slice(0, 300)
    };
  } catch {
    return { ua: window.navigator.userAgent.slice(0, 300) };
  }
}
function isDesktop() {
  try {
    const type = Bowser.getParser(window.navigator.userAgent).getPlatform().type;
    return !type || type === "desktop";
  } catch {
    return true;
  }
}
function pageMetadata({ buildSha = "dev", getImpersonation } = {}) {
  var _a, _b, _c;
  let impersonating = null;
  try {
    impersonating = ((_a = getImpersonation == null ? void 0 : getImpersonation()) == null ? void 0 : _a.email) || null;
  } catch {
    impersonating = null;
  }
  return {
    browser: browserInfo(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      screen: `${((_b = window.screen) == null ? void 0 : _b.width) || 0}x${((_c = window.screen) == null ? void 0 : _c.height) || 0}`
    },
    language: window.navigator.language || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    online: window.navigator.onLine,
    buildSha: buildSha || "dev",
    impersonating,
    capturedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// src/FeedbackModal.jsx
import { Fragment as Fragment2, jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
var { Text: Text3 } = Typography3;
var { TextArea } = Input2;
var KINDS = [
  { key: "bug", label: "Bug", icon: /* @__PURE__ */ jsx5(BugOutlined, {}), hint: "Something is broken or wrong" },
  { key: "idea", label: "Idea", icon: /* @__PURE__ */ jsx5(BulbOutlined, {}), hint: "A feature or improvement" },
  { key: "question", label: "Question", icon: /* @__PURE__ */ jsx5(QuestionCircleOutlined, {}), hint: "How do I\u2026?" }
];
var SEVERITIES = [
  { key: "blocked", label: "I'm blocked" },
  { key: "annoying", label: "Annoying, I can work around it" },
  { key: "minor", label: "Minor" }
];
var PROMPTS = {
  bug: "What happened? Say it the way you would to a colleague.",
  idea: (app) => `What would you like ${app} to do?`,
  question: "What are you trying to do?"
};
function Chip({ active, cls, onClick, children }) {
  return /* @__PURE__ */ jsx5("button", { type: "button", className: `kf-chip${active ? ` active ${cls}` : ""}`, onClick, children });
}
function FeedbackModal({ open, onClose, prefill, onOpenTicket, hidden, setHidden }) {
  var _a;
  const { transport, buildSha, appName, getImpersonation } = useReportConfig();
  const meta = () => pageMetadata({ buildSha, getImpersonation });
  const [tab, setTab] = useState5("new");
  const [config, setConfig] = useState5(null);
  const [kind, setKind] = useState5("bug");
  const [severity, setSeverity] = useState5("annoying");
  const [summary, setSummary] = useState5("");
  const [expected, setExpected] = useState5("");
  const [steps, setSteps] = useState5("");
  const [shot, setShot] = useState5(null);
  const [annotating, setAnnotating] = useState5(false);
  const [capturing, setCapturing] = useState5(false);
  const [voice, setVoice] = useState5(null);
  const [screen, setScreen] = useState5(null);
  const [files, setFiles] = useState5([]);
  const [submitting, setSubmitting] = useState5(false);
  const [progress, setProgress] = useState5("");
  const [done, setDone] = useState5(null);
  const [refreshKey, setRefreshKey] = useState5(0);
  const autoShotDone = useRef3(false);
  const screenRec = useMediaRecorder({ kind: "screen", maxMs: 2 * 60 * 1e3 });
  useEffect6(() => {
    if (!open) return;
    transport.fetchFeedbackConfig().then(setConfig).catch(() => setConfig({ transcription: { available: false } }));
  }, [open]);
  useEffect6(() => {
    if (!open || !prefill) return;
    if (prefill.kind) setKind(prefill.kind);
    if (prefill.summary) setSummary(prefill.summary);
    if (prefill.severity) setSeverity(prefill.severity);
    setTab("new");
  }, [open, prefill]);
  useEffect6(() => {
    if (!open || autoShotDone.current || shot || done || (prefill == null ? void 0 : prefill.noAutoShot)) return;
    autoShotDone.current = true;
    let alive = true;
    (async () => {
      try {
        setCapturing(true);
        const r = await captureQuick();
        if (alive && r.blob) setShot({ ...r, url: URL.createObjectURL(r.blob) });
      } catch (e) {
        console.warn("[feedback] quick capture failed:", e.message);
      } finally {
        if (alive) setCapturing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open]);
  useEffect6(() => {
    if (!screenRec.result) return;
    const { blob, mimeType, durationMs } = screenRec.result;
    setScreen({ blob, mimeType, durationMs, filename: `screen-recording.${extensionFor(mimeType)}` });
    screenRec.reset();
    setHidden(false);
  }, [screenRec.result]);
  useEffect6(() => {
    if (screenRec.error) {
      setHidden(false);
      message.warning(screenRec.error);
    }
  }, [screenRec.error]);
  const reset = useCallback3(() => {
    setKind("bug");
    setSeverity("annoying");
    setSummary("");
    setExpected("");
    setSteps("");
    if (shot == null ? void 0 : shot.url) URL.revokeObjectURL(shot.url);
    setShot(null);
    setVoice(null);
    setScreen(null);
    setFiles([]);
    setDone(null);
    setProgress("");
    autoShotDone.current = false;
  }, [shot]);
  const handleClose = () => {
    onClose();
  };
  const retakeExact = async () => {
    setHidden(true);
    setCapturing(true);
    try {
      await new Promise((r2) => setTimeout(r2, 150));
      const r = await captureExact();
      if (shot == null ? void 0 : shot.url) URL.revokeObjectURL(shot.url);
      setShot({ ...r, url: URL.createObjectURL(r.blob) });
    } catch (e) {
      if ((e == null ? void 0 : e.name) !== "NotAllowedError") message.warning(e.message || "Screenshot cancelled.");
    } finally {
      setCapturing(false);
      setHidden(false);
    }
  };
  const retakeQuick = async () => {
    setHidden(true);
    setCapturing(true);
    try {
      await new Promise((r2) => setTimeout(r2, 120));
      const r = await captureQuick();
      if (shot == null ? void 0 : shot.url) URL.revokeObjectURL(shot.url);
      setShot({ ...r, url: URL.createObjectURL(r.blob) });
    } catch (e) {
      message.warning(e.message || "Screenshot failed.");
    } finally {
      setCapturing(false);
      setHidden(false);
    }
  };
  const startScreenRecording = async () => {
    setHidden(true);
    await screenRec.start();
  };
  const addFiles = (list) => {
    const incoming = Array.from(list || []).filter(Boolean);
    if (!incoming.length) return;
    const max = (config == null ? void 0 : config.maxAttachmentBytes) || 512 * 1024 * 1024;
    const ok = incoming.filter((f) => f.size <= max);
    if (ok.length < incoming.length) message.warning("Some files were too large to attach.");
    setFiles((prev) => [...prev, ...ok].slice(0, 10));
  };
  const onPaste = (e) => {
    var _a2;
    const items = Array.from(((_a2 = e.clipboardData) == null ? void 0 : _a2.items) || []);
    const imgs = items.filter((i) => i.kind === "file" && i.type.startsWith("image/")).map((i) => i.getAsFile()).filter(Boolean);
    if (imgs.length) {
      addFiles(imgs.map((f, i) => new File([f], f.name && f.name !== "image.png" ? f.name : `pasted-${Date.now()}-${i + 1}.png`, { type: f.type })));
    }
  };
  const context = useMemo2(() => open ? { ...meta(), ...snapshotContext() } : null, [open, done]);
  const canSubmit = summary.trim().length > 0 && !submitting;
  const submit = async () => {
    var _a2;
    if (!canSubmit) return;
    setSubmitting(true);
    setProgress("Creating the ticket\u2026");
    const warnings = [];
    try {
      const ctx = { ...meta(), ...snapshotContext() };
      const created = await transport.submitFeedback({
        kind,
        severity: kind === "bug" ? severity : null,
        summary: summary.trim(),
        expected: expected.trim() || null,
        steps: steps.trim() || null,
        transcript: ((_a2 = voice == null ? void 0 : voice.transcript) == null ? void 0 : _a2.trim()) || null,
        transcriptSource: (voice == null ? void 0 : voice.transcript) ? voice.transcriptSource || null : null,
        pageUrl: window.location.href,
        route: window.location.pathname,
        context: ctx
      });
      const uploads = [];
      if (shot == null ? void 0 : shot.blob) uploads.push(blobToFile(shot.blob, shot.annotated ? "screenshot-annotated.png" : "screenshot.png", "image/png"));
      if (voice == null ? void 0 : voice.blob) uploads.push(blobToFile(voice.blob, voice.filename, voice.mimeType));
      if (screen == null ? void 0 : screen.blob) uploads.push(blobToFile(screen.blob, screen.filename, screen.mimeType));
      uploads.push(...files);
      for (let i = 0; i < uploads.length; i += 1) {
        setProgress(`Uploading ${uploads[i].name} (${i + 1}/${uploads.length})\u2026`);
        try {
          await transport.uploadFeedbackFile(created.ticketKey, uploads[i]);
        } catch (e) {
          warnings.push(`${uploads[i].name} could not be uploaded (${e.message}).`);
        }
      }
      setProgress("Finishing\u2026");
      await transport.finalizeFeedback(created.id).catch((e) => warnings.push(`Context comment failed (${e.message}).`));
      setDone({ ticketKey: created.ticketKey, warnings });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setProgress("");
    } finally {
      setSubmitting(false);
    }
  };
  const transcriptionAvailable = Boolean((_a = config == null ? void 0 : config.transcription) == null ? void 0 : _a.available);
  const desktop = isDesktop();
  const includedPopover = /* @__PURE__ */ jsxs4("div", { className: "kf-context", style: { maxWidth: 420 }, children: [
    /* @__PURE__ */ jsx5(Text3, { type: "secondary", style: { fontSize: 12 }, children: "Sent with the report so the developer can reproduce it. Nothing you type elsewhere, no passwords." }),
    /* @__PURE__ */ jsx5("pre", { children: JSON.stringify({
      page: typeof window !== "undefined" ? window.location.pathname : null,
      browser: (context == null ? void 0 : context.browser) ? `${context.browser.name} ${context.browser.version} \xB7 ${context.browser.os} ${context.browser.osVersion || ""}` : null,
      viewport: (context == null ? void 0 : context.viewport) ? `${context.viewport.width}\xD7${context.viewport.height} @${context.viewport.dpr}x` : null,
      build: context == null ? void 0 : context.buildSha,
      actingAs: (context == null ? void 0 : context.impersonating) || void 0,
      recentRoutes: ((context == null ? void 0 : context.routeHistory) || []).slice(-6).map((r) => r.path),
      recentErrors: ((context == null ? void 0 : context.errors) || []).slice(-8).map((e) => `${e.level}: ${e.message}`)
    }, null, 2) })
  ] });
  const form = done ? /* @__PURE__ */ jsxs4("div", { className: "kf-success", children: [
    /* @__PURE__ */ jsx5(CheckCircleFilled, { style: { fontSize: 40, color: "#22c55e" } }),
    /* @__PURE__ */ jsx5("div", { className: "key", children: done.ticketKey }),
    /* @__PURE__ */ jsxs4(Text3, { children: [
      "Thanks \u2014 your ",
      kind === "bug" ? "report" : kind,
      " is filed. You will be notified when it moves or gets a reply."
    ] }),
    done.warnings.map((w) => /* @__PURE__ */ jsx5(Alert2, { type: "warning", showIcon: true, message: w, style: { borderRadius: 8, textAlign: "left" } }, w)),
    /* @__PURE__ */ jsxs4(Space3, { children: [
      done.ticketKey && /* @__PURE__ */ jsxs4(Button4, { type: "primary", onClick: () => {
        onOpenTicket == null ? void 0 : onOpenTicket(done.ticketKey);
        handleClose();
      }, children: [
        "Open ",
        done.ticketKey
      ] }),
      /* @__PURE__ */ jsx5(Button4, { onClick: reset, children: "Report another" }),
      /* @__PURE__ */ jsx5(Button4, { type: "text", onClick: handleClose, children: "Close" })
    ] })
  ] }) : /* @__PURE__ */ jsxs4("div", { className: "kf-body", onPaste, children: [
    /* @__PURE__ */ jsx5("div", { children: /* @__PURE__ */ jsx5("div", { className: "kf-chips", children: KINDS.map((k) => /* @__PURE__ */ jsx5(Tooltip2, { title: k.hint, children: /* @__PURE__ */ jsx5("span", { children: /* @__PURE__ */ jsxs4(Chip, { active: kind === k.key, cls: k.key, onClick: () => setKind(k.key), children: [
      k.icon,
      " ",
      k.label
    ] }) }) }, k.key)) }) }),
    /* @__PURE__ */ jsx5("div", { className: "kf-textarea", children: /* @__PURE__ */ jsx5(
      TextArea,
      {
        autoFocus: true,
        value: summary,
        onChange: (e) => setSummary(e.target.value),
        placeholder: typeof PROMPTS[kind] === "function" ? PROMPTS[kind](appName) : PROMPTS[kind],
        autoSize: { minRows: 3, maxRows: 8 },
        maxLength: 2e4
      }
    ) }),
    /* @__PURE__ */ jsx5(VoicePanel, { value: voice, onChange: setVoice, transcriptionAvailable }),
    kind === "bug" && /* @__PURE__ */ jsxs4("div", { children: [
      /* @__PURE__ */ jsx5("div", { className: "kf-section-label", children: "How bad is it?" }),
      /* @__PURE__ */ jsx5("div", { className: "kf-chips", children: SEVERITIES.map((s) => /* @__PURE__ */ jsx5(Chip, { active: severity === s.key, cls: s.key, onClick: () => setSeverity(s.key), children: s.label }, s.key)) })
    ] }),
    /* @__PURE__ */ jsx5(
      Collapse,
      {
        ghost: true,
        size: "small",
        items: [{
          key: "more",
          label: /* @__PURE__ */ jsx5(Text3, { type: "secondary", style: { fontSize: 12.5 }, children: "More detail (optional)" }),
          children: /* @__PURE__ */ jsxs4(Space3, { direction: "vertical", style: { width: "100%" }, size: 8, children: [
            kind !== "question" && /* @__PURE__ */ jsx5(TextArea, { value: expected, onChange: (e) => setExpected(e.target.value), placeholder: kind === "bug" ? "What did you expect to happen?" : "Why would this help?", autoSize: { minRows: 2, maxRows: 5 } }),
            kind === "bug" && /* @__PURE__ */ jsx5(TextArea, { value: steps, onChange: (e) => setSteps(e.target.value), placeholder: "Steps to make it happen again, if you know them\n1. \u2026\n2. \u2026", autoSize: { minRows: 2, maxRows: 6 } })
          ] })
        }]
      }
    ),
    /* @__PURE__ */ jsxs4("div", { className: "kf-capture-row", children: [
      /* @__PURE__ */ jsxs4("div", { className: `kf-card${shot ? " filled" : ""}`, children: [
        /* @__PURE__ */ jsxs4("div", { className: "kf-card-title", children: [
          /* @__PURE__ */ jsxs4("span", { children: [
            /* @__PURE__ */ jsx5(CameraOutlined, {}),
            " Screenshot"
          ] }),
          capturing && /* @__PURE__ */ jsx5(LoadingOutlined2, {})
        ] }),
        shot ? /* @__PURE__ */ jsxs4("div", { className: "kf-shot", children: [
          /* @__PURE__ */ jsx5("img", { src: shot.url, alt: "Screenshot of the page" }),
          /* @__PURE__ */ jsxs4("div", { className: "kf-shot-actions", children: [
            /* @__PURE__ */ jsx5(Tooltip2, { title: "Draw on it", children: /* @__PURE__ */ jsx5(Button4, { size: "small", icon: /* @__PURE__ */ jsx5(EditOutlined, {}), onClick: () => setAnnotating(true), children: "Annotate" }) }),
            desktop && supportsExactCapture() && /* @__PURE__ */ jsx5(Tooltip2, { title: "Retake with exact pixels (asks to share this tab)", children: /* @__PURE__ */ jsx5(Button4, { size: "small", icon: /* @__PURE__ */ jsx5(ReloadOutlined, {}), onClick: retakeExact, children: "Retake" }) }),
            /* @__PURE__ */ jsx5(Tooltip2, { title: "Remove", children: /* @__PURE__ */ jsx5(Button4, { size: "small", danger: true, icon: /* @__PURE__ */ jsx5(DeleteOutlined2, {}), onClick: () => {
              URL.revokeObjectURL(shot.url);
              setShot(null);
            } }) })
          ] })
        ] }) : /* @__PURE__ */ jsxs4(Space3, { wrap: true, children: [
          /* @__PURE__ */ jsx5(Button4, { size: "small", icon: /* @__PURE__ */ jsx5(CameraOutlined, {}), loading: capturing, onClick: retakeQuick, children: "Take screenshot" }),
          desktop && supportsExactCapture() && /* @__PURE__ */ jsx5(Button4, { size: "small", onClick: retakeExact, loading: capturing, children: "Exact pixels\u2026" })
        ] }),
        (shot == null ? void 0 : shot.annotated) && /* @__PURE__ */ jsx5(Text3, { type: "secondary", style: { fontSize: 11.5 }, children: "Annotated" })
      ] }),
      /* @__PURE__ */ jsxs4("div", { className: `kf-card${screen || files.length ? " filled" : ""}`, children: [
        /* @__PURE__ */ jsx5("div", { className: "kf-card-title", children: /* @__PURE__ */ jsxs4("span", { children: [
          /* @__PURE__ */ jsx5(PaperClipOutlined, {}),
          " Recording & files"
        ] }) }),
        /* @__PURE__ */ jsxs4(Space3, { wrap: true, children: [
          desktop && supportsExactCapture() && !screen && /* @__PURE__ */ jsx5(Button4, { size: "small", icon: /* @__PURE__ */ jsx5(VideoCameraOutlined, {}), loading: screenRec.status === "requesting", onClick: startScreenRecording, children: "Record screen" }),
          /* @__PURE__ */ jsx5(Upload, { multiple: true, showUploadList: false, beforeUpload: (f, list) => {
            addFiles(list.length ? list : [f]);
            return false;
          }, children: /* @__PURE__ */ jsx5(Button4, { size: "small", icon: /* @__PURE__ */ jsx5(PaperClipOutlined, {}), children: "Add files" }) })
        ] }),
        (screen || files.length > 0) && /* @__PURE__ */ jsxs4("div", { className: "kf-files", children: [
          screen && /* @__PURE__ */ jsxs4("span", { className: "kf-file", children: [
            /* @__PURE__ */ jsx5(VideoCameraOutlined, {}),
            " ",
            screen.filename,
            " \xB7 ",
            formatMs(screen.durationMs),
            /* @__PURE__ */ jsx5("button", { type: "button", onClick: () => setScreen(null), "aria-label": "Remove recording", children: /* @__PURE__ */ jsx5(CloseOutlined2, {}) })
          ] }),
          files.map((f, i) => /* @__PURE__ */ jsxs4("span", { className: "kf-file", children: [
            f.name,
            /* @__PURE__ */ jsx5("button", { type: "button", onClick: () => setFiles((p) => p.filter((_, j) => j !== i)), "aria-label": `Remove ${f.name}`, children: /* @__PURE__ */ jsx5(CloseOutlined2, {}) })
          ] }, `${f.name}-${i}`))
        ] }),
        /* @__PURE__ */ jsx5(Text3, { type: "secondary", style: { fontSize: 11.5 }, children: "Paste an image anywhere in this form to attach it." })
      ] })
    ] })
  ] });
  const footer = done ? null : /* @__PURE__ */ jsxs4("div", { className: "kf-footer", children: [
    /* @__PURE__ */ jsxs4("span", { className: "kf-included", children: [
      "We'll also include the page, your account, browser and recent errors.",
      " ",
      /* @__PURE__ */ jsx5(Popover, { content: includedPopover, title: "What gets included", trigger: "click", placement: "topLeft", children: /* @__PURE__ */ jsx5("a", { children: "view" }) })
    ] }),
    /* @__PURE__ */ jsxs4(Space3, { children: [
      progress && /* @__PURE__ */ jsxs4(Text3, { type: "secondary", style: { fontSize: 12 }, children: [
        /* @__PURE__ */ jsx5(LoadingOutlined2, {}),
        " ",
        progress
      ] }),
      /* @__PURE__ */ jsx5(Button4, { onClick: handleClose, disabled: submitting, children: "Cancel" }),
      /* @__PURE__ */ jsx5(Button4, { type: "primary", onClick: submit, disabled: !canSubmit, loading: submitting, children: "Send report" })
    ] })
  ] });
  return /* @__PURE__ */ jsxs4(Fragment2, { children: [
    /* @__PURE__ */ jsxs4(
      Modal,
      {
        open,
        onCancel: handleClose,
        footer: null,
        width: 720,
        centered: true,
        destroyOnHidden: false,
        maskClosable: !submitting,
        className: `kf-modal${hidden ? " kf-hidden-mask" : ""}`,
        wrapClassName: `kids-feedback-modal-wrap${hidden ? " kf-hidden" : ""}`,
        styles: { mask: hidden ? { display: "none" } : void 0 },
        closable: false,
        zIndex: 1160,
        children: [
          /* @__PURE__ */ jsxs4("div", { className: "kf-head", children: [
            /* @__PURE__ */ jsxs4("div", { children: [
              /* @__PURE__ */ jsx5("h3", { children: "Report a bug or share an idea" }),
              /* @__PURE__ */ jsx5("p", { children: (config == null ? void 0 : config.project) ? `Goes straight to the ${appName} team as a ticket in ${config.project.name}.` : `Goes straight to the ${appName} team as a ticket.` })
            ] }),
            /* @__PURE__ */ jsxs4(Space3, { children: [
              /* @__PURE__ */ jsx5(
                Tabs,
                {
                  size: "small",
                  activeKey: tab,
                  onChange: setTab,
                  items: [{ key: "new", label: "New report" }, { key: "mine", label: "My reports" }],
                  style: { marginBottom: -16 }
                }
              ),
              /* @__PURE__ */ jsx5(Button4, { type: "text", icon: /* @__PURE__ */ jsx5(CloseOutlined2, {}), onClick: handleClose, "aria-label": "Close" })
            ] })
          ] }),
          tab === "new" ? /* @__PURE__ */ jsxs4(Fragment2, { children: [
            form,
            footer
          ] }) : /* @__PURE__ */ jsx5("div", { style: { padding: "14px 20px 18px" }, children: /* @__PURE__ */ jsx5(MyReports, { refreshKey, onOpenTicket: (k) => {
            onOpenTicket == null ? void 0 : onOpenTicket(k);
            handleClose();
          } }) })
        ]
      }
    ),
    /* @__PURE__ */ jsx5(
      Modal,
      {
        open: annotating && Boolean(shot),
        onCancel: () => setAnnotating(false),
        footer: null,
        width: 960,
        centered: true,
        destroyOnHidden: true,
        title: "Annotate the screenshot",
        maskClosable: false,
        zIndex: 1170,
        children: shot && /* @__PURE__ */ jsx5(
          Annotator,
          {
            src: shot.url,
            onCancel: () => setAnnotating(false),
            onDone: (blob) => {
              URL.revokeObjectURL(shot.url);
              setShot({ ...shot, blob, url: URL.createObjectURL(blob), annotated: true });
              setAnnotating(false);
            }
          }
        )
      }
    ),
    screenRec.status === "recording" && /* @__PURE__ */ jsxs4("div", { className: "kids-feedback-pill", children: [
      /* @__PURE__ */ jsx5("span", { className: "dot" }),
      " Recording your screen \xB7 ",
      formatMs(screenRec.elapsedMs),
      /* @__PURE__ */ jsx5(Button4, { size: "small", danger: true, icon: /* @__PURE__ */ jsx5(StopOutlined2, {}), onClick: screenRec.stop, children: "Stop" })
    ] })
  ] });
}

// src/FeedbackWidget.jsx
import { Fragment as Fragment3, jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
var OPEN_EVENT = "kids:feedback:open";
function openFeedback(prefill) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: prefill || null }));
}
function FeedbackWidget({ onOpenTicket, hideButton = false, config }) {
  const [open, setOpen] = useState6(false);
  const [hidden, setHidden] = useState6(false);
  const [prefill, setPrefill] = useState6(null);
  useEffect7(() => {
    const onEvent = (e) => {
      setPrefill(e.detail || null);
      setOpen(true);
    };
    const onKey = (e) => {
      if (e.altKey && e.shiftKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener(OPEN_EVENT, onEvent);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onEvent);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  const handleOpenTicket = useCallback4((key) => {
    if (!key) return;
    if (onOpenTicket) onOpenTicket(key);
    else window.location.assign(`/browse/${key}`);
  }, [onOpenTicket]);
  const ui = /* @__PURE__ */ jsxs5(Fragment3, { children: [
    !hideButton && /* @__PURE__ */ jsx6("div", { className: "kids-feedback-root", children: /* @__PURE__ */ jsx6(Tooltip3, { title: "Report a bug or share an idea (Alt+Shift+F)", placement: "left", children: /* @__PURE__ */ jsxs5("button", { type: "button", className: "kids-feedback-fab", onClick: () => {
      setPrefill(null);
      setOpen(true);
    }, "aria-label": "Report a bug or share an idea", children: [
      /* @__PURE__ */ jsx6(MessageOutlined, {}),
      /* @__PURE__ */ jsx6("span", { className: "kids-feedback-fab-label", children: "Report" })
    ] }) }) }),
    /* @__PURE__ */ jsx6(
      FeedbackModal,
      {
        open,
        hidden,
        setHidden,
        prefill,
        onClose: () => {
          setOpen(false);
          setHidden(false);
        },
        onOpenTicket: handleOpenTicket
      }
    )
  ] });
  return config ? /* @__PURE__ */ jsx6(ReportProvider, { config, children: ui }) : ui;
}

// src/RouteRecorder.jsx
import { useEffect as useEffect8 } from "react";
function useRouteTracker(pathname) {
  const tracked = pathname !== void 0;
  useEffect8(() => {
    if (tracked) recordRoute(pathname);
  }, [tracked, pathname]);
  useEffect8(() => {
    if (!tracked) installHistoryTracking();
  }, [tracked]);
}
function RouteRecorder({ pathname }) {
  useRouteTracker(pathname);
  return null;
}
export {
  FeedbackModal,
  FeedbackWidget,
  KIND_LABELS,
  MyReports,
  OPEN_EVENT,
  ReportProvider,
  RouteRecorder,
  STATE_COLORS,
  STATE_LABELS,
  installContextBuffer,
  installHistoryTracking,
  lastUncaught,
  openFeedback,
  pageMetadata,
  recordError,
  recordRoute,
  relTime,
  snapshotContext,
  useReportConfig,
  useRouteTracker
};
//# sourceMappingURL=index.js.map