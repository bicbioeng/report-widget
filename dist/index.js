"use client";

// src/FeedbackWidget.jsx
import React6, { useCallback as useCallback4, useEffect as useEffect7, useRef as useRef6, useState as useState5 } from "react";
import { createPortal } from "react-dom";
import { Tooltip as Tooltip3 } from "antd";
import { MessageOutlined } from "@ant-design/icons";

// src/FeedbackModal.jsx
import React5, { useCallback as useCallback3, useEffect as useEffect6, useMemo as useMemo2, useRef as useRef5, useState as useState4 } from "react";
import { Modal, Input as Input2, Button as Button4, Tabs, Typography as Typography3, Space as Space2, Tooltip as Tooltip2, message as message2, Collapse, Popover, Upload, Alert as Alert2 } from "antd";
import {
  BugOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
  CameraOutlined,
  EditOutlined,
  ReloadOutlined,
  DeleteOutlined as DeleteOutlined3,
  PaperClipOutlined,
  VideoCameraOutlined,
  StopOutlined as StopOutlined2,
  CheckCircleFilled,
  CloseOutlined as CloseOutlined2,
  LoadingOutlined as LoadingOutlined2,
  AimOutlined
} from "@ant-design/icons";

// src/Annotator.jsx
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Space, Tooltip, message } from "antd";
import {
  BorderOutlined,
  ArrowRightOutlined,
  HighlightOutlined,
  EyeInvisibleOutlined,
  FontSizeOutlined,
  UndoOutlined,
  CheckOutlined,
  CloseOutlined,
  DragOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  SelectOutlined,
  DeleteOutlined
} from "@ant-design/icons";

