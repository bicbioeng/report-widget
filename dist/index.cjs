"use client";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.js
var src_exports = {};
__export(src_exports, {
  FeedbackModal: () => FeedbackModal,
  FeedbackWidget: () => FeedbackWidget,
  KIND_LABELS: () => KIND_LABELS,
  MyReports: () => MyReports,
  OPEN_EVENT: () => OPEN_EVENT,
  REPORT_TOOL_KIND: () => REPORT_TOOL_KIND,
  REPORT_TOOL_PREFIX: () => REPORT_TOOL_PREFIX,
  ReportProvider: () => ReportProvider,
  RouteRecorder: () => RouteRecorder,
  STATE_COLORS: () => STATE_COLORS,
  STATE_LABELS: () => STATE_LABELS,
  WIDGET_VERSION: () => WIDGET_VERSION,
  buildDiagnostics: () => buildDiagnostics,
  buildReportToolPayload: () => buildReportToolPayload,
  clipText: () => clipText,
  errorRecord: () => errorRecord,
  extensionFor: () => extensionFor,
  formatMs: () => formatMs,
  installContextBuffer: () => installContextBuffer,
  installHistoryTracking: () => installHistoryTracking,
  lastUncaught: () => lastUncaught,
  openFeedback: () => openFeedback,
  pageMetadata: () => pageMetadata,
  pickMime: () => pickMime,
  recordError: () => recordError,
  recordRoute: () => recordRoute,
  relTime: () => relTime,
  snapshotContext: () => snapshotContext,
  supportsRecording: () => supportsRecording,
  supportsSpeech: () => supportsSpeech,
  useMediaRecorder: () => useMediaRecorder,
  useReportConfig: () => useReportConfig,
  useRouteTracker: () => useRouteTracker
});
module.exports = __toCommonJS(src_exports);

// src/FeedbackWidget.jsx
var import_react7 = __toESM(require("react"), 1);
var import_react_dom = require("react-dom");
var import_antd5 = require("antd");
var import_icons4 = require("@ant-design/icons");

// src/FeedbackModal.jsx
var import_react6 = __toESM(require("react"), 1);
var import_antd4 = require("antd");
var import_icons3 = require("@ant-design/icons");

// src/Annotator.jsx
var import_react = __toESM(require("react"), 1);
var import_antd = require("antd");
var import_icons = require("@ant-design/icons");

// src/annotatorMath.js
function clampZoom(next, maxZoom) {
  let z = Math.min(maxZoom, Math.max(1, next));
  if (z - 1 < 1e-6) z = 1;
  if (maxZoom - z < 1e-6) z = maxZoom;
  return z;
}
var MAX_PCT = 400;
var maxZoomFor = (fit) => Math.max(1, MAX_PCT / 100 / fit);
var PCT_STEP = 25;
function stepZoom(zoom, fit, dir) {
  const pct = zoom * fit * 100;
  const k = pct / PCT_STEP;
  const next = (dir > 0 ? Math.floor(k + 1e-6) + 1 : Math.ceil(k - 1e-6) - 1) * PCT_STEP;
  return clampZoom(next / 100 / fit, maxZoomFor(fit));
}
function clientToImage(clientX, clientY, rect, natW, natH) {
  const x = Math.min(natW, Math.max(0, (clientX - rect.left) / rect.width * natW));
  const y = Math.min(natH, Math.max(0, (clientY - rect.top) / rect.height * natH));
  return { x, y };
}
var imageCoordAt = (c, rectStart, rectSize, nat) => (c - rectStart) / rectSize * nat;
var scrollToAnchor = (scroll, rectStart, rectSize, nat, i, c) => scroll + rectStart + i / nat * rectSize - c;
function heldAnchor(last, px, py, sl, st) {
  return last && last.px === px && last.py === py && last.sl === sl && last.st === st ? { ix: last.ix, iy: last.iy } : null;
}
var clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
function textBoxRect(cx, cy, dw, dh) {
  const width = Math.max(0, Math.min(200, dw - 4));
  return { left: clamp(cx, 0, dw - width - 4), top: clamp(cy - 18, 0, dh - 28), width };
}
var ACTIVATES = 'button, a, [role="button"], [role="tab"], [role="checkbox"]';
var spaceActivates = (t, tabFocused) => Boolean(t && t === tabFocused && t.matches && t.matches(ACTIVATES));
function withPendingText(shapes, textAt, textValue, color) {
  const text = textValue.trim();
  return textAt && text ? [...shapes, { type: "text", color, x: textAt.x, y: textAt.y, text }] : shapes;
}
function takeOnce(ref) {
  const v = ref.current;
  ref.current = null;
  return v;
}
var exportErrorText = (subject) => `The marked-up ${subject.toLowerCase()} couldn't be saved. Cancel to keep the original attached.`;

