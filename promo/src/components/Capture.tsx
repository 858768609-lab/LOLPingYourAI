import React from 'react';
import { useCurrentFrame } from 'remotion';
import { FONT } from '../fonts';
import { clamp01, easeIn, outExpo, progress, smooth } from '../lib/anim';
import { C } from '../theme';
import type { Rect } from '../windows/PaperWindow';

interface SquareProps {
  rect: Rect;
  at: number;
  /** Frame it starts fading out. */
  outAt: number;
  label?: string;
  /** Dim everything outside the square. */
  dim?: boolean;
  scale?: number;
}

/** The capture square: dashed gold outline with marching ants, solid corners and a size label. */
export const CaptureSquare: React.FC<SquareProps> = ({ rect, at, outAt, label = '512 × 512', dim = true, scale = 1 }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const pin = progress(f, at, 16, outExpo);
  const pout = progress(f, outAt, 12, easeIn);
  const o = pin * (1 - pout);
  if (o <= 0) return null;
  const s = 0.86 + 0.14 * pin;
  const corner = 44 * scale;
  const cw = 5 * scale;
  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        opacity: o,
        transform: `scale(${s})`,
        pointerEvents: 'none',
      }}
    >
      {dim && <div style={{ position: 'absolute', inset: 0, boxShadow: `0 0 0 4000px rgba(3,8,16,${0.42 * o})` }} />}
      <svg width={rect.w} height={rect.h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <rect
          x={1.5}
          y={1.5}
          width={rect.w - 3}
          height={rect.h - 3}
          fill="none"
          stroke={C.gold}
          strokeWidth={3 * scale}
          strokeDasharray={`${14 * scale} ${9 * scale}`}
          strokeDashoffset={-f * 1.2}
          opacity={0.95}
        />
        {[
          [0, 0, 1, 1],
          [rect.w, 0, -1, 1],
          [0, rect.h, 1, -1],
          [rect.w, rect.h, -1, -1],
        ].map(([x, y, sx, sy], i) => (
          <path
            key={i}
            d={`M${x + (sx * cw) / 2} ${y + sy * corner} V${y + (sy * cw) / 2} H${x + sx * corner}`}
            stroke="#f3dca6"
            strokeWidth={cw}
            fill="none"
            strokeLinecap="square"
            style={{ filter: `drop-shadow(0 0 ${6 * scale}px ${C.gold})` }}
          />
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: -44 * scale,
          padding: `${4 * scale}px ${12 * scale}px`,
          borderRadius: 6 * scale,
          background: 'rgba(8,14,24,.85)',
          border: `1px solid ${C.goldLine}`,
          color: C.text,
          font: `600 ${18 * scale}px ${FONT.mono}`,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: C.gold }}>▣</span> {label}
      </div>
    </div>
  );
};

/** Camera-flash: a white burst inside `rect` and a faint full-frame lift. */
export const Flash: React.FC<{ rect: Rect; at: number }> = ({ rect, at }) => {
  const f = useCurrentFrame();
  const t = f - at;
  if (t < 0 || t > 12) return null;
  const o = t < 2 ? t / 2 : 1 - (t - 2) / 10;
  return (
    <>
      <div style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, background: '#fff', opacity: 0.85 * o }} />
      <div style={{ position: 'absolute', inset: -4000, background: '#fff', opacity: 0.12 * o }} />
    </>
  );
};

interface FlyProps {
  from: Rect;
  to: Rect;
  at: number;
  dur: number;
  /** Renders the captured content at desktop coordinates; it is clipped to `from`. */
  children: React.ReactNode;
  arc?: number;
}

/** The snapshot of the square flying into the teammate panel. Disappears once it lands (the panel shows it from then). */
export const FlyingSnapshot: React.FC<FlyProps> = ({ from, to, at, dur, children, arc = 80 }) => {
  const f = useCurrentFrame();
  if (f < at || f >= at + dur) return null;
  const p = smooth(clamp01((f - at) / dur));
  const x = from.x + (to.x - from.x) * p;
  const y = from.y + (to.y - from.y) * p - Math.sin(Math.PI * p) * arc;
  const w = from.w + (to.w - from.w) * p;
  const k = w / from.w;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: w,
        overflow: 'hidden',
        borderRadius: 10 * p,
        border: `2px solid ${C.gold}`,
        boxShadow: `0 ${20 + 20 * Math.sin(Math.PI * p)}px 60px rgba(0,0,0,.6), 0 0 30px rgba(200,170,110,.35)`,
        transform: `rotate(${Math.sin(Math.PI * p) * -4}deg)`,
      }}
    >
      <SnapshotContent from={from} k={k}>
        {children}
      </SnapshotContent>
    </div>
  );
};

/** Desktop content clipped to `from`, scaled by k. */
export const SnapshotContent: React.FC<{ from: Rect; k: number; children: React.ReactNode }> = ({ from, k, children }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: 1920,
      height: 1080,
      transformOrigin: '0 0',
      transform: `scale(${k}) translate(${-from.x}px, ${-from.y}px)`,
    }}
  >
    {children}
  </div>
);