// src/annotatorMath.js
function clampZoom(next, maxZoom) {
  let z = Math.min(maxZoom, Math.max(1, next));
  if (z - 1 < 1e-6) z = 1;
  if (maxZoom - z < 1e-6) z = maxZoom;
  return z;
}
var MAX_PCT = 400;
var maxZoomFor = (fit2) => Math.max(1, MAX_PCT / 100 / fit2);
var PCT_STEP = 25;
function stepZoom(zoom, fit2, dir) {
  const pct = zoom * fit2 * 100;
  const k = pct / PCT_STEP;
  const next = (dir > 0 ? Math.floor(k + 1e-6) + 1 : Math.ceil(k - 1e-6) - 1) * PCT_STEP;
  return clampZoom(next / 100 / fit2, maxZoomFor(fit2));
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
function shapeBox(s, textWidth, size) {
  if (s.type === "pen") {
    const xs = s.points.map((p) => p.x), ys = s.points.map((p) => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  if (s.type === "text") return { x: s.x, y: s.y - size, w: textWidth(s), h: size * 1.3 };
  return { x: Math.min(s.x1, s.x2), y: Math.min(s.y1, s.y2), w: Math.abs(s.x2 - s.x1), h: Math.abs(s.y2 - s.y1) };
}
var segDist = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = dx || dy ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};
var inBox = (p, b, tol) => p.x >= b.x - tol && p.x <= b.x + b.w + tol && p.y >= b.y - tol && p.y <= b.y + b.h + tol;
function hitShape(shapes, p, tol, textWidth, size) {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    const hit = s.type === "arrow" ? segDist(p, { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }) <= tol : s.type === "pen" ? s.points.some((q, j) => segDist(p, j ? s.points[j - 1] : q, q) <= tol) : inBox(p, shapeBox(s, textWidth, size), tol);
    if (hit) return i;
  }
  return -1;
}
function moveShape(s, dx, dy) {
  if (s.type === "pen") return { ...s, points: s.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
  if (s.type === "text") return { ...s, x: s.x + dx, y: s.y + dy };
  return { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy };
}

// src/Annotator.jsx
import { jsx, jsxs } from "react/jsx-runtime";
var COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#0f172a", "#ffffff"];
var TOOLS = [
  { key: "select", label: "Select", icon: /* @__PURE__ */ jsx(SelectOutlined, {}) },
  { key: "rect", label: "Box", icon: /* @__PURE__ */ jsx(BorderOutlined, {}) },
  { key: "arrow", label: "Arrow", icon: /* @__PURE__ */ jsx(ArrowRightOutlined, {}) },
  { key: "pen", label: "Draw", icon: /* @__PURE__ */ jsx(HighlightOutlined, {}) },
  { key: "blur", label: "Blur", icon: /* @__PURE__ */ jsx(EyeInvisibleOutlined, {}) },
  { key: "text", label: "Text", icon: /* @__PURE__ */ jsx(FontSizeOutlined, {}) },
  { key: "move", label: "Pan", icon: /* @__PURE__ */ jsx(DragOutlined, {}) }
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
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const blurRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tool, setTool] = useState("rect");
  const [color, setColor] = useState(COLORS[0]);
  const [shapes, setShapes] = useState([]);
  const [selected, setSelected] = useState(null);
  const dragRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const [textAt, setTextAt] = useState(null);
  const [textValue, setTextValue] = useState("");
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fit2, setFit] = useState(1);
  const [panReady, setPanReady] = useState(false);
  const [panning, setPanning] = useState(false);
  const panRef = useRef(null);
  const anchorRef = useRef(null);
  const lastAnchorRef = useRef(null);
  const zoomRef = useRef(1);
  const keysRef = useRef(null);
  const tabFocusRef = useRef(null);
  const draftRef = useRef(null);
  draftRef.current = draft;
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;
  const textAtRef = useRef(textAt);
  textAtRef.current = textAt;
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
    img.onerror = () => setFailed(true);
    img.src = src;
  }, [src]);
  const lineScale = useMemo(() => imgRef.current ? Math.max(1, imgRef.current.naturalWidth / 1400) : 1, [ready]);
  const textSize = Math.round(18 * lineScale);
  const textWidth = useCallback((t) => {
    var _a2;
    const ctx = (_a2 = canvasRef.current) == null ? void 0 : _a2.getContext("2d");
    if (!ctx) return 0;
    ctx.save();
    ctx.font = `600 ${textSize}px Inter, sans-serif`;
    const w = ctx.measureText(t.text).width;
    ctx.restore();
    return w;
  }, [textSize]);
  const sel = selected != null ? shapes[selected] : null;
  const render = useCallback(() => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    for (const s of shapes) drawShape(ctx, s, blurRef.current, lineScale);
    if (draft) drawShape(ctx, draft, blurRef.current, lineScale);
    if (sel) {
      const b = shapeBox(sel, textWidth, textSize), pad = 6 * lineScale;
      ctx.save();
      ctx.setLineDash([6 * lineScale, 4 * lineScale]);
      ctx.lineWidth = 1.5 * lineScale;
      ctx.strokeStyle = "#6366f1";
      ctx.strokeRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
      ctx.restore();
    }
  }, [shapes, draft, lineScale, sel, textWidth, textSize]);
  useEffect(() => {
    if (ready) render();
  }, [ready, render]);
  useEffect(() => {
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
  const scale = fit2 * zoom;
  const maxZoom = maxZoomFor(fit2);
  const dispW = Math.floor(natW * scale);
  const dispH = Math.floor(natH * scale);
  const textBox = textAt && textBoxRect(textAt.cx, textAt.cy, dispW, dispH);
  useLayoutEffect(() => {
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
  }, [zoom, fit2]);
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
  const zoomIn = () => zoomTo(stepZoom(zoomRef.current, fit2, 1));
  const zoomOut = () => zoomTo(stepZoom(zoomRef.current, fit2, -1));
  const zoomFit = () => zoomTo(1);
  const deleteSelected = () => {
    if (selected == null) return;
    setShapes((all) => all.filter((_, j) => j !== selected));
    setSelected(null);
  };
  keysRef.current = { zoomIn, zoomOut, zoomFit, zoomTo, deleteSelected };
  useEffect(() => {
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
  useEffect(() => {
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
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        keysRef.current.deleteSelected();
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
    var _a2, _b2, _c, _d, _e, _f, _g, _h;
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
    if (tool === "select") {
      const i = hitShape(shapes, p, 8 / scale, textWidth, textSize);
      setSelected(i >= 0 ? i : null);
      if (i >= 0) {
        dragRef.current = { i, x: p.x, y: p.y, orig: shapes[i] };
        (_f = (_e = e.currentTarget).setPointerCapture) == null ? void 0 : _f.call(_e, e.pointerId);
      }
      return;
    }
    if (tool === "text") {
      setTextAt(p);
      setTextValue("");
      return;
    }
    (_h = (_g = e.currentTarget).setPointerCapture) == null ? void 0 : _h.call(_g, e.pointerId);
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
    const drag = dragRef.current;
    if (drag) {
      const p2 = toCanvas(e);
      setShapes((all) => all.map((x, j) => j === drag.i ? moveShape(drag.orig, p2.x - drag.x, p2.y - drag.y) : x));
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
    if (dragRef.current) {
      dragRef.current = null;
      return;
    }
    const d = draftRef.current;
    if (!d) return;
    draftRef.current = null;
    const tooSmall = d.type !== "pen" && Math.abs(d.x2 - d.x1) < 3 && Math.abs(d.y2 - d.y1) < 3;
    if (!tooSmall) setShapes((s) => [...s, d]);
    setDraft(null);
  };
  const onDoubleClick = (e) => {
    if (tool !== "select" || !ready || textAt) return;
    const p = toCanvas(e);
    const i = hitShape(shapes, p, 8 / scale, textWidth, textSize);
    const t = shapes[i];
    if (!t || t.type !== "text") return;
    setShapes((all) => all.filter((_, j) => j !== i));
    setSelected(null);
    setColor(t.color);
    setTextAt({ x: t.x, y: t.y, cx: t.x * scale, cy: t.y * scale });
    setTextValue(t.text);
  };
  const finish = () => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (exporting || !c || !img) return;
    const all = withPendingText(shapesRef.current, takeOnce(textAtRef), textValue, color);
    setTextAt(null);
    setTextValue("");
    setShapes(all);
    setSelected(null);
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
      message.error(exportErrorText(subject));
    }, "image/png");
  };
  return /* @__PURE__ */ jsxs("div", { className: "kf-annotator", children: [
    /* @__PURE__ */ jsxs("div", { className: "kf-tools", role: "toolbar", "aria-label": "Markup tools", children: [
      /* @__PURE__ */ jsx("span", { className: "kf-group", children: TOOLS.map((t) => /* @__PURE__ */ jsx(Tooltip, { title: t.label, children: /* @__PURE__ */ jsx("button", { type: "button", className: `kf-tool${tool === t.key ? " active" : ""}`, "aria-label": t.label, "aria-pressed": tool === t.key, disabled: t.key === "move" && !ready, onClick: () => {
        setTool(t.key);
        setSelected(null);
      }, children: t.icon }) }, t.key)) }),
      /* @__PURE__ */ jsx("span", { className: "kf-group kf-colors", role: "group", "aria-label": "Color", children: COLORS.map((c) => /* @__PURE__ */ jsx("button", { type: "button", "aria-label": `Color ${c}`, "aria-pressed": color === c, className: `kf-swatch${color === c ? " active" : ""}`, style: { background: c }, onClick: () => setColor(c) }, c)) }),
      /* @__PURE__ */ jsx("span", { style: { flex: 1 } }),
      /* @__PURE__ */ jsxs("span", { className: "kf-group", children: [
        tool === "select" && /* @__PURE__ */ jsx(Tooltip, { title: "Delete selected (Del)", children: /* @__PURE__ */ jsx("button", { type: "button", className: "kf-tool", "aria-label": "Delete selected", disabled: !sel, onClick: deleteSelected, children: /* @__PURE__ */ jsx(DeleteOutlined, {}) }) }),
        /* @__PURE__ */ jsx(Tooltip, { title: "Undo", children: /* @__PURE__ */ jsx("button", { type: "button", className: "kf-tool", "aria-label": "Undo", disabled: !shapes.length, onClick: () => {
          setShapes((s) => s.slice(0, -1));
          setSelected(null);
        }, children: /* @__PURE__ */ jsx(UndoOutlined, {}) }) })
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "kf-zoom", role: "group", "aria-label": "Zoom", children: [
        /* @__PURE__ */ jsx(Tooltip, { title: "Zoom out (\u2212)", children: /* @__PURE__ */ jsx("button", { type: "button", "aria-label": "Zoom out", disabled: !ready || zoom <= 1, onClick: zoomOut, children: /* @__PURE__ */ jsx(ZoomOutOutlined, {}) }) }),
        /* @__PURE__ */ jsx("span", { className: "kf-zoom-pct", "aria-live": "polite", children: ready ? `${Math.round(scale * 100)}%` : "\u2014" }),
        /* @__PURE__ */ jsx(Tooltip, { title: "Zoom in (+)", children: /* @__PURE__ */ jsx("button", { type: "button", "aria-label": "Zoom in", disabled: !ready || zoom >= maxZoom, onClick: zoomIn, children: /* @__PURE__ */ jsx(ZoomInOutlined, {}) }) }),
        /* @__PURE__ */ jsx(Tooltip, { title: "Fit to window (0)", children: /* @__PURE__ */ jsx("button", { type: "button", "aria-label": "Fit to window", disabled: !ready || zoom === 1, onClick: zoomFit, children: "Fit" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: `kf-stage${panReady || tool === "move" ? " kf-pan-ready" : ""}${panning ? " kf-panning" : ""}${tool === "select" ? " kf-select" : ""}`,
        ref: stageRef,
        tabIndex: 0,
        "aria-label": "Image area. Use the arrow keys to scroll when zoomed in.",
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp,
        onLostPointerCapture: onPointerUp,
        onDoubleClick,
        onMouseDown: (e) => {
          if (e.button === 1) e.preventDefault();
        },
        children: [
          /* @__PURE__ */ jsxs("div", { className: "kf-canvas-wrap", ref: wrapRef, style: failed ? { display: "none" } : void 0, children: [
            /* @__PURE__ */ jsx(
              "canvas",
              {
                ref: canvasRef,
                role: "img",
                "aria-label": `${subject} you are annotating`,
                style: ready ? { width: dispW, height: dispH } : void 0
              }
            ),
            textAt && /* @__PURE__ */ jsx("div", { className: "kf-text-input", style: { left: textBox.left, top: textBox.top }, children: /* @__PURE__ */ jsx(
              Input,
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
          failed && /* @__PURE__ */ jsx("div", { className: "kf-stage-error", children: "This image can't be opened for markup. It will still be attached as it is." })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
      tool === "select" && /* @__PURE__ */ jsx("span", { className: "kf-zoom-hint", children: "Drag a mark to move it. Double-click text to edit it. Delete removes the selected mark." }),
      zoom > 1 && /* @__PURE__ */ jsx("span", { className: "kf-zoom-hint", children: "Hold Space and drag to move around. Pinch or Ctrl + scroll to zoom." }),
      /* @__PURE__ */ jsx("span", { style: { flex: 1 } }),
      /* @__PURE__ */ jsxs(Space, { children: [
        /* @__PURE__ */ jsx(Button, { icon: /* @__PURE__ */ jsx(CloseOutlined, {}), onClick: onCancel, children: "Cancel" }),
        /* @__PURE__ */ jsx(Button, { type: "primary", icon: /* @__PURE__ */ jsx(CheckOutlined, {}), onClick: finish, disabled: !ready || exporting, loading: exporting, children: doneLabel })
      ] })
    ] })
  ] });
}

// src/VoicePanel.jsx
import React3, { useEffect as useEffect4, useRef as useRef3 } from "react";
import { Button as Button2, Typography, Alert } from "antd";
import { AudioOutlined, StopOutlined, DeleteOutlined as DeleteOutlined2, LoadingOutlined } from "@ant-design/icons";

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
  const stop2 = useCallback2(() => {
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
  const reset = useCallback2(() => {
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
var NEEDS_TEXT = " Write a few words above so you can send it.";
function VoicePanel({ open = true, value, onChange, session, transcriptionAvailable }) {
  const { transport } = useReportConfig();
  const rec = useMediaRecorder({ kind: "audio", captions: true, maxMs: 5 * 60 * 1e3 });
  const { transcribing, note } = session.status;
  const setNote = (n) => session.setStatus((s) => ({ ...s, note: n }));
  const recordingId = useRef3(null);
  const start = () => {
    recordingId.current = session.next();
    session.setStatus({ transcribing: null, note: null });
    rec.start();
  };
  const remove = () => {
    session.next();
    session.setStatus({ transcribing: null, note: null });
    onChange(null);
  };
  useEffect4(() => {
    if (open) return;
    if (rec.status === "recording") rec.stop();
    else if (rec.status === "idle") rec.reset();
  }, [open, rec.status]);
  useEffect4(() => {
    if (!rec.result) return;
    const id = recordingId.current;
    if (!open || id === null || !session.isCurrent(id)) {
      rec.reset();
      return;
    }
    const { blob, mimeType, durationMs, captions } = rec.result;
    const filename = `voice-note.${extensionFor(mimeType)}`;
    const added2 = Boolean(captions) && session.addTranscript(id, captions);
    onChange({ blob, mimeType, durationMs, filename, transcript: added2 ? captions : "", transcriptSource: added2 ? "browser" : null });
    rec.reset();
    (async () => {
      session.setStatus({ transcribing: id, note: null });
      try {
        const out = await transport.transcribeAudio(blob, { filename });
        if (!session.isCurrent(id)) return;
        if (out.unavailable) {
          setNote(captions ? "Transcribed by your browser. An admin can add a transcription key under AI Settings for higher accuracy." : `No transcription is configured on the server and this browser has no speech recognition \u2014 the recording is attached as audio.${NEEDS_TEXT}`);
        } else if (out.text) {
          if (session.addTranscript(id, out.text)) onChange((prev) => ({ ...prev || {}, transcript: out.text, transcriptSource: out.provider }));
          setNote(null);
        }
      } catch (e) {
        if (!session.isCurrent(id)) return;
        setNote(captions ? `Kept your browser's captions \u2014 ${e.message}. The recording is attached either way.` : `Transcription failed: ${e.message}. The recording is still attached to the report.${NEEDS_TEXT}`);
      } finally {
        session.setStatus((s) => s.transcribing === id ? { ...s, transcribing: null } : s);
      }
    })();
  }, [rec.result]);
  if (!supportsRecording()) {
    return /* @__PURE__ */ jsx3(Text, { type: "secondary", style: { fontSize: 12.5 }, children: "Voice notes need a browser with microphone recording." });
  }
  const recording = rec.status === "recording";
  const added = Boolean(value == null ? void 0 : value.transcript) && !recording;
  return /* @__PURE__ */ jsxs2("div", { style: { display: "grid", gap: 8 }, children: [
    /* @__PURE__ */ jsxs2("div", { className: "kf-voice", children: [
      recording ? /* @__PURE__ */ jsxs2(Button2, { danger: true, icon: /* @__PURE__ */ jsx3(StopOutlined, {}), onClick: rec.stop, children: [
        "Stop ",
        formatMs(rec.elapsedMs)
      ] }) : (
        // Not disabled while transcribing: disabling the focused button drops focus to <body>.
        // Recording again is safe — the session drops the older transcript.
        /* @__PURE__ */ jsx3(Button2, { icon: /* @__PURE__ */ jsx3(AudioOutlined, {}), loading: rec.status === "requesting", onClick: start, children: value ? "Record again" : "Describe it by voice" })
      ),
      recording && /* @__PURE__ */ jsx3("div", { className: "kf-level", children: /* @__PURE__ */ jsx3("i", { style: { width: `${Math.round(rec.level * 100)}%` } }) }),
      !recording && value && /* @__PURE__ */ jsxs2(Fragment, { children: [
        /* @__PURE__ */ jsxs2(Text, { type: "secondary", style: { fontSize: 12 }, children: [
          value.filename,
          " \xB7 ",
          formatMs(value.durationMs || 0)
        ] }),
        /* @__PURE__ */ jsx3(Button2, { size: "small", type: "text", icon: /* @__PURE__ */ jsx3(DeleteOutlined2, {}), onClick: remove, "aria-label": "Remove voice note" })
      ] }),
      transcribing && /* @__PURE__ */ jsxs2(Text, { type: "secondary", style: { fontSize: 12 }, children: [
        /* @__PURE__ */ jsx3(LoadingOutlined, {}),
        " Transcribing\u2026"
      ] })
    ] }),
    recording && /* @__PURE__ */ jsx3("div", { className: "kf-caption", children: rec.liveCaption || (supportsSpeech() ? "Listening\u2026" : "Recording (live captions are not available in this browser).") }),
    !recording && !value && /* @__PURE__ */ jsx3(Text, { type: "secondary", style: { fontSize: 12 }, children: transcriptionAvailable ? "Say what happened \u2014 it is written into the description above and the recording is attached." : supportsSpeech() ? "Say what happened \u2014 your browser writes it into the description above and the recording is attached." : "Say what happened \u2014 the recording is attached to the report." }),
    rec.error && /* @__PURE__ */ jsx3(Alert, { type: "warning", showIcon: true, message: rec.error, style: { borderRadius: 8 } }),
    note && /* @__PURE__ */ jsx3(Alert, { type: "info", showIcon: true, message: note, style: { borderRadius: 8 } }),
    /* @__PURE__ */ jsx3("div", { "aria-live": "polite", style: added ? void 0 : { marginTop: -8 }, children: added && /* @__PURE__ */ jsxs2(Text, { type: "secondary", style: { fontSize: 12 }, children: [
      "Added to the description above (",
      value.transcriptSource === "browser" ? "browser captions" : `transcribed by ${value.transcriptSource || "the server"}`,
      ")."
    ] }) })
  ] });
}

// src/MyReports.jsx
import React4, { useEffect as useEffect5, useRef as useRef4, useState as useState3 } from "react";
import { Empty, Skeleton, Typography as Typography2, Button as Button3, Select } from "antd";

// src/reportFilters.js
var STATE_LABELS = { new: "New", acknowledged: "Acknowledged", in_progress: "In progress", testing: "Testing", done: "Done", dismissed: "Dismissed" };
var KIND_LABELS = { bug: "Bug", idea: "Idea", question: "Question", "report-tool": "Report tool" };
var UNASSIGNED = "unassigned";
function readAssignee(v) {
  var _a;
  if (!v) return null;
  if (typeof v === "string") return { id: null, name: v };
  if (typeof v !== "object") return null;
  const name = v.name || v.displayName || v.email;
  return name ? { id: (_a = v.id) != null ? _a : null, name: String(name) } : null;
}
function assigneeOf(report) {
  var _a;
  return readAssignee(report == null ? void 0 : report.assignee) || readAssignee((_a = report == null ? void 0 : report.ticket) == null ? void 0 : _a.assignee);
}
function assigneeLabel(report) {
  var _a;
  return ((_a = assigneeOf(report)) == null ? void 0 : _a.name) || "Unassigned";
}
function assigneeMemberId(assignee, members) {
  var _a;
  if (!assignee) return null;
  const list = members || [];
  if (assignee.id != null && assignee.id !== "") return (_a = list.find((m) => String(m.id) === String(assignee.id))) == null ? void 0 : _a.id;
  const named = list.filter((m) => m.name === assignee.name);
  return named.length === 1 ? named[0].id : void 0;
}
var assigneeKey = (report) => {
  var _a, _b;
  return (_b = (_a = assigneeOf(report)) == null ? void 0 : _a.name) != null ? _b : UNASSIGNED;
};
var stateLabel = (s) => STATE_LABELS[s] || s;
var kindLabel = (k) => KIND_LABELS[k] || k;
var ORDER = Object.keys(STATE_LABELS);
var byState = (a, b) => {
  const i = ORDER.indexOf(a);
  const j = ORDER.indexOf(b);
  return (i < 0 ? ORDER.length : i) - (j < 0 ? ORDER.length : j);
};
function filterOptions(items, selected = {}) {
  const list = items || [];
  const states = new Set(list.map((r) => r.triageState).filter(Boolean));
  const kinds = new Set(list.map((r) => r.kind).filter(Boolean));
  const names = new Set(list.map((r) => {
    var _a;
    return (_a = assigneeOf(r)) == null ? void 0 : _a.name;
  }).filter(Boolean));
  if (selected.status) states.add(selected.status);
  if (selected.kind) kinds.add(selected.kind);
  if (selected.assignee && selected.assignee !== UNASSIGNED) names.add(selected.assignee);
  return {
    status: [...states].sort(byState).map((s) => ({ value: s, label: stateLabel(s) })),
    assignee: [
      { value: UNASSIGNED, label: "Unassigned" },
      ...[...names].sort((a, b) => a.localeCompare(b)).map((n) => ({ value: n, label: n }))
    ],
    kind: [...kinds].map((k) => ({ value: k, label: kindLabel(k) }))
  };
}
function filterReports(items, { status, assignee, kind } = {}) {
  return (items || []).filter((r) => (!status || r.triageState === status) && (!kind || r.kind === kind) && (!assignee || assigneeKey(r) === assignee));
}
function editCapability({ canEdit, members, transport } = {}) {
  const can = canEdit === true;
  return {
    status: can && typeof (transport == null ? void 0 : transport.updateFeedbackState) === "function",
    assignee: can && Array.isArray(members) && members.length > 0 && typeof (transport == null ? void 0 : transport.updateTicketAssignee) === "function"
  };
}
var FIELDS = {
  status: { read: (r) => r.triageState, write: (r, v) => ({ ...r, triageState: v }) },
  // Both places, so an explicit unassign is not read back from ticket.assignee.
  assignee: {
    read: (r) => {
      var _a;
      return { assignee: r.assignee, ticket: (_a = r.ticket) == null ? void 0 : _a.assignee };
    },
    write: (r, v) => ({ ...r, assignee: v.assignee, ticket: r.ticket ? { ...r.ticket, assignee: v.ticket } : r.ticket })
  }
};
function createReportStore(onChange = () => {
}) {
  let items = null;
  let started = 0;
  let landed = 0;
  const edits = /* @__PURE__ */ new Map();
  const emit = () => onChange(items);
  const write = (id, field, value) => {
    if (items) items = items.map((r) => r.id === id ? FIELDS[field].write(r, value) : r);
  };
  return {
    get items() {
      return items;
    },
    isBusy: (id, field) => {
      var _a;
      return !!((_a = edits.get(`${id}:${field}`)) == null ? void 0 : _a.pending);
    },
    /** fetch: () => Promise<{ items }>. A failed fetch shows an empty list. */
    load(fetch) {
      const seq = ++started;
      return new Promise((res) => res(fetch())).then((r) => (r == null ? void 0 : r.items) || [], () => []).then((list) => {
        if (seq !== started) return;
        landed = seq;
        items = list;
        for (const [k, e] of edits) {
          const row = items.find((r) => r.id === e.id);
          if (e.pending) {
            if (row && seq > e.staleUntil) e.base = FIELDS[e.field].read(row);
            write(e.id, e.field, e.value);
          } else {
            if (seq <= e.settledAt) write(e.id, e.field, e.value);
            edits.delete(k);
          }
        }
        emit();
      });
    },
    /** Shows value at once, then call(); resolves true on success, false after reverting. */
    edit(row, field, value, call) {
      const k = `${row.id}:${field}`;
      const prior = edits.get(k);
      if (prior == null ? void 0 : prior.pending) return Promise.resolve(false);
      const cur = (items == null ? void 0 : items.find((r) => r.id === row.id)) || row;
      const e = { id: row.id, field, value, base: FIELDS[field].read(cur), pending: true, staleUntil: prior ? prior.settledAt : 0 };
      edits.set(k, e);
      write(row.id, field, value);
      emit();
      return new Promise((res) => res(call())).then(() => {
        if (edits.get(k) !== e) return true;
        e.pending = false;
        e.settledAt = started;
        if (landed === started) edits.delete(k);
        emit();
        return true;
      }, () => {
        if (edits.get(k) === e) {
          if (prior && !prior.pending && prior.settledAt > landed) edits.set(k, prior);
          else edits.delete(k);
          write(e.id, field, e.base);
          emit();
        }
        return false;
      });
    }
  };
}

// src/MyReports.jsx
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
var { Text: Text2 } = Typography2;
var STATE_COLORS = { new: "blue", acknowledged: "geekblue", in_progress: "gold", testing: "cyan", done: "green", dismissed: "default" };
var FILL = { in_progress: 0.5, testing: 0.75 };
var C = 2 * Math.PI * 3;
function StatusIcon({ state: state2 }) {
  const done = state2 === "done";
  return /* @__PURE__ */ jsxs3("svg", { className: `kf-st kf-st--${state2}`, width: "16", height: "16", viewBox: "0 0 16 16", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsx4("circle", { cx: "8", cy: "8", r: "6.5", fill: done ? "currentColor" : "none", stroke: "currentColor", strokeWidth: "1.5", strokeDasharray: state2 === "new" ? "2.2 1.9" : void 0 }),
    FILL[state2] && /* @__PURE__ */ jsx4("circle", { cx: "8", cy: "8", r: "3", fill: "none", stroke: "currentColor", strokeWidth: "6", strokeDasharray: `${FILL[state2] * C} ${C}`, transform: "rotate(-90 8 8)" }),
    done && /* @__PURE__ */ jsx4("path", { d: "M5 8.2l2 2 4-4.2", fill: "none", stroke: "#fff", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }),
    state2 === "dismissed" && /* @__PURE__ */ jsx4("path", { d: "M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })
  ] });
}
var StatusLabel = ({ state: state2 }) => /* @__PURE__ */ jsxs3("span", { className: "kf-status", children: [
  /* @__PURE__ */ jsx4(StatusIcon, { state: state2 }),
  /* @__PURE__ */ jsx4("span", { className: `kf-st-label kf-st--${state2}`, children: STATE_LABELS[state2] || state2 })
] });
function relTime(iso) {
  const d = new Date(iso);
  const s = Math.round((Date.now() - d.getTime()) / 1e3);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return d.toLocaleDateString();
}
var STATUS_OPTIONS = Object.keys(STATE_LABELS).map((st) => ({ value: st, label: /* @__PURE__ */ jsx4(StatusLabel, { state: st }) }));
var UNASSIGN = "__unassigned";
var NO_FILTERS = { status: void 0, assignee: void 0, kind: void 0 };
var small = { size: "small", popupMatchSelectWidth: false };
function MyReports({ onOpenTicket, refreshKey, canEdit, members }) {
  const { transport, myReports } = useReportConfig();
  const [, rerender] = useState3(0);
  const store = useRef4(null);
  if (!store.current) store.current = createReportStore(() => rerender((n) => n + 1));
  const [filters, setFilters] = useState3(NO_FILTERS);
  const statusFilter = useRef4(null);
  useEffect5(() => {
    store.current.load(() => transport.fetchMyFeedback());
  }, [refreshKey]);
  const items = store.current.items;
  if (items === null) return /* @__PURE__ */ jsx4(Skeleton, { active: true, paragraph: { rows: 3 } });
  if (!items.length) return /* @__PURE__ */ jsx4(Empty, { description: "You have not reported anything yet.", image: Empty.PRESENTED_IMAGE_SIMPLE });
  const team = members != null ? members : myReports == null ? void 0 : myReports.members;
  const can = editCapability({ canEdit: canEdit != null ? canEdit : myReports == null ? void 0 : myReports.canEdit, members: team, transport });
  const options = filterOptions(items, filters);
  const rows = filterReports(items, filters);
  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  const clearFilters = () => {
    var _a;
    setFilters(NO_FILTERS);
    (_a = statusFilter.current) == null ? void 0 : _a.focus();
  };
  const busy = (r, field) => store.current.isBusy(r.id, field);
  const setStatus = (r, state2) => store.current.edit(r, "status", state2, () => transport.updateFeedbackState(r.id, state2));
  const setAssignee = (r, value) => {
    const m = value === UNASSIGN ? null : team.find((x) => x.id === value);
    const next = m ? { id: m.id, name: m.name } : null;
    store.current.edit(r, "assignee", { assignee: next, ticket: next }, () => transport.updateTicketAssignee(r.ticketKey, m ? m.id : null));
  };
  const assigneeValue = (r) => {
    const a = assigneeOf(r);
    const id = assigneeMemberId(a, team);
    if (id === null) return UNASSIGN;
    return id !== void 0 ? id : `name:${a.name}`;
  };
  const assigneeOptions = (r) => {
    const v = assigneeValue(r);
    const list = [{ value: UNASSIGN, label: "Unassigned" }, ...team.map((m) => ({ value: m.id, label: m.name }))];
    return typeof v === "string" && v.startsWith("name:") ? [...list, { value: v, label: v.slice(5), disabled: true }] : list;
  };
  return /* @__PURE__ */ jsxs3("div", { children: [
    /* @__PURE__ */ jsxs3("div", { className: "kf-reports-filters", children: [
      /* @__PURE__ */ jsx4(
        Select,
        {
          ...small,
          ref: statusFilter,
          allowClear: true,
          placeholder: "All statuses",
          "aria-label": "Filter by status",
          value: filters.status,
          onChange: setFilter("status"),
          options: options.status.map((o) => ({ value: o.value, label: /* @__PURE__ */ jsx4(StatusLabel, { state: o.value }) }))
        }
      ),
      /* @__PURE__ */ jsx4(
        Select,
        {
          ...small,
          allowClear: true,
          placeholder: "All assignees",
          "aria-label": "Filter by assignee",
          value: filters.assignee,
          onChange: setFilter("assignee"),
          options: options.assignee
        }
      ),
      (options.kind.length > 1 || filters.kind) && /* @__PURE__ */ jsx4(
        Select,
        {
          ...small,
          allowClear: true,
          placeholder: "All kinds",
          "aria-label": "Filter by kind",
          value: filters.kind,
          onChange: setFilter("kind"),
          options: options.kind
        }
      )
    ] }),
    !rows.length && /* @__PURE__ */ jsx4(Empty, { description: "No reports match", image: Empty.PRESENTED_IMAGE_SIMPLE, children: /* @__PURE__ */ jsx4(Button3, { type: "link", onClick: clearFilters, children: "Clear filters" }) }),
    rows.map((r) => {
      var _a;
      const editAssignee = can.assignee && !!r.ticketKey;
      const editing = can.status || editAssignee;
      return /* @__PURE__ */ jsxs3("div", { className: `kf-report${editing ? " kf-report--edit" : ""}`, children: [
        /* @__PURE__ */ jsx4(StatusIcon, { state: r.triageState }),
        /* @__PURE__ */ jsxs3("div", { style: { minWidth: 0 }, children: [
          /* @__PURE__ */ jsx4("div", { className: "t", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: ((_a = r.ticket) == null ? void 0 : _a.title) || r.summary }),
          /* @__PURE__ */ jsxs3("div", { className: "s", children: [
            /* @__PURE__ */ jsxs3("span", { className: "kf-report-meta", children: [
              /* @__PURE__ */ jsx4("span", { className: `kf-st-label kf-st--${r.triageState}`, children: STATE_LABELS[r.triageState] || r.triageState }),
              " \xB7 ",
              KIND_LABELS[r.kind] || r.kind,
              " \xB7 ",
              relTime(r.createdAt),
              r.route ? ` \xB7 ${r.route}` : ""
            ] }),
            /* @__PURE__ */ jsx4("span", { className: "kf-report-who", children: ` \xB7 ${assigneeLabel(r)}` })
          ] })
        ] }),
        (editing || r.ticketKey) && /* @__PURE__ */ jsxs3("div", { className: "kf-report-end", children: [
          editing && /* @__PURE__ */ jsxs3("div", { className: "kf-report-edit", children: [
            can.status && /* @__PURE__ */ jsx4(
              Select,
              {
                ...small,
                className: "kf-report-status",
                "aria-label": "Status",
                value: r.triageState,
                options: STATUS_OPTIONS,
                onChange: (v) => setStatus(r, v),
                disabled: busy(r, "status"),
                loading: busy(r, "status")
              }
            ),
            editAssignee && /* @__PURE__ */ jsx4(
              Select,
              {
                ...small,
                className: "kf-report-assignee",
                "aria-label": "Assignee",
                value: assigneeValue(r),
                options: assigneeOptions(r),
                onChange: (v) => setAssignee(r, v),
                showSearch: true,
                optionFilterProp: "label",
                disabled: busy(r, "assignee"),
                loading: busy(r, "assignee")
              }
            )
          ] }),
          r.ticketKey && /* @__PURE__ */ jsx4(Button3, { size: "small", type: "link", onClick: () => onOpenTicket == null ? void 0 : onOpenTicket(r.ticketKey), children: r.ticketKey })
        ] })
      ] }, r.id);
    }),
    /* @__PURE__ */ jsx4(Text2, { type: "secondary", style: { fontSize: 12 }, children: "You are notified when a report changes state or gets a reply." })
  ] });
}

// src/capture.js
var WIDGET_SELECTORS = [".kids-feedback-root", ".kf-root", ".kids-feedback-modal-wrap", ".kids-feedback-pill"];
function excludedFromCapture(el) {
  for (let n = el; n; n = n.parentElement) {
    if (WIDGET_SELECTORS.some((s) => {
      var _a;
      return (_a = n.matches) == null ? void 0 : _a.call(n, s);
    })) return true;
  }
  return false;
}
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

// src/elementPicker.js
var MAX_CLASSES = 8;
var MAX_TEXT = 200;
var MAX_HTML = 2e3;
var MAX_DEPTH = 5;
var CHIP_TEXT = 40;
var FORM_TAGS = /* @__PURE__ */ new Set(["input", "textarea", "select", "option"]);
var SECRET_ATTR = /token|passw(or)?d|pwd|secret|api[-_]?key|auth|session|csrf|xsrf|cookie|credential/i;
var tagOf = (el) => String((el == null ? void 0 : el.tagName) || "").toLowerCase();
var attr = (el, name) => {
  var _a;
  const v = (_a = el == null ? void 0 : el.getAttribute) == null ? void 0 : _a.call(el, name);
  return v == null || v === "" ? null : String(v);
};
var collapse = (s) => String(s != null ? s : "").replace(/\s+/g, " ").trim();
var clip = (s, max) => s.length > max ? `${s.slice(0, max - 1)}\u2026` : s;
var escapeIdent = (s) => typeof CSS !== "undefined" && CSS.escape ? CSS.escape(s) : String(s).replace(/[^\w-]/g, (c) => `\\${c}`);
function classesOf(el) {
  return String(attr(el, "class") || "").split(/\s+/).filter(Boolean);
}
function segment(el) {
  if (el.id) return `#${escapeIdent(el.id)}`;
  const tag = tagOf(el);
  const cls = classesOf(el).slice(0, 2).map((c) => `.${escapeIdent(c)}`).join("");
  const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => c.tagName === el.tagName) : [];
  const nth = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(el) + 1})` : "";
  return `${tag}${cls}${nth}`;
}
function selectorFor(el) {
  const parts = [];
  for (let n = el, depth = 0; n && depth <= MAX_DEPTH; n = n.parentElement, depth += 1) {
    if (/^(html|body)$/.test(tagOf(n))) break;
    parts.unshift(segment(n));
    if (n.id) break;
  }
  return parts.join(" > ");
}
function safeHtml(html) {
  let s = String(html || "").slice(0, MAX_HTML * 4);
  s = s.replace(/<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g, (m, tag, attrs, slash) => {
    const form = FORM_TAGS.has(tag.toLowerCase());
    const kept = (attrs.match(/[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g) || []).filter((a) => {
      const name = a.split("=")[0].trim().toLowerCase();
      if (SECRET_ATTR.test(name)) return false;
      return !(form && (name === "value" || name === "selected" || name === "checked"));
    });
    return `<${tag}${kept.map((a) => ` ${a}`).join("")}${slash ? " /" : ""}>`;
  });
  s = s.replace(/(<textarea\b[^>]*>)[\s\S]*?(?:<\/textarea>|$)/gi, "$1</textarea>");
  s = s.replace(/<[^>]*$/, "");
  return s.length > MAX_HTML ? `${s.slice(0, MAX_HTML - 1)}\u2026` : s;
}
function roundRect(r) {
  var _a, _b, _c, _d, _e, _f;
  return {
    x: Math.round((_b = (_a = r == null ? void 0 : r.x) != null ? _a : r == null ? void 0 : r.left) != null ? _b : 0),
    y: Math.round((_d = (_c = r == null ? void 0 : r.y) != null ? _c : r == null ? void 0 : r.top) != null ? _d : 0),
    width: Math.round((_e = r == null ? void 0 : r.width) != null ? _e : 0),
    height: Math.round((_f = r == null ? void 0 : r.height) != null ? _f : 0)
  };
}
function describeElement(el, { getRect = (e) => e.getBoundingClientRect() } = {}) {
  var _a;
  const tag = tagOf(el);
  const text = FORM_TAGS.has(tag) ? "" : collapse((_a = el.innerText) != null ? _a : el.textContent).slice(0, MAX_TEXT);
  return {
    tag,
    id: el.id || null,
    classes: classesOf(el).slice(0, MAX_CLASSES),
    selector: selectorFor(el),
    text: text || null,
    ariaLabel: attr(el, "aria-label"),
    role: attr(el, "role"),
    href: typeof el.href === "string" && el.href ? el.href : attr(el, "href"),
    alt: attr(el, "alt"),
    rect: roundRect(getRect(el)),
    html: safeHtml(el.outerHTML)
  };
}
function pickTarget(node) {
  let el = node;
  while (el && el.nodeType !== 1) el = el.parentElement || el.parentNode || null;
  if (!el || /^(html|body)$/.test(tagOf(el))) return null;
  return excludedFromCapture(el) ? null : el;
}
var nameOf = (d) => clip(collapse(d.text || d.ariaLabel || d.alt || ""), CHIP_TEXT);
function elementName(d) {
  const name = nameOf(d);
  return name ? `${d.tag} \u201C${name}\u201D` : d.tag;
}
function pickSummary(d) {
  const name = nameOf(d);
  return name ? `${d.selector} \u201C${name}\u201D` : d.selector;
}
function chipLabel(d) {
  return `Element: ${elementName(d)}`;
}
function outlineRect(rect, { imageWidth, imageHeight, viewportWidth }) {
  const k = viewportWidth > 0 ? imageWidth / viewportWidth : 1;
  const clamp2 = (v, max) => Math.min(max, Math.max(0, Math.round(v)));
  const x = clamp2(rect.x * k, imageWidth);
  const y = clamp2(rect.y * k, imageHeight);
  const width = clamp2((rect.x + rect.width) * k, imageWidth) - x;
  const height = clamp2((rect.y + rect.height) * k, imageHeight) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}
var OUTLINE_WAIT_MS = 1e3;
var PICK_SHOT_WAIT_MS = 1200;
function within(promise, ms, fallback = null) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    Promise.resolve(promise).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(fallback);
      }
    );
  });
}
async function drawOutline(shot, rect, viewportWidth = window.innerWidth, { waitMs = OUTLINE_WAIT_MS } = {}) {
  var _a, _b, _c;
  const original = { blob: shot.blob, width: shot.width, height: shot.height };
  let img;
  try {
    img = await within(typeof createImageBitmap === "function" ? createImageBitmap(shot.blob) : loadImage(shot.blob), waitMs);
  } catch {
    img = null;
  }
  const w = (img == null ? void 0 : img.naturalWidth) || (img == null ? void 0 : img.width);
  const h = (img == null ? void 0 : img.naturalHeight) || (img == null ? void 0 : img.height);
  if (!w || !h) return original;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = (_a = canvas.getContext) == null ? void 0 : _a.call(canvas, "2d");
  if (!ctx) {
    (_b = img.close) == null ? void 0 : _b.call(img);
    return original;
  }
  ctx.drawImage(img, 0, 0);
  (_c = img.close) == null ? void 0 : _c.call(img);
  const r = outlineRect(rect, { imageWidth: canvas.width, imageHeight: canvas.height, viewportWidth });
  if (r) {
    const k = viewportWidth > 0 ? canvas.width / viewportWidth : 1;
    const lw = 3 * k;
    const x0 = Math.max(lw / 2 + k, r.x - lw / 2);
    const y0 = Math.max(lw / 2 + k, r.y - lw / 2);
    const x1 = Math.min(canvas.width - lw / 2 - k, r.x + r.width + lw / 2);
    const y1 = Math.min(canvas.height - lw / 2 - k, r.y + r.height + lw / 2);
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = lw + 2 * k;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = "#6B63D9";
    ctx.lineWidth = lw;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  }
  const blob = await within(new Promise((resolve) => canvas.toBlob(resolve, "image/png")), waitMs);
  return blob ? { blob, width: canvas.width, height: canvas.height } : original;
}
function shotAfterPick({
  capture,
  outline = drawOutline,
  rect,
  viewportWidth,
  signal,
  waitMs = PICK_SHOT_WAIT_MS
}) {
  const late = (async () => {
    const r = await capture();
    if (!(r == null ? void 0 : r.blob)) return null;
    const outlined = await outline(r, rect, viewportWidth);
    return (outlined == null ? void 0 : outlined.blob) ? { ...r, ...outlined } : r;
  })().then(
    (shot) => ({ shot: (signal == null ? void 0 : signal.aborted) ? null : shot, error: null }),
    (error) => ({ shot: null, error: (signal == null ? void 0 : signal.aborted) ? null : error })
  );
  return new Promise((resolve) => {
    var _a;
    const done = (res) => {
      var _a2;
      clearTimeout(t);
      (_a2 = signal == null ? void 0 : signal.removeEventListener) == null ? void 0 : _a2.call(signal, "abort", onAbort);
      resolve({ produced: Boolean(res == null ? void 0 : res.shot), shot: (res == null ? void 0 : res.shot) || null, error: (res == null ? void 0 : res.error) || null, late });
    };
    const onAbort = () => done(null);
    const t = setTimeout(() => done(null), waitMs);
    (_a = signal == null ? void 0 : signal.addEventListener) == null ? void 0 : _a.call(signal, "abort", onAbort);
    if (signal == null ? void 0 : signal.aborted) done(null);
    else late.then(done);
  });
}
var overlaps = (a, b) => a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
var isWithin = (node, ancestor) => {
  for (let n = node; n; n = n.parentElement || n.parentNode) if (n === ancestor) return true;
  return false;
};
function frameAt(doc, x, y, under, getRect = (e) => e.getBoundingClientRect()) {
  var _a;
  if (typeof x !== "number" || typeof y !== "number" || !under) return null;
  let hit = null;
  for (const f of ((_a = doc.querySelectorAll) == null ? void 0 : _a.call(doc, "iframe, frame")) || []) {
    if (f === under || !isWithin(f, under)) continue;
    const r = getRect(f);
    if (x >= r.left && x < r.right && y >= r.top && y < r.bottom) hit = f;
  }
  return hit;
}
var LOCKS = 'style[rc-util-key^="rc-util-locker-"]';
function scrollLockKeys(doc = typeof document !== "undefined" ? document : null) {
  var _a;
  return [...((_a = doc == null ? void 0 : doc.querySelectorAll) == null ? void 0 : _a.call(doc, LOCKS)) || []].map((n) => n.getAttribute("rc-util-key"));
}
function suspendScrollLocks(keys, doc = document) {
  var _a;
  const off = [...((_a = doc.querySelectorAll) == null ? void 0 : _a.call(doc, LOCKS)) || []].filter((n) => keys.includes(n.getAttribute("rc-util-key"))).map((n) => {
    const media = n.getAttribute("media");
    n.setAttribute("media", "not all");
    return [n, media];
  });
  return () => {
    for (const [n, media] of off) {
      if (media == null) n.removeAttribute("media");
      else n.setAttribute("media", media);
    }
  };
}
function startElementPick({
  onHover,
  signal,
  doc = document,
  win = window,
  getRect = (e) => e.getBoundingClientRect()
} = {}) {
  return new Promise((resolve) => {
    var _a, _b, _c, _d;
    const make = (tag, className) => {
      const n = doc.createElement(tag);
      n.className = className;
      return n;
    };
    const layer = make("div", "kf-root kf-picker");
    const box = make("div", "kf-picker-box");
    const label = make("div", "kf-picker-label");
    const banner = make("div", "kf-picker-banner");
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    const hint = make("span", "kf-picker-hint");
    const touch = Boolean((_b = (_a = win.matchMedia) == null ? void 0 : _a.call(win, "(hover: none) and (pointer: coarse)")) == null ? void 0 : _b.matches);
    hint.textContent = touch ? "Tap an element to attach it" : "Click an element to attach it \xB7 Esc to cancel";
    const cancel = make("button", "kf-picker-cancel");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    banner.appendChild(hint);
    banner.appendChild(cancel);
    const frames = make("style", "");
    frames.textContent = "iframe, frame { pointer-events: none !important; }";
    layer.appendChild(frames);
    layer.appendChild(box);
    layer.appendChild(label);
    layer.appendChild(banner);
    doc.body.appendChild(layer);
    let hovered = null;
    let bannerTop = ((_c = banner.getBoundingClientRect) == null ? void 0 : _c.call(banner)) || null;
    const place = () => {
      if (!hovered) {
        box.style.display = "none";
        label.style.display = "none";
        return;
      }
      const r = getRect(hovered);
      Object.assign(box.style, {
        display: "block",
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`
      });
      label.textContent = elementName({
        tag: tagOf(hovered),
        text: FORM_TAGS.has(tagOf(hovered)) ? null : collapse(hovered.textContent).slice(0, 80),
        ariaLabel: attr(hovered, "aria-label"),
        alt: attr(hovered, "alt")
      });
      label.style.display = "block";
      const lh = label.offsetHeight || 22;
      const lw = label.offsetWidth || 0;
      const vw = win.innerWidth || 0;
      const vh = win.innerHeight || 0;
      const above = r.top - lh - 4;
      const top = above >= 4 ? above : Math.min(r.bottom + 4, Math.max(4, vh - lh - 4));
      label.style.top = `${top}px`;
      label.style.left = `${Math.max(4, Math.min(r.left, vw - lw - 4))}px`;
      banner.className = `kf-picker-banner${overlaps(r, bannerTop) ? " bottom" : ""}`;
    };
    const swallow = (e) => {
      var _a2, _b2, _c2;
      (_a2 = e.preventDefault) == null ? void 0 : _a2.call(e);
      (_b2 = e.stopPropagation) == null ? void 0 : _b2.call(e);
      (_c2 = e.stopImmediatePropagation) == null ? void 0 : _c2.call(e);
    };
    let finish;
    const targetOf = (e) => pickTarget(frameAt(doc, e.clientX, e.clientY, e.target, getRect) || e.target);
    const onMove = (e) => {
      const el = targetOf(e);
      if (el === hovered) return;
      hovered = el;
      place();
      if (el) onHover == null ? void 0 : onHover(el);
    };
    const onPress = (e) => {
      if (isWithin(e.target, cancel)) return;
      swallow(e);
      if (e.type === "pointerdown") onMove(e);
    };
    const onClick = (e) => {
      swallow(e);
      if (isWithin(e.target, cancel)) {
        finish(null);
        return;
      }
      const el = targetOf(e);
      if (el) finish({ element: el, description: describeElement(el, { getRect }) });
    };
    const onKey = (e) => {
      if (e.key !== "Escape" && e.key !== "Esc") return;
      swallow(e);
      finish(null);
    };
    const onViewport = () => {
      var _a2;
      if (hovered) {
        banner.className = "kf-picker-banner";
        bannerTop = ((_a2 = banner.getBoundingClientRect) == null ? void 0 : _a2.call(banner)) || null;
      }
      place();
    };
    const onAbort = () => finish(null);
    const listeners = [
      ["pointermove", onMove],
      ["pointerdown", onPress],
      ["pointerup", onPress],
      ["mousedown", onPress],
      ["mouseup", onPress],
      ["click", onClick],
      ["dblclick", onPress],
      ["keydown", onKey],
      ["scroll", onViewport],
      ["resize", onViewport]
    ];
    for (const [type, fn] of listeners) win.addEventListener(type, fn, true);
    (_d = signal == null ? void 0 : signal.addEventListener) == null ? void 0 : _d.call(signal, "abort", onAbort);
    finish = (result) => {
      var _a2, _b2;
      for (const [type, fn] of listeners) win.removeEventListener(type, fn, true);
      (_a2 = signal == null ? void 0 : signal.removeEventListener) == null ? void 0 : _a2.call(signal, "abort", onAbort);
      (_b2 = layer.parentNode) == null ? void 0 : _b2.removeChild(layer);
      finish = () => {
      };
      resolve(result);
    };
    if (signal == null ? void 0 : signal.aborted) finish(null);
  });
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

// src/diagnostics.js
var WIDGET_VERSION = "1.13.0";
var REPORT_TOOL_KIND = "report-tool";
var REPORT_TOOL_PREFIX = "Report tool: ";
var MAX_TEXT2 = 280;
var MAX_STACK = 2e3;
function clipText(v, max = MAX_TEXT2) {
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
  var _a, _b, _c;
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
      transcript: null,
      // voice text is in summary; the key stays
      screenshot: f.shot ? { method: f.shot.method || null, annotated: Boolean(f.shot.annotated) } : null,
      voiceNote: f.voice ? { durationMs: (_a = f.voice.durationMs) != null ? _a : null, mimeType: f.voice.mimeType || null } : null,
      screenRecording: f.screen ? { durationMs: (_b = f.screen.durationMs) != null ? _b : null, mimeType: f.screen.mimeType || null } : null,
      files: (f.files || []).map((x) => {
        var _a2;
        return { name: x.name, type: x.type || null, size: (_a2 = x.size) != null ? _a2 : null };
      }),
      element: ((_c = f.element) == null ? void 0 : _c.selector) || null
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

// src/reportForm.js
function pickOffer({ shot, picked, capturing, hidden }) {
  return {
    label: picked ? "Pick again" : "Pick an element",
    disabled: Boolean(capturing || hidden),
    placement: shot ? "row" : "actions",
    row: Boolean(shot || picked),
    chip: Boolean(picked)
  };
}
var SUMMARY_MAX_LENGTH = 2e4;
function isWholeLine(summary, start, text) {
  const end = start + text.length;
  return summary.startsWith(text, start) && (start === 0 || summary[start - 1] === "\n") && (end === summary.length || summary[end] === "\n");
}
function fit(text, room) {
  if (text.length <= room) return text;
  let cut = Math.max(0, room);
  const code = text.charCodeAt(cut - 1);
  if (code >= 55296 && code <= 56319) cut -= 1;
  return text.slice(0, cut).trimEnd();
}
function placeAfter(prev, next, segment2, p, s) {
  const changedEnd = prev.length - s;
  if (changedEnd <= segment2.start) return segment2.start + next.length - prev.length;
  if (p >= segment2.start + segment2.text.length) return segment2.start;
  return null;
}
function trackSegment(prev, next, segment2) {
  if (!segment2 || segment2.edited || prev === next) return segment2;
  const min = Math.min(prev.length, next.length);
  const same = (i) => prev[i] === next[i];
  const sameFromEnd = (i) => prev[prev.length - 1 - i] === next[next.length - 1 - i];
  let p = 0;
  while (p < min && same(p)) p += 1;
  let s = 0;
  while (s < min - p && sameFromEnd(s)) s += 1;
  let s2 = 0;
  while (s2 < min && sameFromEnd(s2)) s2 += 1;
  let p2 = 0;
  while (p2 < min - s2 && same(p2)) p2 += 1;
  const start = placeAfter(prev, next, segment2, p, s);
  const ok = start !== null && start === placeAfter(prev, next, segment2, p2, s2) && isWholeLine(next, start, segment2.text);
  return ok ? { ...segment2, start } : { ...segment2, edited: true };
}
function mergeTranscript(summary, transcript, last = null) {
  const text = String(transcript || "").trim();
  if (!text || (last == null ? void 0 : last.edited)) return { summary, inserted: last, added: false, truncated: false };
  if (last) {
    if (!isWholeLine(summary, last.start, last.text)) {
      return { summary, inserted: { ...last, edited: true }, added: false, truncated: false };
    }
    const fitted2 = fit(text, SUMMARY_MAX_LENGTH - (summary.length - last.text.length));
    const truncated2 = fitted2 !== text;
    if (!fitted2) return { summary, inserted: last, added: false, truncated: truncated2 };
    return {
      summary: summary.slice(0, last.start) + fitted2 + summary.slice(last.start + last.text.length),
      inserted: { start: last.start, text: fitted2 },
      added: true,
      truncated: truncated2
    };
  }
  const blank = !summary.trim();
  const fitted = fit(text, blank ? SUMMARY_MAX_LENGTH : SUMMARY_MAX_LENGTH - summary.length - 1);
  const truncated = fitted !== text;
  if (!fitted) return { summary, inserted: null, added: false, truncated };
  if (blank) return { summary: fitted, inserted: { start: 0, text: fitted }, added: true, truncated };
  return { summary: `${summary}
${fitted}`, inserted: { start: summary.length + 1, text: fitted }, added: true, truncated };
}
function createVoiceRun() {
  let id = 0;
  let segment2 = null;
  let known = null;
  const edit = (summary) => {
    if (segment2 && known !== null) segment2 = { ...segment2, inserted: trackSegment(known, summary, segment2.inserted) };
    known = summary;
  };
  return {
    next: () => ++id,
    isCurrent: (i) => i === id,
    clear: () => {
      id += 1;
      segment2 = null;
      known = null;
    },
    edit,
    add(summary, i, text) {
      if (i !== id) return { summary, inserted: null, added: false, truncated: false };
      edit(summary);
      const r = mergeTranscript(summary, text, (segment2 == null ? void 0 : segment2.id) === i ? segment2.inserted : null);
      segment2 = { id: i, inserted: r.inserted };
      known = r.summary;
      return r;
    }
  };
}
function feedbackPayload({ kind, severity, summary, expected, steps, voice, picked, context, pageUrl, route }) {
  return {
    kind,
    severity: kind === "bug" ? severity : null,
    summary: summary.trim(),
    expected: expected.trim() || null,
    steps: steps.trim() || null,
    // The voice note's text is already in summary; the key stays for older consumers.
    transcript: null,
    transcriptSource: (voice == null ? void 0 : voice.transcript) ? voice.transcriptSource || null : null,
    pageUrl,
    route,
    context: { ...context, element: (picked == null ? void 0 : picked.description) || null }
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
var canAnnotate = (f) => f.type.startsWith("image/") && f.type !== "image/svg+xml";
var annotatedName = (name) => {
  const base = name.replace(/\.[^./]*$/, "");
  return base.endsWith("-annotated") ? `${base}.png` : `${base}-annotated.png`;
};
function FileThumb({ file }) {
  const [url, setUrl] = useState4(null);
  useEffect6(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? /* @__PURE__ */ jsx5("img", { className: "kf-file-thumb", src: url, alt: "" }) : /* @__PURE__ */ jsx5("span", { className: "kf-file-thumb" });
}
function FeedbackModal({ open, onClose, prefill, onOpenTicket, hidden, setHidden }) {
  var _a;
  const { transport, buildSha, appName, getImpersonation } = useReportConfig();
  const meta = () => pageMetadata({ buildSha, getImpersonation });
  const [tab, setTab] = useState4("new");
  const [config, setConfig] = useState4(null);
  const [kind, setKind] = useState4("bug");
  const [severity, setSeverity] = useState4("annoying");
  const [summary, setSummary] = useState4("");
  const [expected, setExpected] = useState4("");
  const [steps, setSteps] = useState4("");
  const [shot, setShot] = useState4(null);
  const [annotateTarget, setAnnotateTarget] = useState4(null);
  const [capturing, setCapturing] = useState4(false);
  const [picked, setPicked] = useState4(null);
  const [voice, setVoice] = useState4(null);
  const [screen, setScreen] = useState4(null);
  const [files, setFiles] = useState4([]);
  const [submitting, setSubmitting] = useState4(false);
  const [progress, setProgress] = useState4("");
  const [done, setDone] = useState4(null);
  const [refreshKey, setRefreshKey] = useState4(0);
  const [lastError, setLastError] = useState4(null);
  const [failedUploads, setFailedUploads] = useState4([]);
  const [problem, setProblem] = useState4(null);
  const autoShotDone = useRef5(false);
  const copyRef = useRef5(null);
  const pickRef = useRef5(null);
  const refocusPick = useRef5(false);
  const pickAbort = useRef5(null);
  const locksBeforeOpen = useRef5(null);
  if (!open) locksBeforeOpen.current = null;
  else if (!locksBeforeOpen.current) locksBeforeOpen.current = scrollLockKeys();
  const noteError = (stage, e) => setLastError(errorRecord(stage, e));
  const summaryRef = useRef5(summary);
  summaryRef.current = summary;
  const voiceRun = useRef5(null);
  if (!voiceRun.current) voiceRun.current = createVoiceRun();
  const [voiceStatus, setVoiceStatus] = useState4({ transcribing: null, note: null });
  const voiceSession = {
    next: voiceRun.current.next,
    isCurrent: voiceRun.current.isCurrent,
    addTranscript: (id, text) => {
      const r = voiceRun.current.add(summaryRef.current, id, text);
      if (r.truncated) message2.warning(`The voice note was cut to fit the ${SUMMARY_MAX_LENGTH.toLocaleString("en-US")}-character limit of "What happened?".`);
      if (!r.added) return false;
      summaryRef.current = r.summary;
      setSummary(r.summary);
      return true;
    },
    status: voiceStatus,
    setStatus: setVoiceStatus
  };
  const screenRec = useMediaRecorder({ kind: "screen", maxMs: 2 * 60 * 1e3 });
  const closeAnnotator = () => {
    if ((annotateTarget == null ? void 0 : annotateTarget.kind) === "file") URL.revokeObjectURL(annotateTarget.url);
    setAnnotateTarget(null);
  };
  const annotateFile = (index, file) => setAnnotateTarget({ kind: "file", index, file, url: URL.createObjectURL(file) });
  const lastTargetRef = useRef5(null);
  if (annotateTarget) lastTargetRef.current = annotateTarget;
  const shownTarget = annotateTarget || lastTargetRef.current;
  useEffect6(() => () => {
    var _a2;
    if (((_a2 = lastTargetRef.current) == null ? void 0 : _a2.kind) === "file") URL.revokeObjectURL(lastTargetRef.current.url);
  }, []);
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
    let finished = false;
    (async () => {
      var _a2;
      try {
        setCapturing(true);
        await ((_a2 = document.fonts) == null ? void 0 : _a2.ready);
        await new Promise((r2) => setTimeout(r2, 350));
        await new Promise((r2) => requestAnimationFrame(() => requestAnimationFrame(r2)));
        if (!alive) return;
        const r = await captureQuick();
        if (alive && r.blob) setShot({ ...r, url: URL.createObjectURL(r.blob) });
      } catch (e) {
        console.warn("[feedback] quick capture failed:", e.message);
        if (alive) noteError("auto-screenshot", e);
      } finally {
        finished = true;
        if (alive) setCapturing(false);
      }
    })();
    return () => {
      alive = false;
      setCapturing(false);
      if (!finished) autoShotDone.current = false;
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
      message2.warning(screenRec.error);
      noteError("screen-recording", screenRec.error);
    }
  }, [screenRec.error]);
  const endPendingPick = () => {
    var _a2;
    return (_a2 = pickAbort.current) == null ? void 0 : _a2.abort();
  };
  const reset = useCallback3(() => {
    endPendingPick();
    setKind("bug");
    setSeverity("annoying");
    setSummary("");
    setExpected("");
    setSteps("");
    if (shot == null ? void 0 : shot.url) URL.revokeObjectURL(shot.url);
    setShot(null);
    setPicked(null);
    setVoice(null);
    setScreen(null);
    setFiles([]);
    setDone(null);
    setProgress("");
    setLastError(null);
    setFailedUploads([]);
    setProblem(null);
    voiceRun.current.clear();
    setVoiceStatus({ transcribing: null, note: null });
    autoShotDone.current = false;
  }, [shot]);
  const handleClose = () => {
    setProblem(null);
    onClose();
  };
  useEffect6(() => {
    if (open) return;
    voiceRun.current.clear();
    setVoiceStatus({ transcribing: null, note: null });
  }, [open]);
  const retakeExact = async () => {
    endPendingPick();
    setHidden(true);
    setCapturing(true);
    try {
      await new Promise((r2) => setTimeout(r2, 150));
      const r = await captureExact();
      if (shot == null ? void 0 : shot.url) URL.revokeObjectURL(shot.url);
      setShot({ ...r, url: URL.createObjectURL(r.blob) });
    } catch (e) {
      if ((e == null ? void 0 : e.name) !== "NotAllowedError") {
        message2.warning(e.message || "Screenshot cancelled.");
        noteError("exact-screenshot", e);
      }
    } finally {
      setCapturing(false);
      setHidden(false);
    }
  };
  const retakeQuick = async () => {
    endPendingPick();
    setHidden(true);
    setCapturing(true);
    try {
      await new Promise((r2) => setTimeout(r2, 120));
      const r = await captureQuick();
      if (shot == null ? void 0 : shot.url) URL.revokeObjectURL(shot.url);
      setShot({ ...r, url: URL.createObjectURL(r.blob) });
    } catch (e) {
      message2.warning(e.message || "Screenshot failed.");
      noteError("screenshot", e);
    } finally {
      setCapturing(false);
      setHidden(false);
    }
  };
  const pickElement = async () => {
    var _a2;
    (_a2 = pickAbort.current) == null ? void 0 : _a2.abort();
    const ctrl = new AbortController();
    pickAbort.current = ctrl;
    const { signal } = ctrl;
    let restoreLocks = null;
    let late = null;
    const applyShot = (next2) => {
      const url = URL.createObjectURL(next2.blob);
      setShot((prev) => {
        if (prev == null ? void 0 : prev.url) URL.revokeObjectURL(prev.url);
        return { ...next2, url };
      });
    };
    const fail = (e) => {
      message2.warning(e.message || "Screenshot failed.");
      noteError("element-pick", e);
    };
    setHidden(true);
    try {
      await new Promise((r) => setTimeout(r, 120));
      if (signal.aborted) return;
      const before = locksBeforeOpen.current || [];
      restoreLocks = suspendScrollLocks(scrollLockKeys().filter((k) => !before.includes(k)));
      const result = await startElementPick({ signal });
      if (!result || signal.aborted) return;
      const { description } = result;
      setPicked({ description });
      setCapturing(true);
      const res = await shotAfterPick({
        capture: captureQuick,
        outline: drawOutline,
        rect: description.rect,
        viewportWidth: window.innerWidth,
        signal
      });
      if (signal.aborted) return;
      if (res.error) throw res.error;
      if (res.produced) applyShot(res.shot);
      else late = res.late;
    } catch (e) {
      if (signal.aborted) return;
      fail(e);
    } finally {
      restoreLocks == null ? void 0 : restoreLocks();
      if (!late && pickAbort.current === ctrl) pickAbort.current = null;
      refocusPick.current = !signal.aborted;
      setCapturing(false);
      setHidden(false);
    }
    if (!late) return;
    const { shot: next, error } = await late;
    const current = pickAbort.current === ctrl && !signal.aborted;
    if (pickAbort.current === ctrl) pickAbort.current = null;
    if (!current) return;
    if (error) fail(error);
    else if (next) applyShot(next);
  };
  useEffect6(() => {
    var _a2;
    if (!open) (_a2 = pickAbort.current) == null ? void 0 : _a2.abort();
  }, [open]);
  useEffect6(() => () => {
    var _a2;
    return (_a2 = pickAbort.current) == null ? void 0 : _a2.abort();
  }, []);
  useEffect6(() => {
    var _a2;
    if (hidden || !refocusPick.current) return;
    refocusPick.current = false;
    (_a2 = pickRef.current) == null ? void 0 : _a2.focus();
  }, [hidden]);
  const startScreenRecording = async () => {
    setHidden(true);
    await screenRec.start();
  };
  const addFiles = (list) => {
    const incoming = Array.from(list || []).filter(Boolean);
    if (!incoming.length) return;
    const max = (config == null ? void 0 : config.maxAttachmentBytes) || 512 * 1024 * 1024;
    const ok = incoming.filter((f) => f.size <= max);
    if (ok.length < incoming.length) message2.warning("Some files were too large to attach.");
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
    if (!canSubmit) return;
    setSubmitting(true);
    setProgress("Creating the ticket\u2026");
    const warnings = [];
    const failed = [];
    try {
      const ctx = { ...meta(), ...snapshotContext() };
      const created = await transport.submitFeedback(feedbackPayload({
        kind,
        severity,
        summary,
        expected,
        steps,
        voice,
        picked,
        context: ctx,
        pageUrl: window.location.href,
        route: window.location.pathname
      }));
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
        form: { kind, severity, summary, expected, steps, shot, voice, screen, files, element: picked == null ? void 0 : picked.description }
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
      message2.info("Selected. Press Ctrl+C (Cmd+C on a Mac) to copy.");
    };
    if (!((_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText)) {
      fallback();
      return;
    }
    navigator.clipboard.writeText(problem.copyText).then(() => message2.success("Copied the report and diagnostics."), fallback);
  };
  const problemLink = /* @__PURE__ */ jsx5("button", { type: "button", className: "kf-link", onClick: openProblem, children: "Problem with this form?" });
  const transcriptionAvailable = Boolean((_a = config == null ? void 0 : config.transcription) == null ? void 0 : _a.available);
  const desktop = isDesktop();
  const includedPopover = /* @__PURE__ */ jsxs4("div", { className: "kf-context", style: { maxWidth: "min(420px, calc(100vw - 32px))" }, children: [
    /* @__PURE__ */ jsx5(Text3, { type: "secondary", style: { fontSize: 13 }, children: "Sent with the report so the developer can reproduce it. Nothing you type elsewhere, no passwords." }),
    /* @__PURE__ */ jsx5("pre", { children: JSON.stringify({
      page: typeof window !== "undefined" ? window.location.pathname : null,
      browser: (context == null ? void 0 : context.browser) ? `${context.browser.name} ${context.browser.version} \xB7 ${context.browser.os} ${context.browser.osVersion || ""}` : null,
      viewport: (context == null ? void 0 : context.viewport) ? `${context.viewport.width}\xD7${context.viewport.height} @${context.viewport.dpr}x` : null,
      build: context == null ? void 0 : context.buildSha,
      actingAs: (context == null ? void 0 : context.impersonating) || void 0,
      recentRoutes: ((context == null ? void 0 : context.routeHistory) || []).slice(-6).map((r) => r.path),
      recentErrors: ((context == null ? void 0 : context.errors) || []).slice(-8).map((e) => `${e.level}: ${e.message}`),
      element: picked ? pickSummary(picked.description) : void 0
    }, null, 2) })
  ] });
  const offer = pickOffer({ shot, picked, capturing, hidden });
  const pickButton = /* @__PURE__ */ jsx5(Button4, { ref: pickRef, size: "small", icon: /* @__PURE__ */ jsx5(AimOutlined, {}), onClick: pickElement, disabled: offer.disabled, children: offer.label });
  const pickedChip = offer.chip && /* @__PURE__ */ jsx5(Tooltip2, { title: picked.description.selector, children: /* @__PURE__ */ jsxs4("span", { className: "kf-file kf-pick-chip", children: [
    /* @__PURE__ */ jsx5("span", { className: "kf-pick-name", children: chipLabel(picked.description) }),
    /* @__PURE__ */ jsx5("button", { type: "button", onClick: () => {
      endPendingPick();
      setPicked(null);
    }, "aria-label": "Remove picked element", children: /* @__PURE__ */ jsx5(CloseOutlined2, {}) })
  ] }) });
  const form = done ? /* @__PURE__ */ jsxs4("div", { className: "kf-success", children: [
    /* @__PURE__ */ jsx5(CheckCircleFilled, { style: { fontSize: 40, color: "#22c55e" } }),
    /* @__PURE__ */ jsx5("div", { className: "key", children: done.ticketKey }),
    /* @__PURE__ */ jsxs4(Text3, { children: [
      "Thanks \u2014 your ",
      kind === "bug" ? "report" : kind,
      " is filed. You will be notified when it moves or gets a reply."
    ] }),
    done.warnings.map((w) => /* @__PURE__ */ jsx5(Alert2, { type: "warning", showIcon: true, message: w, style: { borderRadius: 8, textAlign: "left" } }, w)),
    done.warnings.length > 0 && problemLink,
    /* @__PURE__ */ jsxs4(Space2, { children: [
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
        onChange: (e) => {
          voiceRun.current.edit(e.target.value);
          setSummary(e.target.value);
        },
        placeholder: typeof PROMPTS[kind] === "function" ? PROMPTS[kind](appName) : PROMPTS[kind],
        autoSize: { minRows: 3, maxRows: 8 },
        maxLength: SUMMARY_MAX_LENGTH
      }
    ) }),
    /* @__PURE__ */ jsx5(VoicePanel, { open, value: voice, onChange: setVoice, session: voiceSession, transcriptionAvailable }),
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
          children: /* @__PURE__ */ jsxs4(Space2, { direction: "vertical", style: { width: "100%" }, size: 8, children: [
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
            /* @__PURE__ */ jsx5(Tooltip2, { title: "Draw on it", children: /* @__PURE__ */ jsx5(Button4, { size: "small", icon: /* @__PURE__ */ jsx5(EditOutlined, {}), onClick: () => setAnnotateTarget({ kind: "shot" }), children: "Annotate" }) }),
            desktop && supportsExactCapture() && /* @__PURE__ */ jsx5(Tooltip2, { title: "Retake with exact pixels (asks to share this tab)", children: /* @__PURE__ */ jsx5(Button4, { size: "small", icon: /* @__PURE__ */ jsx5(ReloadOutlined, {}), onClick: retakeExact, children: "Retake" }) }),
            /* @__PURE__ */ jsx5(Tooltip2, { title: "Remove", children: /* @__PURE__ */ jsx5(Button4, { size: "small", danger: true, icon: /* @__PURE__ */ jsx5(DeleteOutlined3, {}), onClick: () => {
              endPendingPick();
              URL.revokeObjectURL(shot.url);
              setShot(null);
            } }) })
          ] })
        ] }) : /* @__PURE__ */ jsxs4(Space2, { wrap: true, children: [
          /* @__PURE__ */ jsx5(Button4, { size: "small", icon: /* @__PURE__ */ jsx5(CameraOutlined, {}), loading: capturing, onClick: retakeQuick, children: "Take screenshot" }),
          desktop && supportsExactCapture() && /* @__PURE__ */ jsx5(Button4, { size: "small", onClick: retakeExact, loading: capturing, children: "Exact pixels\u2026" }),
          offer.placement === "actions" && pickButton
        ] }),
        offer.row && /* @__PURE__ */ jsxs4("div", { className: "kf-pick-row", children: [
          pickedChip,
          offer.placement === "row" && pickButton
        ] }),
        (shot == null ? void 0 : shot.annotated) && /* @__PURE__ */ jsx5(Text3, { type: "secondary", style: { fontSize: 11.5 }, children: "Annotated" })
      ] }),
      /* @__PURE__ */ jsxs4("div", { className: `kf-card${screen || files.length ? " filled" : ""}`, children: [
        /* @__PURE__ */ jsx5("div", { className: "kf-card-title", children: /* @__PURE__ */ jsxs4("span", { children: [
          /* @__PURE__ */ jsx5(PaperClipOutlined, {}),
          " Recording & files"
        ] }) }),
        /* @__PURE__ */ jsxs4(Space2, { wrap: true, children: [
          desktop && supportsExactCapture() && !screen && /* @__PURE__ */ jsx5(Button4, { size: "small", icon: /* @__PURE__ */ jsx5(VideoCameraOutlined, {}), loading: screenRec.status === "requesting", onClick: startScreenRecording, children: "Record screen" }),
          /* @__PURE__ */ jsx5(Upload, { multiple: true, showUploadList: false, beforeUpload: (f, list) => {
            if (!list.length || f === list[0]) addFiles(list.length ? list : [f]);
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
          files.map((f, i) => canAnnotate(f) ? /* @__PURE__ */ jsxs4("span", { className: "kf-file kf-file-image", children: [
            /* @__PURE__ */ jsx5(FileThumb, { file: f }),
            /* @__PURE__ */ jsx5("span", { className: "kf-file-name", title: f.name, children: f.name }),
            /* @__PURE__ */ jsxs4("button", { type: "button", className: "kf-file-annotate", onClick: () => annotateFile(i, f), "aria-label": `Annotate ${f.name}`, children: [
              /* @__PURE__ */ jsx5(EditOutlined, {}),
              " Annotate"
            ] }),
            /* @__PURE__ */ jsx5("button", { type: "button", onClick: () => setFiles((p) => p.filter((_, j) => j !== i)), "aria-label": `Remove ${f.name}`, children: /* @__PURE__ */ jsx5(CloseOutlined2, {}) })
          ] }, i) : /* @__PURE__ */ jsxs4("span", { className: "kf-file", children: [
            f.name,
            /* @__PURE__ */ jsx5("button", { type: "button", onClick: () => setFiles((p) => p.filter((_, j) => j !== i)), "aria-label": `Remove ${f.name}`, children: /* @__PURE__ */ jsx5(CloseOutlined2, {}) })
          ] }, i))
        ] }),
        /* @__PURE__ */ jsx5(Text3, { type: "secondary", style: { fontSize: 11.5 }, children: "Paste an image anywhere in this form to attach it." })
      ] })
    ] })
  ] });
  const footer = done ? null : /* @__PURE__ */ jsxs4("div", { className: "kf-footer", children: [
    (lastError == null ? void 0 : lastError.stage) === "submit" && !submitting && /* @__PURE__ */ jsx5(
      Alert2,
      {
        className: "kf-error",
        type: "error",
        showIcon: true,
        message: `Your report was not sent: ${lastError.message || "unknown error"}. What you wrote is still here, so you can try again.`,
        action: problemLink
      }
    ),
    /* @__PURE__ */ jsxs4("span", { className: "kf-included", children: [
      "We'll also include the page, your account, browser and recent errors.",
      " ",
      /* @__PURE__ */ jsx5(Popover, { rootClassName: "kf-pop", content: includedPopover, title: "What gets included", trigger: "click", placement: "topLeft", children: /* @__PURE__ */ jsx5("a", { children: "view" }) }),
      /* @__PURE__ */ jsx5("span", { className: "kf-sep", children: "\xB7" }),
      problemLink
    ] }),
    /* @__PURE__ */ jsxs4(Space2, { children: [
      progress && /* @__PURE__ */ jsxs4(Text3, { type: "secondary", style: { fontSize: 12 }, children: [
        /* @__PURE__ */ jsx5(LoadingOutlined2, {}),
        " ",
        progress
      ] }),
      /* @__PURE__ */ jsx5(Button4, { onClick: handleClose, disabled: submitting, children: "Cancel" }),
      /* @__PURE__ */ jsx5(Button4, { type: "primary", onClick: submit, disabled: !canSubmit, loading: submitting, children: "Send report" })
    ] })
  ] });
  const problemView = problem && /* @__PURE__ */ jsxs4(Fragment2, { children: [
    /* @__PURE__ */ jsx5("div", { className: "kf-body kf-problem", children: problem.status === "sent" ? /* @__PURE__ */ jsxs4("div", { className: "kf-success", children: [
      /* @__PURE__ */ jsx5(CheckCircleFilled, { style: { fontSize: 32, color: "#22c55e" } }),
      /* @__PURE__ */ jsxs4(Text3, { children: [
        "Thanks, the team will look at the form itself",
        problem.ticketKey ? ` (${problem.ticketKey})` : "",
        "."
      ] })
    ] }) : /* @__PURE__ */ jsxs4(Fragment2, { children: [
      /* @__PURE__ */ jsx5(Text3, { type: "secondary", children: "Something wrong with this report form itself? Tell us what happened. The details below are attached automatically." }),
      /* @__PURE__ */ jsx5(
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
      /* @__PURE__ */ jsx5(
        Collapse,
        {
          ghost: true,
          size: "small",
          items: [{
            key: "diag",
            label: /* @__PURE__ */ jsx5(Text3, { type: "secondary", style: { fontSize: 12.5 }, children: "Diagnostics we'll attach" }),
            children: /* @__PURE__ */ jsx5("div", { className: "kf-context", children: /* @__PURE__ */ jsx5("pre", { children: JSON.stringify(problem.diagnostics, null, 2) }) })
          }]
        }
      ),
      problem.status === "failed" && /* @__PURE__ */ jsxs4(Fragment2, { children: [
        /* @__PURE__ */ jsx5(
          Alert2,
          {
            type: "error",
            showIcon: true,
            message: `This could not be sent either (${problem.error}). Copy it and send it to the team another way.`,
            action: /* @__PURE__ */ jsx5(Button4, { size: "small", onClick: copyProblem, children: "Copy" })
          }
        ),
        /* @__PURE__ */ jsx5("textarea", { ref: copyRef, className: "kf-copy", readOnly: true, value: problem.copyText, "aria-label": "Report and diagnostics to copy" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs4("div", { className: "kf-footer", children: [
      /* @__PURE__ */ jsx5("span", {}),
      /* @__PURE__ */ jsxs4(Space2, { children: [
        /* @__PURE__ */ jsx5(Button4, { onClick: () => setProblem(null), disabled: problem.status === "sending", children: "Back to my report" }),
        problem.status !== "sent" && /* @__PURE__ */ jsx5(Button4, { type: "primary", onClick: sendProblem, loading: problem.status === "sending", children: problem.status === "failed" ? "Try again" : "Send" })
      ] })
    ] })
  ] });
  return /* @__PURE__ */ jsxs4(Fragment2, { children: [
    /* @__PURE__ */ jsxs4(
      Modal,
      {
        open,
        onCancel: handleClose,
        afterClose: reset,
        footer: null,
        width: 720,
        centered: true,
        destroyOnHidden: false,
        maskClosable: !submitting,
        className: `kf-modal${hidden ? " kf-hidden-mask" : ""}`,
        rootClassName: "kf-root",
        wrapClassName: `kids-feedback-modal-wrap${hidden ? " kf-hidden" : ""}`,
        styles: { mask: hidden ? { display: "none" } : void 0 },
        closable: false,
        zIndex: 1160,
        children: [
          /* @__PURE__ */ jsxs4("div", { className: "kf-head", children: [
            /* @__PURE__ */ jsx5("div", { children: /* @__PURE__ */ jsx5("h3", { children: problem ? "Problem with this form" : "Report a bug or share an idea" }) }),
            /* @__PURE__ */ jsxs4(Space2, { children: [
              !problem && /* @__PURE__ */ jsx5(
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
          problem ? problemView : tab === "new" ? /* @__PURE__ */ jsxs4(Fragment2, { children: [
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
        open: Boolean(annotateTarget) && (annotateTarget.kind === "file" || Boolean(shot)),
        onCancel: closeAnnotator,
        footer: null,
        width: 960,
        centered: true,
        destroyOnHidden: true,
        wrapClassName: "kids-feedback-annotator-wrap",
        rootClassName: "kf-root",
        title: (shownTarget == null ? void 0 : shownTarget.kind) === "file" ? "Annotate the image" : "Annotate the screenshot",
        maskClosable: false,
        zIndex: 1170,
        children: (shownTarget == null ? void 0 : shownTarget.kind) === "file" ? /* @__PURE__ */ jsx5(
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
        ) : shot && /* @__PURE__ */ jsx5(
          Annotator,
          {
            src: shot.url,
            onCancel: closeAnnotator,
            onDone: (blob) => {
              endPendingPick();
              URL.revokeObjectURL(shot.url);
              setShot({ ...shot, blob, url: URL.createObjectURL(blob), annotated: true });
              closeAnnotator();
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
var GAP = 22;
var PANELS = ".ant-drawer-content-wrapper, .ant-modal-wrap:not(.kids-feedback-modal-wrap):not(.kids-feedback-annotator-wrap) .ant-modal-content";
function useAvoidOverlays(ref) {
  const [pos, setPos] = useState5(null);
  useEffect7(() => {
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
  const [open, setOpen] = useState5(false);
  const [hidden, setHidden] = useState5(false);
  const [prefill, setPrefill] = useState5(null);
  const [mounted, setMounted] = useState5(false);
  const rootRef = useRef6(null);
  const pos = useAvoidOverlays(rootRef);
  useEffect7(() => {
    setMounted(true);
  }, []);
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
  const fab = !hideButton && /* @__PURE__ */ jsx6(
    "div",
    {
      ref: rootRef,
      className: "kids-feedback-root",
      style: pos || void 0,
      onPointerDown: stop,
      onMouseDown: stop,
      onMouseUp: stop,
      onClick: stop,
      children: /* @__PURE__ */ jsx6(Tooltip3, { title: "Report a bug or share an idea (Alt+Shift+F)", placement: "left", children: /* @__PURE__ */ jsxs5("button", { type: "button", className: "kids-feedback-fab", onClick: () => {
        setPrefill(null);
        setOpen(true);
      }, "aria-label": "Report a bug or share an idea", children: [
        /* @__PURE__ */ jsx6(MessageOutlined, {}),
        /* @__PURE__ */ jsx6("span", { className: "kids-feedback-fab-label", children: "Report" })
      ] }) })
    }
  );
  const ui = /* @__PURE__ */ jsxs5(Fragment3, { children: [
    fab && mounted ? createPortal(fab, document.body) : fab,
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
  REPORT_TOOL_KIND,
  REPORT_TOOL_PREFIX,
  ReportProvider,
  RouteRecorder,
  STATE_COLORS,
  STATE_LABELS,
  StatusIcon,
  StatusLabel,
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
};
//# sourceMappingURL=index.js.map