// src/Annotator.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#0f172a", "#ffffff"];
var TOOLS = [
  { key: "rect", label: "Box", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_icons.BorderOutlined, {}) },
  { key: "arrow", label: "Arrow", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_icons.ArrowRightOutlined, {}) },
  { key: "pen", label: "Draw", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_icons.HighlightOutlined, {}) },
  { key: "blur", label: "Blur", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_icons.EyeInvisibleOutlined, {}) },
  { key: "text", label: "Text", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_icons.FontSizeOutlined, {}) },
  { key: "move", label: "Move", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_icons.DragOutlined, {}) }
];
var isTyping = (t) => t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
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
function Annotator({ src, onDone, onCancel, doneLabel = "Use this screenshot", subject = "Screenshot" }) {
  var _a, _b;
  const canvasRef = (0, import_react.useRef)(null);
  const stageRef = (0, import_react.useRef)(null);
  const wrapRef = (0, import_react.useRef)(null);
  const imgRef = (0, import_react.useRef)(null);
  const blurRef = (0, import_react.useRef)(null);
  const [ready, setReady] = (0, import_react.useState)(false);
  const [failed, setFailed] = (0, import_react.useState)(false);
  const [tool, setTool] = (0, import_react.useState)("rect");
  const [color, setColor] = (0, import_react.useState)(COLORS[0]);
  const [shapes, setShapes] = (0, import_react.useState)([]);
  const [draft, setDraft] = (0, import_react.useState)(null);
  const [textAt, setTextAt] = (0, import_react.useState)(null);
  const [textValue, setTextValue] = (0, import_react.useState)("");
  const [exporting, setExporting] = (0, import_react.useState)(false);
  const [zoom, setZoom] = (0, import_react.useState)(1);
  const [fit, setFit] = (0, import_react.useState)(1);
  const [panReady, setPanReady] = (0, import_react.useState)(false);
  const [panning, setPanning] = (0, import_react.useState)(false);
  const panRef = (0, import_react.useRef)(null);
  const anchorRef = (0, import_react.useRef)(null);
  const lastAnchorRef = (0, import_react.useRef)(null);
  const zoomRef = (0, import_react.useRef)(1);
  const keysRef = (0, import_react.useRef)(null);
  const tabFocusRef = (0, import_react.useRef)(null);
  const draftRef = (0, import_react.useRef)(null);
  draftRef.current = draft;
  const shapesRef = (0, import_react.useRef)(shapes);
  shapesRef.current = shapes;
  const textAtRef = (0, import_react.useRef)(textAt);
  textAtRef.current = textAt;
  (0, import_react.useEffect)(() => {
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
    img.onerror = () => setFailed(true);
    img.src = src;
  }, [src]);
  const lineScale = (0, import_react.useMemo)(() => imgRef.current ? Math.max(1, imgRef.current.naturalWidth / 1400) : 1, [ready]);
  const render = (0, import_react.useCallback)(() => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    for (const s of shapes) drawShape(ctx, s, blurRef.current, lineScale);
    if (draft) drawShape(ctx, draft, blurRef.current, lineScale);
  }, [shapes, draft, lineScale]);
  (0, import_react.useEffect)(() => {
    if (ready) render();
  }, [ready, render]);
  (0, import_react.useEffect)(() => {
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!ready || !stage || !img) return void 0;
    const measure = () => setFit(Math.min(1, stage.offsetWidth / img.naturalWidth, stage.offsetHeight / img.naturalHeight));
    measure();
    if (typeof ResizeObserver === "undefined") return void 0;
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [ready]);
  const natW = ((_a = imgRef.current) == null ? void 0 : _a.naturalWidth) || 0;
  const natH = ((_b = imgRef.current) == null ? void 0 : _b.naturalHeight) || 0;
  const scale = fit * zoom;
  const maxZoom = maxZoomFor(fit);
  const dispW = Math.floor(natW * scale);
  const dispH = Math.floor(natH * scale);
  const textBox = textAt && textBoxRect(textAt.cx, textAt.cy, dispW, dispH);
  (0, import_react.useLayoutEffect)(() => {
    const a = anchorRef.current;
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    anchorRef.current = null;
    if (!a || !stage || !wrap || !imgRef.current) return;
    const r = wrap.getBoundingClientRect();
    const img = imgRef.current;
    stage.scrollLeft = scrollToAnchor(stage.scrollLeft, r.left, r.width, img.naturalWidth, a.ix, a.px);
    stage.scrollTop = scrollToAnchor(stage.scrollTop, r.top, r.height, img.naturalHeight, a.iy, a.py);
    lastAnchorRef.current = { ...a, sl: stage.scrollLeft, st: stage.scrollTop };
  }, [zoom, fit]);
  const commitText = () => {
    const at = takeOnce(textAtRef);
    if (!at) return;
    setShapes((s) => withPendingText(s, at, textValue, color));
    setTextAt(null);
    setTextValue("");
  };
  const zoomTo = (next, px, py) => {
    const stage = stageRef.current;
    const wrap = wrapRef.current;
    if (!ready || !stage || !wrap) return;
    const z = clampZoom(next, maxZoom);
    if (z === zoomRef.current) return;
    if (textAt) commitText();
    if (px == null) {
      const sr = stage.getBoundingClientRect();
      px = sr.left + stage.clientWidth / 2;
      py = sr.top + stage.clientHeight / 2;
    }
    const held = heldAnchor(lastAnchorRef.current, px, py, stage.scrollLeft, stage.scrollTop);
    const r = wrap.getBoundingClientRect();
    anchorRef.current = held ? { px, py, ...held } : { px, py, ix: imageCoordAt(px, r.left, r.width, natW), iy: imageCoordAt(py, r.top, r.height, natH) };
    zoomRef.current = z;
    setZoom(z);
  };
  const zoomIn = () => zoomTo(stepZoom(zoomRef.current, fit, 1));
  const zoomOut = () => zoomTo(stepZoom(zoomRef.current, fit, -1));
  const zoomFit = () => zoomTo(1);
  keysRef.current = { zoomIn, zoomOut, zoomFit, zoomTo };
  (0, import_react.useEffect)(() => {
    const stage = stageRef.current;
    if (!stage) return void 0;
    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      keysRef.current.zoomTo(zoomRef.current * Math.exp(-dy * 0.01), e.clientX, e.clientY);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);
  (0, import_react.useEffect)(() => {
    let tabbing = false;
    const onKeyDown = (e) => {
      tabbing = e.key === "Tab";
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === " ") {
        if (spaceActivates(e.target, tabFocusRef.current)) return;
        e.preventDefault();
        if (!e.repeat) setPanReady(true);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        keysRef.current.zoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        keysRef.current.zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        keysRef.current.zoomFit();
      }
    };
    const onKeyUp = (e) => {
      if (e.key !== " " || isTyping(e.target) || spaceActivates(e.target, tabFocusRef.current)) return;
      e.preventDefault();
      setPanReady(false);
    };
    const onFocusIn = (e) => {
      tabFocusRef.current = tabbing ? e.target : null;
    };
    const onPointerDown2 = () => {
      tabbing = false;
      tabFocusRef.current = null;
    };
    const onBlur = () => setPanReady(false);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown2, true);
    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown2, true);
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
  const toCanvas = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const { x, y } = clientToImage(e.clientX, e.clientY, r, c.width, c.height);
    return { x, y, cx: e.clientX - r.left, cy: e.clientY - r.top };
  };
  const onPointerDown = (e) => {
    var _a2, _b2, _c, _d, _e, _f;
    if (!ready || ((_b2 = (_a2 = e.target).closest) == null ? void 0 : _b2.call(_a2, ".kf-text-input"))) return;
    const stage = stageRef.current;
    if ((tool === "move" || panReady) && e.button === 0 || e.button === 1) {
      e.preventDefault();
      if (textAt) commitText();
      panRef.current = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop };
      setPanning(true);
      (_d = (_c = e.currentTarget).setPointerCapture) == null ? void 0 : _d.call(_c, e.pointerId);
      return;
    }
    if (textAt || e.button !== 0 || e.target !== canvasRef.current) return;
    e.preventDefault();
    const p = toCanvas(e);
    if (tool === "text") {
      setTextAt(p);
      setTextValue("");
      return;
    }
    (_f = (_e = e.currentTarget).setPointerCapture) == null ? void 0 : _f.call(_e, e.pointerId);
    if (tool === "pen") setDraft({ type: "pen", color, points: [{ x: p.x, y: p.y }] });
    else setDraft({ type: tool, color, x1: p.x, y1: p.y, x2: p.x, y2: p.y });
  };
  const onPointerMove = (e) => {
    const pan = panRef.current;
    if (pan) {
      const stage = stageRef.current;
      stage.scrollLeft = pan.sl - (e.clientX - pan.x);
      stage.scrollTop = pan.st - (e.clientY - pan.y);
      return;
    }
    if (!draft) return;
    const p = toCanvas(e);
    setDraft((d) => d.type === "pen" ? { ...d, points: [...d.points, { x: p.x, y: p.y }] } : { ...d, x2: p.x, y2: p.y });
  };
  const onPointerUp = () => {
    if (panRef.current) {
      panRef.current = null;
      setPanning(false);
      return;
    }
    const d = draftRef.current;
    if (!d) return;
    draftRef.current = null;
    const tooSmall = d.type !== "pen" && Math.abs(d.x2 - d.x1) < 3 && Math.abs(d.y2 - d.y1) < 3;
    if (!tooSmall) setShapes((s) => [...s, d]);
    setDraft(null);
  };
  const finish = () => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (exporting || !c || !img) return;
    const all = withPendingText(shapesRef.current, takeOnce(textAtRef), textValue, color);
    setTextAt(null);
    setTextValue("");
    setShapes(all);
    draftRef.current = null;
    setDraft(null);
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    for (const s of all) drawShape(ctx, s, blurRef.current, lineScale);
    setExporting(true);
    c.toBlob((blob) => {
      if (blob) {
        onDone(blob);
        return;
      }
      setExporting(false);
      import_antd.message.error(exportErrorText(subject));
    }, "image/png");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "kf-annotator", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "kf-tools", role: "toolbar", "aria-label": "Markup tools", children: [
      TOOLS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: `kf-tool${tool === t.key ? " active" : ""}`, "aria-pressed": tool === t.key, disabled: t.key === "move" && !ready, onClick: () => setTool(t.key), children: [
        t.icon,
        " ",
        t.label
      ] }, t.key)),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: 8 } }),
      COLORS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_antd.Tooltip, { title: c, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `kf-swatch${color === c ? " active" : ""}`, style: { background: c }, onClick: () => setColor(c) }) }, c)),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "kf-zoom", role: "group", "aria-label": "Zoom", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_antd.Tooltip, { title: "Zoom out (\u2212)", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "aria-label": "Zoom out", disabled: !ready || zoom <= 1, onClick: zoomOut, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_icons.ZoomOutOutlined, {}) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "kf-zoom-pct", "aria-live": "polite", children: ready ? `${Math.round(scale * 100)}%` : "\u2014" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_antd.Tooltip, { title: "Zoom in (+)", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "aria-label": "Zoom in", disabled: !ready || zoom >= maxZoom, onClick: zoomIn, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_icons.ZoomInOutlined, {}) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_antd.Tooltip, { title: "Fit to window (0)", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "aria-label": "Fit to window", disabled: !ready || zoom === 1, onClick: zoomFit, children: "Fit" }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_antd.Button, { size: "small", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_icons.UndoOutlined, {}), disabled: !shapes.length, onClick: () => setShapes((s) => s.slice(0, -1)), children: "Undo" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: `kf-stage${panReady || tool === "move" ? " kf-pan-ready" : ""}${panning ? " kf-panning" : ""}`,
        ref: stageRef,
        tabIndex: 0,
        "aria-label": "Image area. Use the arrow keys to scroll when zoomed in.",
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp,
        onLostPointerCapture: onPointerUp,
        onMouseDown: (e) => {
          if (e.button === 1) e.preventDefault();
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "kf-canvas-wrap", ref: wrapRef, style: failed ? { display: "none" } : void 0, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "canvas",
              {
                ref: canvasRef,
                role: "img",
                "aria-label": `${subject} you are annotating`,
                style: ready ? { width: dispW, height: dispH } : void 0
              }
            ),
            textAt && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "kf-text-input", style: { left: textBox.left, top: textBox.top }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              import_antd.Input,
              {
                autoFocus: true,
                size: "small",
                value: textValue,
                placeholder: "Type, then Enter",
                style: { width: textBox.width },
                onChange: (e) => setTextValue(e.target.value),
                onPressEnter: commitText,
                onBlur: commitText,
                onKeyDown: (e) => {
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    textAtRef.current = null;
                    setTextAt(null);
                    setTextValue("");
                  }
                }
              }
            ) })
          ] }),
          failed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "kf-stage-error", children: "This image can't be opened for markup. It will still be attached as it is." })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
      zoom > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "kf-zoom-hint", children: "Hold Space and drag to move around. Pinch or Ctrl + scroll to zoom." }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_antd.Space, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_antd.Button, { icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_icons.CloseOutlined, {}), onClick: onCancel, children: "Cancel" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_antd.Button, { type: "primary", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_icons.CheckOutlined, {}), onClick: finish, disabled: !ready || exporting, loading: exporting, children: doneLabel })
      ] })
    ] })
  ] });
}

