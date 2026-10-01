/**
 * Image annotator — rectangle, arrow, pen, blur and text on a canvas; Select moves, edits or deletes a mark.
 * Hand-rolled: the marker libraries are watermarked or paid, and the tools a
 * bug reporter needs fit in one file.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Space, Tooltip, message } from 'antd';
import {
  BorderOutlined, ArrowRightOutlined, HighlightOutlined, EyeInvisibleOutlined,
  FontSizeOutlined, UndoOutlined, CheckOutlined, CloseOutlined, DragOutlined,
  ZoomInOutlined, ZoomOutOutlined, SelectOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { clampZoom, maxZoomFor, stepZoom, clientToImage, imageCoordAt, scrollToAnchor, heldAnchor, textBoxRect, spaceActivates, withPendingText, takeOnce, exportErrorText, shapeBox, hitShape, moveShape } from './annotatorMath.js';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#0f172a', '#ffffff'];
const TOOLS = [
  { key: 'select', label: 'Select', icon: <SelectOutlined /> },
  { key: 'rect', label: 'Box', icon: <BorderOutlined /> },
  { key: 'arrow', label: 'Arrow', icon: <ArrowRightOutlined /> },
  { key: 'pen', label: 'Draw', icon: <HighlightOutlined /> },
  { key: 'blur', label: 'Blur', icon: <EyeInvisibleOutlined /> },
  { key: 'text', label: 'Text', icon: <FontSizeOutlined /> },
  { key: 'move', label: 'Pan', icon: <DragOutlined /> },
];
const isTyping = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

function drawShape(ctx, s, blurred, lineScale) {
  ctx.save();
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = 3 * lineScale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (s.type === 'rect') {
    ctx.strokeRect(Math.min(s.x1, s.x2), Math.min(s.y1, s.y2), Math.abs(s.x2 - s.x1), Math.abs(s.y2 - s.y1));
  } else if (s.type === 'arrow') {
    const head = 14 * lineScale;
    const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x2, s.y2);
    ctx.lineTo(s.x2 - head * Math.cos(ang - Math.PI / 6), s.y2 - head * Math.sin(ang - Math.PI / 6));
    ctx.lineTo(s.x2 - head * Math.cos(ang + Math.PI / 6), s.y2 - head * Math.sin(ang + Math.PI / 6));
    ctx.closePath(); ctx.fill();
  } else if (s.type === 'pen') {
    ctx.beginPath();
    s.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  } else if (s.type === 'blur' && blurred) {
    const x = Math.min(s.x1, s.x2), y = Math.min(s.y1, s.y2);
    const w = Math.abs(s.x2 - s.x1), h = Math.abs(s.y2 - s.y1);
    if (w > 2 && h > 2) ctx.drawImage(blurred, x, y, w, h, x, y, w, h);
  } else if (s.type === 'text') {
    const size = Math.round(18 * lineScale);
    ctx.font = `600 ${size}px Inter, sans-serif`;
    ctx.lineWidth = 4 * lineScale;
    ctx.strokeStyle = s.color === '#ffffff' ? '#0f172a' : 'rgba(255,255,255,0.9)';
    ctx.strokeText(s.text, s.x, s.y);
    ctx.fillText(s.text, s.x, s.y);
  }
  ctx.restore();
}

export default function Annotator({ src, onDone, onCancel, doneLabel = 'Use this screenshot', subject = 'Screenshot' }) {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const wrapRef = useRef(null);
  const imgRef = useRef(null);
  const blurRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false); // HEIC, a corrupt paste…
  const [tool, setTool] = useState('rect');
  const [color, setColor] = useState(COLORS[0]);
  const [shapes, setShapes] = useState([]);
  const [selected, setSelected] = useState(null); // index into shapes (Select tool)
  const dragRef = useRef(null); // { i, x, y, orig } while a mark is being moved
  const [draft, setDraft] = useState(null);
  const [textAt, setTextAt] = useState(null); // { x, y, cx, cy }
  const [textValue, setTextValue] = useState('');
  const [exporting, setExporting] = useState(false);
  // zoom multiplies the fit scale (1 = Fit); the backing store always stays at natural size.
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(1);
  const [panReady, setPanReady] = useState(false); // Space held
  const [panning, setPanning] = useState(false);
  const panRef = useRef(null); // { x, y, sl, st } while a pan drag is in progress
  const anchorRef = useRef(null); // { px, py, ix, iy } — keep image point ix/iy (natural px) under client point px/py
  const lastAnchorRef = useRef(null); // the last anchor plus the scroll it produced { px, py, ix, iy, sl, st } — see heldAnchor
  const zoomRef = useRef(1);
  const keysRef = useRef(null);
  const tabFocusRef = useRef(null); // element focused by Tab, the only one Space presses
  const draftRef = useRef(null);
  draftRef.current = draft;
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;
  // Commit paths (Enter, blur, zoom, pan, finish) can fire in one tick; the first to take this wins.
  const textAtRef = useRef(textAt);
  textAtRef.current = textAt;

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const c = canvasRef.current;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      // A pre-blurred copy so blur regions are a cheap drawImage.
      const b = document.createElement('canvas');
      b.width = img.naturalWidth; b.height = img.naturalHeight;
      const bctx = b.getContext('2d');
      bctx.filter = `blur(${Math.max(8, Math.round(img.naturalWidth / 120))}px)`;
      bctx.drawImage(img, 0, 0);
      blurRef.current = b;
      setReady(true);
    };
    img.onerror = () => setFailed(true);
    img.src = src;
  }, [src]);

  const lineScale = useMemo(() => (imgRef.current ? Math.max(1, imgRef.current.naturalWidth / 1400) : 1), [ready]);
  const textSize = Math.round(18 * lineScale);
  const textWidth = useCallback((t) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return 0;
    ctx.save(); ctx.font = `600 ${textSize}px Inter, sans-serif`;
    const w = ctx.measureText(t.text).width;
    ctx.restore();
    return w;
  }, [textSize]);
  const sel = selected != null ? shapes[selected] : null;

  const render = useCallback(() => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    for (const s of shapes) drawShape(ctx, s, blurRef.current, lineScale);
    if (draft) drawShape(ctx, draft, blurRef.current, lineScale);
    // The selection outline is screen-only: finish() redraws without it before exporting.
    if (sel) {
      const b = shapeBox(sel, textWidth, textSize), pad = 6 * lineScale;
      ctx.save();
      ctx.setLineDash([6 * lineScale, 4 * lineScale]);
      ctx.lineWidth = 1.5 * lineScale;
      ctx.strokeStyle = '#6366f1';
      ctx.strokeRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
      ctx.restore();
    }
  }, [shapes, draft, lineScale, sel, textWidth, textSize]);

  useEffect(() => { if (ready) render(); }, [ready, render]);

  // Fit = the whole image inside the stage, never enlarged (the old max-width/max-height behaviour).
  useEffect(() => {
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!ready || !stage || !img) return undefined;
    // offsetWidth/Height include scrollbars, so the fit doesn't shift when zooming shows them.
    const measure = () => setFit(Math.min(1, stage.offsetWidth / img.naturalWidth, stage.offsetHeight / img.naturalHeight));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [ready]);

  const natW = imgRef.current?.naturalWidth || 0;
  const natH = imgRef.current?.naturalHeight || 0;
  const scale = fit * zoom; // display px per image px
  const maxZoom = maxZoomFor(fit);
  const dispW = Math.floor(natW * scale);
  const dispH = Math.floor(natH * scale);
  const textBox = textAt && textBoxRect(textAt.cx, textAt.cy, dispW, dispH);

  // After the new size is committed, scroll so the anchored image point is back under the pointer.
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
  }, [zoom, fit]);

  const commitText = () => {
    const at = takeOnce(textAtRef);
    if (!at) return;
    setShapes((s) => withPendingText(s, at, textValue, color));
    setTextAt(null);
    setTextValue('');
  };

  // Zoom to `next` (clamped), keeping the image point under client (px, py) fixed; default anchor is the visible centre.
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
    anchorRef.current = held
      ? { px, py, ...held }
      : { px, py, ix: imageCoordAt(px, r.left, r.width, natW), iy: imageCoordAt(py, r.top, r.height, natH) };
    zoomRef.current = z;
    setZoom(z);
  };
  const zoomIn = () => zoomTo(stepZoom(zoomRef.current, fit, 1));
  const zoomOut = () => zoomTo(stepZoom(zoomRef.current, fit, -1));
  const zoomFit = () => zoomTo(1);
  const deleteSelected = () => {
    if (selected == null) return;
    setShapes((all) => all.filter((_, j) => j !== selected));
    setSelected(null);
  };
  keysRef.current = { zoomIn, zoomOut, zoomFit, zoomTo, deleteSelected };

  // Ctrl/⌘+wheel and trackpad pinch (wheel + ctrlKey). Native and non-passive so the page itself doesn't zoom.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      keysRef.current.zoomTo(zoomRef.current * Math.exp(-dy * 0.01), e.clientX, e.clientY);
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, []);

  // + / − / 0 zoom; Space held turns any drag into a pan. Ignored while typing.
  useEffect(() => {
    let tabbing = false;
    const onKeyDown = (e) => {
      tabbing = e.key === 'Tab';
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === ' ') {
        if (spaceActivates(e.target, tabFocusRef.current)) return;
        e.preventDefault();
        if (!e.repeat) setPanReady(true);
      } else if (e.key === '+' || e.key === '=') { e.preventDefault(); keysRef.current.zoomIn(); }
      else if (e.key === '-') { e.preventDefault(); keysRef.current.zoomOut(); }
      else if (e.key === '0') { e.preventDefault(); keysRef.current.zoomFit(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); keysRef.current.deleteSelected(); }
    };
    const onKeyUp = (e) => {
      if (e.key !== ' ' || isTyping(e.target) || spaceActivates(e.target, tabFocusRef.current)) return;
      e.preventDefault();
      setPanReady(false);
    };
    const onFocusIn = (e) => { tabFocusRef.current = tabbing ? e.target : null; };
    // A click ends keyboard focus even where focus doesn't move (the canvas prevents default), so Space pans again.
    const onPointerDown = () => { tabbing = false; tabFocusRef.current = null; };
    const onBlur = () => setPanReady(false);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Clamped to the image, so a drag that leaves the stage ends on the image edge.
  const toCanvas = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const { x, y } = clientToImage(e.clientX, e.clientY, r, c.width, c.height);
    return { x, y, cx: e.clientX - r.left, cy: e.clientY - r.top };
  };

  // Pointer handlers live on the stage (and capture to it) so pans work over the dark margin too.
  const onPointerDown = (e) => {
    if (!ready || e.target.closest?.('.kf-text-input')) return;
    const stage = stageRef.current;
    if (((tool === 'move' || panReady) && e.button === 0) || e.button === 1) {
      e.preventDefault();
      if (textAt) commitText();
      panRef.current = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop };
      setPanning(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }
    if (textAt || e.button !== 0 || e.target !== canvasRef.current) return;
    e.preventDefault();
    const p = toCanvas(e);
    if (tool === 'select') {
      const i = hitShape(shapes, p, 8 / scale, textWidth, textSize);
      setSelected(i >= 0 ? i : null);
      if (i >= 0) {
        dragRef.current = { i, x: p.x, y: p.y, orig: shapes[i] };
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      return;
    }
    if (tool === 'text') { setTextAt(p); setTextValue(''); return; }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (tool === 'pen') setDraft({ type: 'pen', color, points: [{ x: p.x, y: p.y }] });
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
      const p = toCanvas(e);
      setShapes((all) => all.map((x, j) => (j === drag.i ? moveShape(drag.orig, p.x - drag.x, p.y - drag.y) : x)));
      return;
    }
    if (!draft) return;
    const p = toCanvas(e);
    setDraft((d) => (d.type === 'pen' ? { ...d, points: [...d.points, { x: p.x, y: p.y }] } : { ...d, x2: p.x, y2: p.y }));
  };
  // Also bound to pointercancel and lostpointercapture, which follows pointerup — draftRef stops a double commit.
  const onPointerUp = () => {
    if (panRef.current) { panRef.current = null; setPanning(false); return; }
    if (dragRef.current) { dragRef.current = null; return; }
    const d = draftRef.current;
    if (!d) return;
    draftRef.current = null;
    const tooSmall = d.type !== 'pen' && Math.abs(d.x2 - d.x1) < 3 && Math.abs(d.y2 - d.y1) < 3;
    if (!tooSmall) setShapes((s) => [...s, d]);
    setDraft(null);
  };

  // Double-click a text mark (Select tool) to edit it in place; committing puts it back.
  const onDoubleClick = (e) => {
    if (tool !== 'select' || !ready || textAt) return;
    const p = toCanvas(e);
    const i = hitShape(shapes, p, 8 / scale, textWidth, textSize);
    const t = shapes[i];
    if (!t || t.type !== 'text') return;
    setShapes((all) => all.filter((_, j) => j !== i));
    setSelected(null);
    setColor(t.color);
    setTextAt({ x: t.x, y: t.y, cx: t.x * scale, cy: t.y * scale });
    setTextValue(t.text);
  };

  // Draws the committed shapes (and any open text) synchronously, without the draft, then exports at natural size.
  const finish = () => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (exporting || !c || !img) return;
    const all = withPendingText(shapesRef.current, takeOnce(textAtRef), textValue, color);
    setTextAt(null);
    setTextValue('');
    setShapes(all);
    setSelected(null);
    draftRef.current = null;
    setDraft(null);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    for (const s of all) drawShape(ctx, s, blurRef.current, lineScale);
    setExporting(true);
    c.toBlob((blob) => {
      if (blob) { onDone(blob); return; }
      setExporting(false);
      message.error(exportErrorText(subject));
    }, 'image/png');
  };

  return (
    <div className="kf-annotator">
      <div className="kf-tools" role="toolbar" aria-label="Markup tools">
        <span className="kf-group">
          {TOOLS.map((t) => (
            <Tooltip key={t.key} title={t.label}>
              <button type="button" className={`kf-tool${tool === t.key ? ' active' : ''}`} aria-label={t.label} aria-pressed={tool === t.key} disabled={t.key === 'move' && !ready} onClick={() => { setTool(t.key); setSelected(null); }}>
                {t.icon}
              </button>
            </Tooltip>
          ))}
        </span>
        <span className="kf-group kf-colors" role="group" aria-label="Color">
          {COLORS.map((c) => (
            <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={color === c} className={`kf-swatch${color === c ? ' active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </span>
        <span style={{ flex: 1 }} />
        <span className="kf-group">
          {tool === 'select' && (
            <Tooltip title="Delete selected (Del)">
              <button type="button" className="kf-tool" aria-label="Delete selected" disabled={!sel} onClick={deleteSelected}><DeleteOutlined /></button>
            </Tooltip>
          )}
          <Tooltip title="Undo">
            <button type="button" className="kf-tool" aria-label="Undo" disabled={!shapes.length} onClick={() => { setShapes((s) => s.slice(0, -1)); setSelected(null); }}><UndoOutlined /></button>
          </Tooltip>
        </span>
        <span className="kf-zoom" role="group" aria-label="Zoom">
          <Tooltip title="Zoom out (−)">
            <button type="button" aria-label="Zoom out" disabled={!ready || zoom <= 1} onClick={zoomOut}><ZoomOutOutlined /></button>
          </Tooltip>
          <span className="kf-zoom-pct" aria-live="polite">{ready ? `${Math.round(scale * 100)}%` : '—'}</span>
          <Tooltip title="Zoom in (+)">
            <button type="button" aria-label="Zoom in" disabled={!ready || zoom >= maxZoom} onClick={zoomIn}><ZoomInOutlined /></button>
          </Tooltip>
          <Tooltip title="Fit to window (0)">
            <button type="button" aria-label="Fit to window" disabled={!ready || zoom === 1} onClick={zoomFit}>Fit</button>
          </Tooltip>
        </span>
      </div>
      <div
        className={`kf-stage${panReady || tool === 'move' ? ' kf-pan-ready' : ''}${panning ? ' kf-panning' : ''}${tool === 'select' ? ' kf-select' : ''}`}
        ref={stageRef}
        tabIndex={0}
        aria-label="Image area. Use the arrow keys to scroll when zoomed in."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
        onDoubleClick={onDoubleClick}
        onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
      >
        <div className="kf-canvas-wrap" ref={wrapRef} style={failed ? { display: 'none' } : undefined}>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`${subject} you are annotating`}
            style={ready ? { width: dispW, height: dispH } : undefined}
          />
          {textAt && (
            <div className="kf-text-input" style={{ left: textBox.left, top: textBox.top }}>
              <Input
                autoFocus
                size="small"
                value={textValue}
                placeholder="Type, then Enter"
                style={{ width: textBox.width }}
                onChange={(e) => setTextValue(e.target.value)}
                onPressEnter={commitText}
                onBlur={commitText}
                // Esc cancels only the text box — without stopPropagation the Modal closes and drops every mark.
                onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); textAtRef.current = null; setTextAt(null); setTextValue(''); } }}
              />
            </div>
          )}
        </div>
        {failed && <div className="kf-stage-error">This image can't be opened for markup. It will still be attached as it is.</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {tool === 'select' && <span className="kf-zoom-hint">Drag a mark to move it. Double-click text to edit it. Delete removes the selected mark.</span>}
        {zoom > 1 && <span className="kf-zoom-hint">Hold Space and drag to move around. Pinch or Ctrl + scroll to zoom.</span>}
        <span style={{ flex: 1 }} />
        <Space>
          <Button icon={<CloseOutlined />} onClick={onCancel}>Cancel</Button>
          <Button type="primary" icon={<CheckOutlined />} onClick={finish} disabled={!ready || exporting} loading={exporting}>{doneLabel}</Button>
        </Space>
      </div>
    </div>
  );
}
