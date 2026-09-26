/**
 * Screenshot annotator — rectangle, arrow, pen, blur and text on a canvas.
 * Hand-rolled: the marker libraries are watermarked or paid, and the tools a
 * bug reporter needs fit in one file.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Space, Tooltip } from 'antd';
import {
  BorderOutlined, ArrowRightOutlined, HighlightOutlined, EyeInvisibleOutlined,
  FontSizeOutlined, UndoOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons';

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#0f172a', '#ffffff'];
const TOOLS = [
  { key: 'rect', label: 'Box', icon: <BorderOutlined /> },
  { key: 'arrow', label: 'Arrow', icon: <ArrowRightOutlined /> },
  { key: 'pen', label: 'Draw', icon: <HighlightOutlined /> },
  { key: 'blur', label: 'Blur', icon: <EyeInvisibleOutlined /> },
  { key: 'text', label: 'Text', icon: <FontSizeOutlined /> },
];

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

export default function Annotator({ src, onDone, onCancel }) {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const blurRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState('rect');
  const [color, setColor] = useState(COLORS[0]);
  const [shapes, setShapes] = useState([]);
  const [draft, setDraft] = useState(null);
  const [textAt, setTextAt] = useState(null); // { x, y, cx, cy }
  const [textValue, setTextValue] = useState('');

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
    img.src = src;
  }, [src]);

  const lineScale = useMemo(() => (imgRef.current ? Math.max(1, imgRef.current.naturalWidth / 1400) : 1), [ready]);

  const render = useCallback(() => {
    const c = canvasRef.current;
    const img = imgRef.current;
    if (!c || !img) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    for (const s of shapes) drawShape(ctx, s, blurRef.current, lineScale);
    if (draft) drawShape(ctx, draft, blurRef.current, lineScale);
  }, [shapes, draft, lineScale]);

  useEffect(() => { if (ready) render(); }, [ready, render]);

  const toCanvas = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * c.width;
    const y = ((e.clientY - r.top) / r.height) * c.height;
    return { x, y, cx: e.clientX - r.left, cy: e.clientY - r.top };
  };

  const onPointerDown = (e) => {
    if (!ready || textAt) return;
    e.preventDefault();
    const p = toCanvas(e);
    if (tool === 'text') { setTextAt(p); setTextValue(''); return; }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (tool === 'pen') setDraft({ type: 'pen', color, points: [{ x: p.x, y: p.y }] });
    else setDraft({ type: tool, color, x1: p.x, y1: p.y, x2: p.x, y2: p.y });
  };
  const onPointerMove = (e) => {
    if (!draft) return;
    const p = toCanvas(e);
    setDraft((d) => (d.type === 'pen' ? { ...d, points: [...d.points, { x: p.x, y: p.y }] } : { ...d, x2: p.x, y2: p.y }));
  };
  const onPointerUp = () => {
    if (!draft) return;
    const tooSmall = draft.type !== 'pen' && Math.abs(draft.x2 - draft.x1) < 3 && Math.abs(draft.y2 - draft.y1) < 3;
    if (!tooSmall) setShapes((s) => [...s, draft]);
    setDraft(null);
  };

  const commitText = () => {
    if (textAt && textValue.trim()) setShapes((s) => [...s, { type: 'text', color, x: textAt.x, y: textAt.y, text: textValue.trim() }]);
    setTextAt(null);
    setTextValue('');
  };

  const finish = () => {
    setDraft(null);
    // Render without the draft, then export.
    requestAnimationFrame(() => {
      render();
      canvasRef.current.toBlob((blob) => onDone(blob), 'image/png');
    });
  };

  return (
    <div className="kf-annotator">
      <div className="kf-tools">
        {TOOLS.map((t) => (
          <button key={t.key} type="button" className={`kf-tool${tool === t.key ? ' active' : ''}`} onClick={() => setTool(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
        <span style={{ width: 8 }} />
        {COLORS.map((c) => (
          <Tooltip key={c} title={c}>
            <span className={`kf-swatch${color === c ? ' active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
          </Tooltip>
        ))}
        <span style={{ flex: 1 }} />
        <Button size="small" icon={<UndoOutlined />} disabled={!shapes.length} onClick={() => setShapes((s) => s.slice(0, -1))}>Undo</Button>
      </div>
      <div className="kf-stage" ref={stageRef}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        {textAt && (
          <div className="kf-text-input" style={{ left: textAt.cx, top: textAt.cy - 18 }}>
            <Input
              autoFocus
              size="small"
              value={textValue}
              placeholder="Type, then Enter"
              style={{ width: 200 }}
              onChange={(e) => setTextValue(e.target.value)}
              onPressEnter={commitText}
              onBlur={commitText}
              onKeyDown={(e) => { if (e.key === 'Escape') { setTextAt(null); setTextValue(''); } }}
            />
          </div>
        )}
      </div>
      <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
        <Button icon={<CloseOutlined />} onClick={onCancel}>Cancel</Button>
        <Button type="primary" icon={<CheckOutlined />} onClick={finish} disabled={!ready}>Use this screenshot</Button>
      </Space>
    </div>
  );
}