// src/VoicePanel.jsx
var import_react4 = __toESM(require("react"), 1);
var import_antd2 = require("antd");
var import_icons2 = require("@ant-design/icons");

// src/recorders.js
var import_react2 = require("react");
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
  const [status, setStatus] = (0, import_react2.useState)("idle");
  const [elapsedMs, setElapsedMs] = (0, import_react2.useState)(0);
  const [error, setError] = (0, import_react2.useState)(null);
  const [result, setResult] = (0, import_react2.useState)(null);
  const [liveCaption, setLiveCaption] = (0, import_react2.useState)("");
  const [level, setLevel] = (0, import_react2.useState)(0);
  const recorderRef = (0, import_react2.useRef)(null);
  const streamRef = (0, import_react2.useRef)(null);
  const chunksRef = (0, import_react2.useRef)([]);
  const startedAtRef = (0, import_react2.useRef)(0);
  const timerRef = (0, import_react2.useRef)(null);
  const speechRef = (0, import_react2.useRef)(null);
  const finalCaptionRef = (0, import_react2.useRef)("");
  const audioCtxRef = (0, import_react2.useRef)(null);
  const rafRef = (0, import_react2.useRef)(null);
  const cleanup = (0, import_react2.useCallback)(() => {
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
  (0, import_react2.useEffect)(() => cleanup, [cleanup]);
  const stop2 = (0, import_react2.useCallback)(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return;
    setStatus("processing");
    rec.stop();
  }, []);
  const start = (0, import_react2.useCallback)(async () => {
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
        t.onended = () => stop2();
      });
      startedAtRef.current = Date.now();
      rec.start(1e3);
      setStatus("recording");
      setElapsedMs(0);
      timerRef.current = setInterval(() => {
        const ms = Date.now() - startedAtRef.current;
        setElapsedMs(ms);
        if (ms >= maxMs) stop2();
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
  }, [kind, maxMs, captions, cleanup, stop2]);
  const reset = (0, import_react2.useCallback)(() => {
    setResult(null);
    setError(null);
    setElapsedMs(0);
    setLiveCaption("");
  }, []);
  return { status, start, stop: stop2, reset, elapsedMs, error, result, liveCaption, level };
}
function formatMs(ms) {
  const s = Math.floor(ms / 1e3);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// src/ReportProvider.jsx
var import_react3 = __toESM(require("react"), 1);

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
function recordError(level, message3, extra = {}) {
  push({ level, message: String(message3).slice(0, MAX_MESSAGE), ...extra });
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
var import_jsx_runtime2 = require("react/jsx-runtime");
var ReportContext = (0, import_react3.createContext)(null);
function ReportProvider({ config, children }) {
  (0, import_react3.useEffect)(() => {
    installContextBuffer();
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ReportContext.Provider, { value: config, children });
}
function useReportConfig() {
  const config = (0, import_react3.useContext)(ReportContext);
  if (!(config == null ? void 0 : config.transport)) {
    throw new Error("@bicbioeng/report-widget: wrap the app in <ReportProvider config={{ transport }}> (or pass config to <FeedbackWidget>).");
  }
  return { buildSha: "dev", appName: "KIDS", getImpersonation: null, ...config };
}

// src/VoicePanel.jsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var { Text } = import_antd2.Typography;
function VoicePanel({ value, onChange, transcriptionAvailable }) {
  const { transport } = useReportConfig();
  const rec = useMediaRecorder({ kind: "audio", captions: true, maxMs: 5 * 60 * 1e3 });
  const [transcribing, setTranscribing] = (0, import_react4.useState)(false);
  const [note, setNote] = (0, import_react4.useState)(null);
  (0, import_react4.useEffect)(() => {
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
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Text, { type: "secondary", style: { fontSize: 12.5 }, children: "Voice notes need a browser with microphone recording." });
  }
  const recording = rec.status === "recording";
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "grid", gap: 8 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "kf-voice", children: [
      recording ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_antd2.Button, { danger: true, icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_icons2.StopOutlined, {}), onClick: rec.stop, children: [
        "Stop ",
        formatMs(rec.elapsedMs)
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_antd2.Button, { icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_icons2.AudioOutlined, {}), loading: rec.status === "requesting", onClick: rec.start, disabled: transcribing, children: value ? "Record again" : "Describe it by voice" }),
      recording && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "kf-level", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("i", { style: { width: `${Math.round(rec.level * 100)}%` } }) }),
      !recording && value && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(Text, { type: "secondary", style: { fontSize: 12 }, children: [
          value.filename,
          " \xB7 ",
          formatMs(value.durationMs || 0)
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_antd2.Button, { size: "small", type: "text", icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_icons2.DeleteOutlined, {}), onClick: () => onChange(null) })
      ] }),
      transcribing && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(Text, { type: "secondary", style: { fontSize: 12 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_icons2.LoadingOutlined, {}),
        " Transcribing\u2026"
      ] })
    ] }),
    recording && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "kf-caption", children: rec.liveCaption || (supportsSpeech() ? "Listening\u2026" : "Recording (live captions are not available in this browser).") }),
    !recording && !value && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Text, { type: "secondary", style: { fontSize: 12 }, children: transcriptionAvailable ? "Say what happened \u2014 the recording is attached and transcribed into the report." : supportsSpeech() ? "Say what happened \u2014 your browser captions it and the recording is attached." : "Say what happened \u2014 the recording is attached to the report." }),
    rec.error && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_antd2.Alert, { type: "warning", showIcon: true, message: rec.error, style: { borderRadius: 8 } }),
    note && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_antd2.Alert, { type: "info", showIcon: true, message: note, style: { borderRadius: 8 } }),
    (value == null ? void 0 : value.transcript) && !recording && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_antd2.Space, { direction: "vertical", size: 2, style: { width: "100%" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(Text, { type: "secondary", style: { fontSize: 12 }, children: [
        "Transcript",
        value.transcriptSource ? ` (${value.transcriptSource})` : "",
        " \u2014 you can edit it:"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
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
var import_react5 = __toESM(require("react"), 1);
var import_antd3 = require("antd");
var import_jsx_runtime4 = require("react/jsx-runtime");
var { Text: Text2 } = import_antd3.Typography;
var STATE_COLORS = { new: "blue", acknowledged: "geekblue", in_progress: "gold", done: "green", dismissed: "default" };
var STATE_LABELS = { new: "New", acknowledged: "Acknowledged", in_progress: "In progress", done: "Done", dismissed: "Dismissed" };
var KIND_LABELS = { bug: "Bug", idea: "Idea", question: "Question", "report-tool": "Report tool" };
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
  const [items, setItems] = (0, import_react5.useState)(null);
  (0, import_react5.useEffect)(() => {
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
  if (items === null) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_antd3.Skeleton, { active: true, paragraph: { rows: 3 } });
  if (!items.length) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_antd3.Empty, { description: "You have not reported anything yet.", image: import_antd3.Empty.PRESENTED_IMAGE_SIMPLE });
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
    items.map((r) => {
      var _a;
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "kf-report", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_antd3.Tag, { color: STATE_COLORS[r.triageState] || "default", style: { margin: 0 }, children: STATE_LABELS[r.triageState] || r.triageState }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { minWidth: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "t", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: ((_a = r.ticket) == null ? void 0 : _a.title) || r.summary }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "s", children: [
            KIND_LABELS[r.kind] || r.kind,
            " \xB7 ",
            relTime(r.createdAt),
            r.route ? ` \xB7 ${r.route}` : ""
          ] })
        ] }),
        r.ticketKey && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_antd3.Button, { size: "small", type: "link", onClick: () => onOpenTicket == null ? void 0 : onOpenTicket(r.ticketKey), children: r.ticketKey })
      ] }, r.id);
    }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Text2, { type: "secondary", style: { fontSize: 12 }, children: "You are notified when a report changes state or gets a reply." })
  ] });
}

