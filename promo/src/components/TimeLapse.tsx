import React from 'react';
import { Img, useCurrentFrame } from 'remotion';
import { texture } from '../data/pings';
import { FONT } from '../fonts';
import { clamp01, easeIn, easeInOut, outExpo, progress, rand } from '../lib/anim';
import { C } from '../theme';

interface TimeLapseProps {
  at: number;
  dur: number;
  x: number;
  y: number;
  label: string;
  labelFont: string;
  /** Minutes counted down. */
  minutes?: number;
}

const fmt = (s: number): string => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** A ward dial fast-forwarding 30:00 → 00:00 with speed lines and motion-blurred digits. */
export const TimeLapse: React.FC<TimeLapseProps> = ({ at, dur, x, y, label, labelFont, minutes = 30 }) => {
  const f = useCurrentFrame();
  const local = f - at;
  if (local < -8 || local > dur + 14) return null;
  const show = progress(f, at - 8, 10, outExpo) * (1 - progress(f, at + dur + 2, 12, easeIn));
  const p = easeInOut(clamp01(local / dur));
  const speed = Math.sin(Math.PI * clamp01(local / dur)); // 0 → 1 → 0
  const remaining = minutes * 60 * (1 - p);
  const R = 150;
  const circ = 2 * Math.PI * R;
  const hand = p * 360 * 30;
  const digits = fmt(Math.round(remaining));
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: show, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(3,8,16,.55)' }} />
      {/* horizontal streaks across the frame */}
      {Array.from({ length: 22 }, (_, i) => {
        const yy = rand(i + 3) * 1080;
        const len = 200 + rand(i + 9) * 500;
        const xx = ((rand(i + 5) * 2400 + local * (60 + rand(i) * 80)) % 2600) - 400;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: xx,
              top: yy,
              width: len,
              height: 2,
              borderRadius: 2,
              background: `linear-gradient(90deg, transparent, rgba(10,200,185,${0.35 * speed}), transparent)`,
            }}
          />
        );
      })}
      <svg width={760} height={760} viewBox="-380 -380 760 760" style={{ position: 'absolute', left: x - 380, top: y - 380, overflow: 'visible' }}>
        <defs>
          <radialGradient id="tl-bg" cx="0" cy="0" r={R + 30} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#13304a" />
            <stop offset="1" stopColor="#0a1626" />
          </radialGradient>
        </defs>
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i / 36) * Math.PI * 2 + p * 9;
          const r0 = R + 40 + rand(i) * 30;
          const r1 = r0 + 40 + 120 * speed * (0.5 + rand(i + 50));
          return (
            <line
              key={i}
              x1={Math.cos(a) * r0}
              y1={Math.sin(a) * r0}
              x2={Math.cos(a) * r1}
              y2={Math.sin(a) * r1}
              stroke={i % 3 === 0 ? C.gold : C.teal}
              strokeOpacity={0.15 + 0.5 * speed}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          );
        })}
        <circle r={R + 18} fill="url(#tl-bg)" stroke={C.goldLine} strokeWidth={1.5} />
        <circle r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={12} />
        <circle
          r={R}
          fill="none"
          stroke={C.teal}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * p}
          transform="rotate(-90)"
          style={{ filter: `drop-shadow(0 0 10px ${C.teal})` }}
        />
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const r0 = i % 5 === 0 ? R - 30 : R - 22;
          return (
            <line
              key={i}
              x1={Math.cos(a) * r0}
              y1={Math.sin(a) * r0}
              x2={Math.cos(a) * (R - 14)}
              y2={Math.sin(a) * (R - 14)}
              stroke="rgba(240,230,210,.25)"
              strokeWidth={i % 5 === 0 ? 2.5 : 1.2}
            />
          );
        })}
        {[0.5, 0.3, 0.15].map((o, k) => (
          <line
            key={k}
            x1={0}
            y1={0}
            x2={0}
            y2={-(R - 38)}
            stroke={C.gold}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={k === 0 ? 1 : o * speed}
            transform={`rotate(${hand - k * 14 * speed})`}
          />
        ))}
        <circle r={7} fill={C.gold} />
      </svg>
      <Img
        src={texture('need_vision')}
        style={{ position: 'absolute', left: x - 30, top: y - 106, width: 60, height: 60, filter: 'drop-shadow(0 0 10px #56d43c)' }}
      />
      <div style={{ position: 'absolute', left: x - 200, width: 400, top: y - 18, textAlign: 'center' }}>
        <div style={{ font: `700 20px ${labelFont}`, letterSpacing: 3, color: C.gold, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
        <div style={{ position: 'relative', font: `700 76px/1 ${FONT.mono}`, color: C.text, letterSpacing: 2 }}>
          {[-1, 1].map((d) => (
            <div
              key={d}
              style={{ position: 'absolute', left: 0, right: 0, top: d * 14 * speed, opacity: 0.25 * speed, filter: `blur(${3 * speed}px)` }}
            >
              {digits}
            </div>
          ))}
          <div style={{ position: 'relative', filter: `blur(${1.2 * speed}px)` }}>{digits}</div>
        </div>
      </div>
    </div>
  );
};