// src/capture.js
var WIDGET_SELECTORS = [".kids-feedback-root", ".kids-feedback-modal-wrap", ".kids-feedback-pill"];
function supportsExactCapture() {
  var _a;
  return typeof navigator !== "undefined" && Boolean((_a = navigator.mediaDevices) == null ? void 0 : _a.getDisplayMedia) && window.isSecureContext;
}
function scrollerFrame({ bodyRect, scrollLeft = 0, scrollTop = 0, scrollWidth = 0, scrollHeight = 0 }) {
  return {
    left: bodyRect.left - scrollLeft,
    top: bodyRect.top - scrollTop,
    width: Math.max(bodyRect.width, scrollWidth),
    height: Math.max(bodyRect.height, scrollHeight)
  };
}
function coverViewportOrigin(frame) {
  const pad = { left: Math.max(0, frame.left), top: Math.max(0, frame.top) };
  return { pad, frame: { ...frame, left: frame.left - pad.left, top: frame.top - pad.top } };
}
function viewportCropRect({ bodyRect, viewportWidth, viewportHeight, scale, imageWidth, imageHeight }) {
  const outWidth = Math.round(viewportWidth * scale);
  const outHeight = Math.round(viewportHeight * scale);
  let k = scale;
  if (bodyRect.width > 0) k = Math.min(k, imageWidth / bodyRect.width);
  if (bodyRect.height > 0) k = Math.min(k, imageHeight / bodyRect.height);
  const axis = (bodyStart, bodySize, viewSize, imageSize) => {
    const lo = Math.max(0, -bodyStart);
    const hi = Math.min(imageSize / k, viewSize - bodyStart);
    const len = Math.max(0, hi - lo);
    const src = Math.min(imageSize, Math.round(lo * k));
    const srcSize = Math.max(0, Math.min(imageSize - src, Math.round(len * k)));
    const dst = Math.round((lo + bodyStart) * scale);
    const dstSize = srcSize > 0 ? Math.round(len * scale) : 0;
    return [src, srcSize, dst, dstSize];
  };
  const [sx, sw, dx, dw] = axis(bodyRect.left, bodyRect.width, viewportWidth, imageWidth);
  const [sy, sh, dy, dh] = axis(bodyRect.top, bodyRect.height, viewportHeight, imageHeight);
  return { sx, sy, sw, sh, dx, dy, dw, dh, outWidth, outHeight };
}
var VIEWPORT_POSITIONED = /* @__PURE__ */ new Set(["fixed", "sticky", "-webkit-sticky"]);
var isNone = (v) => !v || v === "none";
var isTranslateOnly = (s) => (isNone(s.transform) || /^matrix\(\s*1\s*,\s*0\s*,\s*0\s*,\s*1\s*,/.test(s.transform)) && isNone(s.rotate) && isNone(s.scale);
var createsContainingBlock = (s) => s.position !== "static" || !isNone(s.transform) || !isNone(s.filter) || !isNone(s.backdropFilter) || !isNone(s.perspective) || /transform|perspective|filter/.test(s.willChange || "") || /layout|paint|strict|content/.test(s.contain || "");
var parentOf = (el) => {
  var _a, _b;
  return el.parentElement || ((_b = (_a = el.getRootNode) == null ? void 0 : _a.call(el)) == null ? void 0 : _b.host) || null;
};
function pinViewportPositioned({
  root,
  rootClone,
  nodeMap,
  rootScroll = { left: 0, top: 0 },
  getStyle = (el) => getComputedStyle(el)
}) {
  if (!root || !(rootClone == null ? void 0 : rootClone.style) || !nodeMap) return 0;
  const pins = [];
  for (const [copy, orig] of nodeMap) {
    if (orig === root || (orig == null ? void 0 : orig.nodeType) !== 1 || (copy == null ? void 0 : copy.nodeType) !== 1 || !copy.style) continue;
    const s = getStyle(orig);
    if (!VIEWPORT_POSITIONED.has(s.position) || !isTranslateOnly(s)) continue;
    const rect = orig.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) continue;
    let block = parentOf(orig);
    while (block && block !== root && !createsContainingBlock(getStyle(block))) block = parentOf(block);
    if (!block) continue;
    if (block !== root && !isTranslateOnly(getStyle(block))) continue;
    const b = block.getBoundingClientRect();
    const shift = block === root ? rootScroll : { left: 0, top: 0 };
    pins.push({
      copy,
      sticky: s.position !== "fixed",
      left: rect.left - b.left - (block.clientLeft || 0) + (shift.left || 0),
      top: rect.top - b.top - (block.clientTop || 0) + (shift.top || 0),
      width: rect.width,
      height: rect.height
    });
  }
  if (pins.length && getStyle(root).position === "static") rootClone.style.position = "relative";
  for (const p of pins) {
    const st = p.copy.style;
    if (p.sticky && p.copy.parentNode) {
      const ph = p.copy.cloneNode(false);
      ph.style.position = "static";
      ph.style.visibility = "hidden";
      ph.style.width = `${p.width}px`;
      ph.style.height = `${p.height}px`;
      ph.style.boxSizing = "border-box";
      p.copy.parentNode.insertBefore(ph, p.copy);
    }
    st.position = "absolute";
    st.left = `${p.left}px`;
    st.top = `${p.top}px`;
    st.right = "auto";
    st.bottom = "auto";
    st.width = `${p.width}px`;
    st.height = `${p.height}px`;
    st.margin = "0";
    st.boxSizing = "border-box";
    st.transform = "none";
    st.translate = "none";
  }
  return pins.length;
}
var SCROLLING = /* @__PURE__ */ new Set(["auto", "scroll", "overlay"]);
function bodyScroller(body, scrollingElement, getStyle) {
  if (body === scrollingElement) return null;
  const s = getStyle(body);
  const html = body.parentElement;
  const h = html ? getStyle(html) : null;
  const propagated = Boolean(h) && h.overflowX === "visible" && h.overflowY === "visible";
  const clipsY = SCROLLING.has(s.overflowY) || propagated && (s.overflowY === "hidden" || s.overflowY === "clip");
  const overflows = clipsY && body.scrollHeight > body.clientHeight || SCROLLING.has(s.overflowX) && body.scrollWidth > body.clientWidth;
  if (!body.scrollTop && !body.scrollLeft && !overflows) return null;
  return {
    left: body.scrollLeft,
    top: body.scrollTop,
    width: body.scrollWidth,
    height: body.scrollHeight,
    sideways: body.scrollLeft !== 0 || body.scrollWidth > body.clientWidth
  };
}
function canvasBackground() {
  const clear = (c) => !c || c === "transparent" || /^rgba\(.*,\s*0\)$/.test(c);
  for (const el of [document.documentElement, document.body]) {
    const c = getComputedStyle(el).backgroundColor;
    if (!clear(c)) return c;
  }
  return "#ffffff";
}
function unscrollRootClone(rootClone, scroller) {
  var _a;
  const st = rootClone.style;
  const wrap = [...rootClone.children].find((el) => {
    var _a2;
    return ((_a2 = el.style) == null ? void 0 : _a2.willChange) === "transform" && /^translate\(/.test(el.style.transform);
  });
  if (wrap) {
    wrap.style.transform = "none";
    wrap.style.willChange = "auto";
    for (const el of rootClone.querySelectorAll("*")) {
      if (((_a = el.style) == null ? void 0 : _a.position) !== "absolute") continue;
      el.style.top = `${(parseFloat(el.style.top) || 0) - scroller.top}px`;
      el.style.left = `${(parseFloat(el.style.left) || 0) - scroller.left}px`;
    }
  }
  st.overflow = "visible";
  st.height = "auto";
  st.minHeight = `${scroller.height}px`;
  if (scroller.sideways) {
    st.width = "auto";
    st.minWidth = `${scroller.width}px`;
  }
}
function quickCaptureGeometry({
  body,
  scrollingElement,
  viewportWidth,
  viewportHeight,
  getStyle = (el) => getComputedStyle(el)
}) {
  const bodyRect = body.getBoundingClientRect();
  const scroller = bodyScroller(body, scrollingElement, getStyle);
  const { pad, frame } = coverViewportOrigin(scrollerFrame(scroller ? { bodyRect, scrollLeft: scroller.left, scrollTop: scroller.top, scrollWidth: scroller.width, scrollHeight: scroller.height } : { bodyRect }));
  const rootScroll = scroller ? { left: scroller.left, top: scroller.top } : { left: 0, top: 0 };
  return { scroller, pad, frame, rootScroll, viewportWidth, viewportHeight };
}
async function captureQuick({ scale } = {}) {
  const { snapdom } = await import("@zumer/snapdom");
  const dpr = window.devicePixelRatio || 1;
  const s = scale || Math.min(dpr, 2);
  const {
    scroller,
    pad,
    frame,
    rootScroll,
    viewportWidth,
    viewportHeight
  } = quickCaptureGeometry({
    body: document.body,
    scrollingElement: document.scrollingElement,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  });
  const background = canvasBackground();
  const result = await snapdom(document.body, {
    scale: s,
    // s already includes the pixel ratio; without this snapdom multiplies by it again.
    dpr: 1,
    exclude: WIDGET_SELECTORS,
    excludeMode: "hide",
    backgroundColor: background,
    embedFonts: true,
    fast: true,
    plugins: [{
      name: "kids-feedback-viewport-pin",
      afterClone: (c) => {
        if (scroller) unscrollRootClone(c.clone, scroller);
        pinViewportPositioned({ root: c.element, rootClone: c.clone, nodeMap: c.nodeMap, rootScroll });
        if (pad.left) c.clone.style.marginLeft = `${pad.left}px`;
        if (pad.top) c.clone.style.marginTop = `${pad.top}px`;
      }
    }]
  });
  const full = await loadImage(await result.toBlob({ type: "png" }));
  const r = viewportCropRect({
    bodyRect: frame,
    viewportWidth,
    viewportHeight,
    scale: s,
    imageWidth: full.naturalWidth,
    imageHeight: full.naturalHeight
  });
  const canvas = document.createElement("canvas");
  canvas.width = r.outWidth;
  canvas.height = r.outHeight;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, r.outWidth, r.outHeight);
  if (r.sw > 0 && r.sh > 0) ctx.drawImage(full, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return { blob, width: r.outWidth, height: r.outHeight, method: "quick" };
}
function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the screenshot."));
    };
    img.src = url;
  });
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
function blobToFile(blob, name, type) {
  return new File([blob], name, { type: type || blob.type || "application/octet-stream" });
}

// src/metadata.js
var import_bowser = __toESM(require("bowser"), 1);
function browserInfo() {
  try {
    const p = import_bowser.default.getParser(window.navigator.userAgent);
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
    const type = import_bowser.default.getParser(window.navigator.userAgent).getPlatform().type;
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

// src/diagnostics.js
var WIDGET_VERSION = "1.7.0";
var REPORT_TOOL_KIND = "report-tool";
var REPORT_TOOL_PREFIX = "Report tool: ";
var MAX_TEXT = 280;
var MAX_STACK = 2e3;
function clipText(v, max = MAX_TEXT) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max)}\u2026 (+${s.length - max} chars)` : s;
}
function errorRecord(stage, e) {
  var _a;
  if (!e) return null;
  return {
    stage: stage || null,
    message: clipText((_a = e.message) != null ? _a : e, 600),
    stack: typeof e.stack === "string" ? e.stack.slice(0, MAX_STACK) : null
  };
}
function buildDiagnostics({
  state: state2,
  progress,
  lastError,
  failedAttachments,
  browser,
  viewport,
  form = {},
  now = /* @__PURE__ */ new Date()
} = {}) {
  var _a, _b;
  const f = form;
  return {
    widgetVersion: WIDGET_VERSION,
    state: state2 || "unknown",
    progress: progress || null,
    lastError: lastError || null,
    form: {
      kind: f.kind || null,
      severity: f.kind === "bug" ? f.severity || null : null,
      summary: clipText(f.summary),
      expected: clipText(f.expected),
      steps: clipText(f.steps),
      transcript: clipText(f.transcript),
      screenshot: f.shot ? { method: f.shot.method || null, annotated: Boolean(f.shot.annotated) } : null,
      voiceNote: f.voice ? { durationMs: (_a = f.voice.durationMs) != null ? _a : null, mimeType: f.voice.mimeType || null } : null,
      screenRecording: f.screen ? { durationMs: (_b = f.screen.durationMs) != null ? _b : null, mimeType: f.screen.mimeType || null } : null,
      files: (f.files || []).map((x) => {
        var _a2;
        return { name: x.name, type: x.type || null, size: (_a2 = x.size) != null ? _a2 : null };
      })
    },
    failedAttachments: (failedAttachments || []).map((a) => ({ name: a.name, error: clipText(a.error, 300) })),
    browser: browser || null,
    viewport: viewport || null,
    capturedAt: now.toISOString()
  };
}
function buildReportToolPayload({ text, diagnostics, pageUrl = null, route = null, context = {} }) {
  const said = String(text || "").trim();
  return {
    kind: REPORT_TOOL_KIND,
    severity: null,
    summary: `${REPORT_TOOL_PREFIX}${said || "(no description, see diagnostics)"}`.slice(0, 2e4),
    expected: null,
    steps: null,
    transcript: null,
    transcriptSource: null,
    pageUrl,
    route,
    // Inside context (not top level): both adapters and the KIDS server keep
    // `context` as-is, while unknown top-level fields are dropped.
    context: { ...context, diagnostics }
  };
}

// src/FeedbackModal.jsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var { Text: Text3 } = import_antd4.Typography;
var { TextArea } = import_antd4.Input;
var KINDS = [
  { key: "bug", label: "Bug", icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.BugOutlined, {}), hint: "Something is broken or wrong" },
  { key: "idea", label: "Idea", icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.BulbOutlined, {}), hint: "A feature or improvement" },
  { key: "question", label: "Question", icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.QuestionCircleOutlined, {}), hint: "How do I\u2026?" }
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
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: `kf-chip${active ? ` active ${cls}` : ""}`, onClick, children });
}
var canAnnotate = (f) => f.type.startsWith("image/") && f.type !== "image/svg+xml";
var annotatedName = (name) => {
  const base = name.replace(/\.[^./]*$/, "");
  return base.endsWith("-annotated") ? `${base}.png` : `${base}-annotated.png`;
};
function FileThumb({ file }) {
  const [url, setUrl] = (0, import_react6.useState)(null);
  (0, import_react6.useEffect)(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("img", { className: "kf-file-thumb", src: url, alt: "" }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "kf-file-thumb" });
}
function FeedbackModal({ open, onClose, prefill, onOpenTicket, hidden, setHidden }) {
  var _a;
  const { transport, buildSha, appName, getImpersonation } = useReportConfig();
  const meta = () => pageMetadata({ buildSha, getImpersonation });
  const [tab, setTab] = (0, import_react6.useState)("new");
  const [config, setConfig] = (0, import_react6.useState)(null);
  const [kind, setKind] = (0, import_react6.useState)("bug");
  const [severity, setSeverity] = (0, import_react6.useState)("annoying");
  const [summary, setSummary] = (0, import_react6.useState)("");
  const [expected, setExpected] = (0, import_react6.useState)("");
  const [steps, setSteps] = (0, import_react6.useState)("");
  const [shot, setShot] = (0, import_react6.useState)(null);
  const [annotateTarget, setAnnotateTarget] = (0, import_react6.useState)(null);
  const [capturing, setCapturing] = (0, import_react6.useState)(false);
  const [voice, setVoice] = (0, import_react6.useState)(null);
  const [screen, setScreen] = (0, import_react6.useState)(null);
  const [files, setFiles] = (0, import_react6.useState)([]);
  const [submitting, setSubmitting] = (0, import_react6.useState)(false);
  const [progress, setProgress] = (0, import_react6.useState)("");
  const [done, setDone] = (0, import_react6.useState)(null);
  const [refreshKey, setRefreshKey] = (0, import_react6.useState)(0);
  const [lastError, setLastError] = (0, import_react6.useState)(null);
  const [failedUploads, setFailedUploads] = (0, import_react6.useState)([]);
  const [problem, setProblem] = (0, import_react6.useState)(null);
  const autoShotDone = (0, import_react6.useRef)(false);
  const copyRef = (0, import_react6.useRef)(null);
  const noteError = (stage, e) => setLastError(errorRecord(stage, e));
  const screenRec = useMediaRecorder({ kind: "screen", maxMs: 2 * 60 * 1e3 });
  const closeAnnotator = () => {
    if ((annotateTarget == null ? void 0 : annotateTarget.kind) === "file") URL.revokeObjectURL(annotateTarget.url);
    setAnnotateTarget(null);
  };
  const annotateFile = (index, file) => setAnnotateTarget({ kind: "file", index, file, url: URL.createObjectURL(file) });
  const lastTargetRef = (0, import_react6.useRef)(null);
  if (annotateTarget) lastTargetRef.current = annotateTarget;
  const shownTarget = annotateTarget || lastTargetRef.current;
  (0, import_react6.useEffect)(() => () => {
    var _a2;
    if (((_a2 = lastTargetRef.current) == null ? void 0 : _a2.kind) === "file") URL.revokeObjectURL(lastTargetRef.current.url);
  }, []);
  (0, import_react6.useEffect)(() => {
    if (!open) return;
    transport.fetchFeedbackConfig().then(setConfig).catch(() => setConfig({ transcription: { available: false } }));
  }, [open]);
  (0, import_react6.useEffect)(() => {
    if (!open || !prefill) return;
    if (prefill.kind) setKind(prefill.kind);
    if (prefill.summary) setSummary(prefill.summary);
    if (prefill.severity) setSeverity(prefill.severity);
    setTab("new");
  }, [open, prefill]);
  (0, import_react6.useEffect)(() => {
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
        noteError("auto-screenshot", e);
      } finally {
        if (alive) setCapturing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open]);
  (0, import_react6.useEffect)(() => {
    if (!screenRec.result) return;
    const { blob, mimeType, durationMs } = screenRec.result;
    setScreen({ blob, mimeType, durationMs, filename: `screen-recording.${extensionFor(mimeType)}` });
    screenRec.reset();
    setHidden(false);
  }, [screenRec.result]);
  (0, import_react6.useEffect)(() => {
    if (screenRec.error) {
      setHidden(false);
      import_antd4.message.warning(screenRec.error);
      noteError("screen-recording", screenRec.error);
    }
  }, [screenRec.error]);
  const reset = (0, import_react6.useCallback)(() => {
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
    setLastError(null);
    setFailedUploads([]);
    setProblem(null);
    autoShotDone.current = false;
  }, [shot]);
  const handleClose = () => {
    setProblem(null);
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
      if ((e == null ? void 0 : e.name) !== "NotAllowedError") {
        import_antd4.message.warning(e.message || "Screenshot cancelled.");
        noteError("exact-screenshot", e);
      }
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
      import_antd4.message.warning(e.message || "Screenshot failed.");
      noteError("screenshot", e);
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
    if (ok.length < incoming.length) import_antd4.message.warning("Some files were too large to attach.");
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
  const context = (0, import_react6.useMemo)(() => open ? { ...meta(), ...snapshotContext() } : null, [open, done]);
  const canSubmit = summary.trim().length > 0 && !submitting;
  const submit = async () => {
    var _a2;
    if (!canSubmit) return;
    setSubmitting(true);
    setProgress("Creating the ticket\u2026");
    const warnings = [];
    const failed = [];
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
          failed.push({ name: uploads[i].name, error: e.message });
          noteError("upload", e);
        }
      }
      setProgress("Finishing\u2026");
      await transport.finalizeFeedback(created.id).catch((e) => {
        warnings.push(`Context comment failed (${e.message}).`);
        noteError("finalize", e);
      });
      setFailedUploads(failed);
      setDone({ ticketKey: created.ticketKey, warnings });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setProgress("");
      noteError("submit", e);
    } finally {
      setSubmitting(false);
    }
  };
  const formState = () => {
    if (tab === "mine") return "my-reports";
    if (submitting) return "submitting";
    if (done) return done.warnings.length ? "sent-with-warnings" : "sent";
    if ((lastError == null ? void 0 : lastError.stage) === "submit") return "submit-failed";
    if (screenRec.status === "recording") return "recording-screen";
    if (capturing) return "capturing-screenshot";
    return "editing";
  };
  const openProblem = () => {
    const { browser, viewport } = meta();
    setProblem({
      text: "",
      status: "editing",
      diagnostics: buildDiagnostics({
        state: formState(),
        progress,
        lastError,
        failedAttachments: failedUploads,
        browser,
        viewport,
        form: { kind, severity, summary, expected, steps, transcript: voice == null ? void 0 : voice.transcript, shot, voice, screen, files }
      })
    });
  };
  const sendProblem = async () => {
    const payload = buildReportToolPayload({
      text: problem.text,
      diagnostics: problem.diagnostics,
      pageUrl: window.location.href,
      route: window.location.pathname,
      context: { ...meta(), ...snapshotContext() }
    });
    setProblem((p) => ({ ...p, status: "sending" }));
    try {
      const created = await transport.submitFeedback(payload);
      await transport.finalizeFeedback(created.id).catch((e) => {
        if (!created.ticketKey) throw e;
      });
      setProblem((p) => ({ ...p, status: "sent", ticketKey: created.ticketKey }));
    } catch (e) {
      setProblem((p) => ({ ...p, status: "failed", error: (e == null ? void 0 : e.message) || String(e), copyText: JSON.stringify(payload, null, 2) }));
    }
  };
  const copyProblem = () => {
    var _a2;
    const el = copyRef.current;
    const fallback = () => {
      el == null ? void 0 : el.focus();
      el == null ? void 0 : el.select();
      import_antd4.message.info("Selected. Press Ctrl+C (Cmd+C on a Mac) to copy.");
    };
    if (!((_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText)) {
      fallback();
      return;
    }
    navigator.clipboard.writeText(problem.copyText).then(() => import_antd4.message.success("Copied the report and diagnostics."), fallback);
  };
  const problemLink = /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: "kf-link", onClick: openProblem, children: "Problem with this form?" });
  const transcriptionAvailable = Boolean((_a = config == null ? void 0 : config.transcription) == null ? void 0 : _a.available);
  const desktop = isDesktop();
  const includedPopover = /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "kf-context", style: { maxWidth: 420 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Text3, { type: "secondary", style: { fontSize: 12 }, children: "Sent with the report so the developer can reproduce it. Nothing you type elsewhere, no passwords." }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { children: JSON.stringify({
      page: typeof window !== "undefined" ? window.location.pathname : null,
      browser: (context == null ? void 0 : context.browser) ? `${context.browser.name} ${context.browser.version} \xB7 ${context.browser.os} ${context.browser.osVersion || ""}` : null,
      viewport: (context == null ? void 0 : context.viewport) ? `${context.viewport.width}\xD7${context.viewport.height} @${context.viewport.dpr}x` : null,
      build: context == null ? void 0 : context.buildSha,
      actingAs: (context == null ? void 0 : context.impersonating) || void 0,
      recentRoutes: ((context == null ? void 0 : context.routeHistory) || []).slice(-6).map((r) => r.path),
      recentErrors: ((context == null ? void 0 : context.errors) || []).slice(-8).map((e) => `${e.level}: ${e.message}`)
    }, null, 2) })
  ] });
  const form = done ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "kf-success", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.CheckCircleFilled, { style: { fontSize: 40, color: "#22c55e" } }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "key", children: done.ticketKey }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(Text3, { children: [
      "Thanks \u2014 your ",
      kind === "bug" ? "report" : kind,
      " is filed. You will be notified when it moves or gets a reply."
    ] }),
    done.warnings.map((w) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Alert, { type: "warning", showIcon: true, message: w, style: { borderRadius: 8, textAlign: "left" } }, w)),
    done.warnings.length > 0 && problemLink,
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_antd4.Space, { children: [
      done.ticketKey && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_antd4.Button, { type: "primary", onClick: () => {
        onOpenTicket == null ? void 0 : onOpenTicket(done.ticketKey);
        handleClose();
      }, children: [
        "Open ",
        done.ticketKey
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { onClick: reset, children: "Report another" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { type: "text", onClick: handleClose, children: "Close" })
    ] })
  ] }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "kf-body", onPaste, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "kf-chips", children: KINDS.map((k) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Tooltip, { title: k.hint, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(Chip, { active: kind === k.key, cls: k.key, onClick: () => setKind(k.key), children: [
      k.icon,
      " ",
      k.label
    ] }) }) }, k.key)) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "kf-textarea", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(VoicePanel, { value: voice, onChange: setVoice, transcriptionAvailable }),
    kind === "bug" && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "kf-section-label", children: "How bad is it?" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "kf-chips", children: SEVERITIES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Chip, { active: severity === s.key, cls: s.key, onClick: () => setSeverity(s.key), children: s.label }, s.key)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      import_antd4.Collapse,
      {
        ghost: true,
        size: "small",
        items: [{
          key: "more",
          label: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Text3, { type: "secondary", style: { fontSize: 12.5 }, children: "More detail (optional)" }),
          children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_antd4.Space, { direction: "vertical", style: { width: "100%" }, size: 8, children: [
            kind !== "question" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(TextArea, { value: expected, onChange: (e) => setExpected(e.target.value), placeholder: kind === "bug" ? "What did you expect to happen?" : "Why would this help?", autoSize: { minRows: 2, maxRows: 5 } }),
            kind === "bug" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(TextArea, { value: steps, onChange: (e) => setSteps(e.target.value), placeholder: "Steps to make it happen again, if you know them\n1. \u2026\n2. \u2026", autoSize: { minRows: 2, maxRows: 6 } })
          ] })
        }]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "kf-capture-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: `kf-card${shot ? " filled" : ""}`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "kf-card-title", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.CameraOutlined, {}),
            " Screenshot"
          ] }),
          capturing && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.LoadingOutlined, {})
        ] }),
        shot ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "kf-shot", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("img", { src: shot.url, alt: "Screenshot of the page" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "kf-shot-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Tooltip, { title: "Draw on it", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { size: "small", icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.EditOutlined, {}), onClick: () => setAnnotateTarget({ kind: "shot" }), children: "Annotate" }) }),
            desktop && supportsExactCapture() && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Tooltip, { title: "Retake with exact pixels (asks to share this tab)", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { size: "small", icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.ReloadOutlined, {}), onClick: retakeExact, children: "Retake" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Tooltip, { title: "Remove", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { size: "small", danger: true, icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.DeleteOutlined, {}), onClick: () => {
              URL.revokeObjectURL(shot.url);
              setShot(null);
            } }) })
          ] })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_antd4.Space, { wrap: true, children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { size: "small", icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.CameraOutlined, {}), loading: capturing, onClick: retakeQuick, children: "Take screenshot" }),
          desktop && supportsExactCapture() && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { size: "small", onClick: retakeExact, loading: capturing, children: "Exact pixels\u2026" })
        ] }),
        (shot == null ? void 0 : shot.annotated) && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Text3, { type: "secondary", style: { fontSize: 11.5 }, children: "Annotated" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: `kf-card${screen || files.length ? " filled" : ""}`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "kf-card-title", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.PaperClipOutlined, {}),
          " Recording & files"
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_antd4.Space, { wrap: true, children: [
          desktop && supportsExactCapture() && !screen && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { size: "small", icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.VideoCameraOutlined, {}), loading: screenRec.status === "requesting", onClick: startScreenRecording, children: "Record screen" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Upload, { multiple: true, showUploadList: false, beforeUpload: (f, list) => {
            if (!list.length || f === list[0]) addFiles(list.length ? list : [f]);
            return false;
          }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { size: "small", icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.PaperClipOutlined, {}), children: "Add files" }) })
        ] }),
        (screen || files.length > 0) && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "kf-files", children: [
          screen && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "kf-file", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.VideoCameraOutlined, {}),
            " ",
            screen.filename,
            " \xB7 ",
            formatMs(screen.durationMs),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", onClick: () => setScreen(null), "aria-label": "Remove recording", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.CloseOutlined, {}) })
          ] }),
          files.map((f, i) => canAnnotate(f) ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "kf-file kf-file-image", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(FileThumb, { file: f }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "kf-file-name", title: f.name, children: f.name }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("button", { type: "button", className: "kf-file-annotate", onClick: () => annotateFile(i, f), "aria-label": `Annotate ${f.name}`, children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.EditOutlined, {}),
              " Annotate"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", onClick: () => setFiles((p) => p.filter((_, j) => j !== i)), "aria-label": `Remove ${f.name}`, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.CloseOutlined, {}) })
          ] }, i) : /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "kf-file", children: [
            f.name,
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", onClick: () => setFiles((p) => p.filter((_, j) => j !== i)), "aria-label": `Remove ${f.name}`, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.CloseOutlined, {}) })
          ] }, i))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Text3, { type: "secondary", style: { fontSize: 11.5 }, children: "Paste an image anywhere in this form to attach it." })
      ] })
    ] })
  ] });
  const footer = done ? null : /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "kf-footer", children: [
    (lastError == null ? void 0 : lastError.stage) === "submit" && !submitting && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      import_antd4.Alert,
      {
        className: "kf-error",
        type: "error",
        showIcon: true,
        message: `Your report was not sent: ${lastError.message || "unknown error"}. What you wrote is still here, so you can try again.`,
        action: problemLink
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "kf-included", children: [
      "We'll also include the page, your account, browser and recent errors.",
      " ",
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Popover, { content: includedPopover, title: "What gets included", trigger: "click", placement: "topLeft", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("a", { children: "view" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "kf-sep", children: "\xB7" }),
      problemLink
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_antd4.Space, { children: [
      progress && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(Text3, { type: "secondary", style: { fontSize: 12 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.LoadingOutlined, {}),
        " ",
        progress
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { onClick: handleClose, disabled: submitting, children: "Cancel" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { type: "primary", onClick: submit, disabled: !canSubmit, loading: submitting, children: "Send report" })
    ] })
  ] });
  const problemView = problem && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "kf-body kf-problem", children: problem.status === "sent" ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "kf-success", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.CheckCircleFilled, { style: { fontSize: 32, color: "#22c55e" } }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(Text3, { children: [
        "Thanks, the team will look at the form itself",
        problem.ticketKey ? ` (${problem.ticketKey})` : "",
        "."
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Text3, { type: "secondary", children: "Something wrong with this report form itself? Tell us what happened. The details below are attached automatically." }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
        TextArea,
        {
          autoFocus: true,
          value: problem.text,
          onChange: (e) => {
            const text = e.target.value;
            setProblem((p) => ({ ...p, text }));
          },
          placeholder: "e.g. Send did nothing, or the screenshot never appeared",
          autoSize: { minRows: 2, maxRows: 6 },
          maxLength: 2e3,
          disabled: problem.status === "sending"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
        import_antd4.Collapse,
        {
          ghost: true,
          size: "small",
          items: [{
            key: "diag",
            label: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Text3, { type: "secondary", style: { fontSize: 12.5 }, children: "Diagnostics we'll attach" }),
            children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "kf-context", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { children: JSON.stringify(problem.diagnostics, null, 2) }) })
          }]
        }
      ),
      problem.status === "failed" && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          import_antd4.Alert,
          {
            type: "error",
            showIcon: true,
            message: `This could not be sent either (${problem.error}). Copy it and send it to the team another way.`,
            action: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { size: "small", onClick: copyProblem, children: "Copy" })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("textarea", { ref: copyRef, className: "kf-copy", readOnly: true, value: problem.copyText, "aria-label": "Report and diagnostics to copy" })
      ] })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "kf-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", {}),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_antd4.Space, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { onClick: () => setProblem(null), disabled: problem.status === "sending", children: "Back to my report" }),
        problem.status !== "sent" && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { type: "primary", onClick: sendProblem, loading: problem.status === "sending", children: problem.status === "failed" ? "Try again" : "Send" })
      ] })
    ] })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
      import_antd4.Modal,
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
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "kf-head", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h3", { children: problem ? "Problem with this form" : "Report a bug or share an idea" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { children: (config == null ? void 0 : config.project) ? `Goes straight to the ${appName} team as a ticket in ${config.project.name}.` : `Goes straight to the ${appName} team as a ticket.` })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_antd4.Space, { children: [
              !problem && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
                import_antd4.Tabs,
                {
                  size: "small",
                  activeKey: tab,
                  onChange: setTab,
                  items: [{ key: "new", label: "New report" }, { key: "mine", label: "My reports" }],
                  style: { marginBottom: -16 }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { type: "text", icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.CloseOutlined, {}), onClick: handleClose, "aria-label": "Close" })
            ] })
          ] }),
          problem ? problemView : tab === "new" ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
            form,
            footer
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { padding: "14px 20px 18px" }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(MyReports, { refreshKey, onOpenTicket: (k) => {
            onOpenTicket == null ? void 0 : onOpenTicket(k);
            handleClose();
          } }) })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      import_antd4.Modal,
      {
        open: Boolean(annotateTarget) && (annotateTarget.kind === "file" || Boolean(shot)),
        onCancel: closeAnnotator,
        footer: null,
        width: 960,
        centered: true,
        destroyOnHidden: true,
        wrapClassName: "kids-feedback-annotator-wrap",
        title: (shownTarget == null ? void 0 : shownTarget.kind) === "file" ? "Annotate the image" : "Annotate the screenshot",
        maskClosable: false,
        zIndex: 1170,
        children: (shownTarget == null ? void 0 : shownTarget.kind) === "file" ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          Annotator,
          {
            src: shownTarget.url,
            doneLabel: "Use this image",
            subject: "Image",
            onCancel: closeAnnotator,
            onDone: (blob) => {
              const t = annotateTarget;
              const next = blobToFile(blob, annotatedName(t.file.name), "image/png");
              setFiles((p) => p.map((f, j) => j === t.index && f === t.file ? next : f));
              closeAnnotator();
            }
          }
        ) : shot && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          Annotator,
          {
            src: shot.url,
            onCancel: closeAnnotator,
            onDone: (blob) => {
              URL.revokeObjectURL(shot.url);
              setShot({ ...shot, blob, url: URL.createObjectURL(blob), annotated: true });
              closeAnnotator();
            }
          }
        )
      }
    ),
    screenRec.status === "recording" && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "kids-feedback-pill", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dot" }),
      " Recording your screen \xB7 ",
      formatMs(screenRec.elapsedMs),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_antd4.Button, { size: "small", danger: true, icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_icons3.StopOutlined, {}), onClick: screenRec.stop, children: "Stop" })
    ] })
  ] });
}

// src/FeedbackWidget.jsx
var import_jsx_runtime6 = require("react/jsx-runtime");
var OPEN_EVENT = "kids:feedback:open";
function openFeedback(prefill) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: prefill || null }));
}
var GAP = 22;
var PANELS = ".ant-drawer-content-wrapper, .ant-modal-wrap:not(.kids-feedback-modal-wrap):not(.kids-feedback-annotator-wrap) .ant-modal-content";
function useAvoidOverlays(ref) {
  const [pos, setPos] = (0, import_react7.useState)(null);
  (0, import_react7.useEffect)(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      let right = GAP;
      let bottom = GAP;
      const panels = Array.from(document.querySelectorAll(PANELS)).map((p) => p.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
      for (let i = 0; i < panels.length; i += 1) {
        const left = vw - right - w;
        const top = vh - bottom - h;
        const hit = panels.find((r) => r.left < left + w && r.right > left && r.top < top + h && r.bottom > top);
        if (!hit) break;
        if (vw - hit.left + GAP + w <= vw - 8) right = vw - hit.left + GAP;
        else if (vh - hit.top + GAP + h <= vh - 8) bottom = vh - hit.top + GAP;
        else break;
      }
      setPos((p) => p && p.right === right && p.bottom === bottom ? p : { right, bottom });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    schedule();
    return () => {
      mo.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      cancelAnimationFrame(frame);
    };
  }, [ref]);
  return pos;
}
var stop = (e) => e.stopPropagation();
function FeedbackWidget({ onOpenTicket, hideButton = false, config }) {
  const [open, setOpen] = (0, import_react7.useState)(false);
  const [hidden, setHidden] = (0, import_react7.useState)(false);
  const [prefill, setPrefill] = (0, import_react7.useState)(null);
  const [mounted, setMounted] = (0, import_react7.useState)(false);
  const rootRef = (0, import_react7.useRef)(null);
  const pos = useAvoidOverlays(rootRef);
  (0, import_react7.useEffect)(() => {
    setMounted(true);
  }, []);
  (0, import_react7.useEffect)(() => {
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
  const handleOpenTicket = (0, import_react7.useCallback)((key) => {
    if (!key) return;
    if (onOpenTicket) onOpenTicket(key);
    else window.location.assign(`/browse/${key}`);
  }, [onOpenTicket]);
  const fab = !hideButton && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
    "div",
    {
      ref: rootRef,
      className: "kids-feedback-root",
      style: pos || void 0,
      onPointerDown: stop,
      onMouseDown: stop,
      onMouseUp: stop,
      onClick: stop,
      children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_antd5.Tooltip, { title: "Report a bug or share an idea (Alt+Shift+F)", placement: "left", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("button", { type: "button", className: "kids-feedback-fab", onClick: () => {
        setPrefill(null);
        setOpen(true);
      }, "aria-label": "Report a bug or share an idea", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_icons4.MessageOutlined, {}),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "kids-feedback-fab-label", children: "Report" })
      ] }) })
    }
  );
  const ui = /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
    fab && mounted ? (0, import_react_dom.createPortal)(fab, document.body) : fab,
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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
  return config ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ReportProvider, { config, children: ui }) : ui;
}

// src/RouteRecorder.jsx
var import_react8 = require("react");
function useRouteTracker(pathname) {
  const tracked = pathname !== void 0;
  (0, import_react8.useEffect)(() => {
    if (tracked) recordRoute(pathname);
  }, [tracked, pathname]);
  (0, import_react8.useEffect)(() => {
    if (!tracked) installHistoryTracking();
  }, [tracked]);
}
function RouteRecorder({ pathname }) {
  useRouteTracker(pathname);
  return null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FeedbackModal,
  FeedbackWidget,
  KIND_LABELS,
  MyReports,
  OPEN_EVENT,
  REPORT_TOOL_KIND,
  REPORT_TOOL_PREFIX,
  ReportProvider,
  RouteRecorder,
  STATE_COLORS,
  STATE_LABELS,
  WIDGET_VERSION,
  buildDiagnostics,
  buildReportToolPayload,
  clipText,
  errorRecord,
  extensionFor,
  formatMs,
  installContextBuffer,
  installHistoryTracking,
  lastUncaught,
  openFeedback,
  pageMetadata,
  pickMime,
  recordError,
  recordRoute,
  relTime,
  snapshotContext,
  supportsRecording,
  supportsSpeech,
  useMediaRecorder,
  useReportConfig,
  useRouteTracker
});
//# sourceMappingURL=index.cjs.map