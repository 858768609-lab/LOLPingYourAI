import React from 'react';
import { Img, useCurrentFrame } from 'remotion';
import { clamp01, easeOut } from '../lib/anim';
import { WHEEL, polar, sector } from '../lib/geometry';
import { FONT } from '../fonts';

export interface WheelItem {
  key: string;
  icon: string;
}

interface WheelArtProps {
  /** Unique per wheel on screen: keeps gradient ids apart (the app uses the svg's id). */
  id: string;
  items: readonly WheelItem[];
  centerLabel: string;
  centerIcon: string;
  /** Emote wheel: round-clipped art that keeps its colours. */
  emote?: boolean;
  /** 0..1 hotness per slice (the app's .08–.1 s transitions). */
  heat: readonly number[];
}

const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * The wheel SVG from src/renderer/overlay/wheel.ts, as React (600×600, centred on 300,300). Slice icons and the hub are
 * HTML <Img> elements over the SVG so the renderer waits for them to load (SVG <image> would not delay a frame).
 */
export const WheelArt: React.FC<WheelArtProps> = ({ id, items, centerLabel, centerIcon, emote, heat }) => {
  const { innerR, outerR, extR, iconR, iconSize } = WHEEL;
  const g = `lp-${id}`;
  return (
    <div style={{ position: 'relative', width: 600, height: 600 }}>
      <svg viewBox="-300 -300 600 600" width={600} height={600} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <radialGradient id={`${g}-ext`} cx="0" cy="0" r={extR} gradientUnits="userSpaceOnUse">
            <stop offset={outerR / extR} stopColor="#5c6066" stopOpacity=".55" />
            <stop offset="1" stopColor="#5c6066" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${g}-ring`} cx="0" cy="0" r={outerR} gradientUnits="userSpaceOnUse">
            <stop offset={innerR / outerR} stopColor="#2a2d31" />
            <stop offset="1" stopColor="#4a4e54" />
          </radialGradient>
          <radialGradient id={`${g}-hot`} cx="0" cy="0" r={extR} gradientUnits="userSpaceOnUse">
            <stop offset={innerR / extR} stopColor="#8a8f96" />
            <stop offset={outerR / extR} stopColor="#9aa0a8" />
            <stop offset="1" stopColor="#9aa0a8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${g}-core`} cx="0" cy="-10" r={innerR} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2c5d60" />
            <stop offset="1" stopColor="#11292c" />
          </radialGradient>
        </defs>
        {SLOTS.map((i) => {
          const mid = -90 + i * 45;
          return i % 2 === 0 ? <path key={i} d={sector(outerR, extR, mid - 22.5, mid + 22.5)} fill={`url(#${g}-ext)`} /> : null;
        })}
        <circle r={(innerR + outerR) / 2} fill="none" stroke={`url(#${g}-ring)`} strokeWidth={outerR - innerR} opacity={0.92} />
        {SLOTS.map((i) => {
          const mid = -90 + i * 45;
          const reach = i % 2 === 0 ? extR : outerR;
          const [x0, y0] = polar(innerR, mid - 22.5);
          const [x1, y1] = polar(outerR, mid - 22.5);
          return (
            <React.Fragment key={i}>
              <path d={sector(innerR, reach, mid - 22.5, mid + 22.5)} fill={`url(#${g}-hot)`} fillOpacity={0.55 * (heat[i] ?? 0)} />
              <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#a08a5c" strokeOpacity={0.45} strokeWidth={1.2} />
            </React.Fragment>
          );
        })}
        <circle r={innerR + 4} fill="none" stroke="#1a1a1a" strokeWidth={6} opacity={0.6} />
        <circle r={innerR} fill={`url(#${g}-core)`} stroke="#c8aa6e" strokeWidth={3} />
        <circle r={innerR - 7} fill="none" stroke="#8a7448" strokeWidth={1} opacity={0.6} />
        <text x={0} y={6} textAnchor="middle" style={{ font: `600 15px ${FONT.body}`, letterSpacing: 1, fill: '#1fa9e0' }}>
          {centerLabel}
        </text>
        <text x={6} y={50} textAnchor="middle" style={{ font: `600 9px ${FONT.body}`, letterSpacing: 0.5, fill: '#6c7a7c' }}>
          BACK
        </text>
        <g opacity={0.55} transform="translate(-26,40)">
          <rect x={0} y={0} width={11} height={16} rx={5.5} fill="none" stroke="#6c7a7c" strokeWidth={1.3} />
          <path d="M5.5,0 V7 H11 V5.5 A5.5,5.5 0 0 0 5.5,0Z" fill="#6c7a7c" />
        </g>
      </svg>
      {SLOTS.map((i) => {
        const item = items[i];
        if (!item) return null;
        const h = heat[i] ?? 0;
        const [ix, iy] = polar(iconR, -90 + i * 45);
        const u = 1 - h;
        // cold: grayscale(1) sepia(.75) saturate(1.3) brightness(1.15); hot: none + scale(1.18)
        const filter = emote ? undefined : `grayscale(${u}) sepia(${0.75 * u}) saturate(${1 + 0.3 * u}) brightness(${1 + 0.15 * u})`;
        return (
          <Img
            key={i}
            src={item.icon}
            style={{
              position: 'absolute',
              left: 300 + ix - iconSize / 2,
              top: 300 + iy - iconSize / 2,
              width: iconSize,
              height: iconSize,
              transform: `scale(${1 + 0.18 * h})`,
              filter,
              borderRadius: emote ? '50%' : undefined,
            }}
          />
        );
      })}
      <Img src={centerIcon} style={{ position: 'absolute', left: 280, top: 242, width: 40, height: 40, borderRadius: emote ? '50%' : undefined }} />
    </div>
  );
};

interface WheelProps extends Omit<WheelArtProps, 'heat'> {
  x: number;
  y: number;
  openAt: number;
  releaseAt: number;
  /** Hot slice at a frame of the parent timeline. */
  hot: (f: number) => number;
  scale?: number;
}

/** Heat ramps over 3 frames on and off, like the app's 0.08–0.1 s CSS transitions. */
function heatAt(hot: (f: number) => number, f: number): number[] {
  const heat = SLOTS.map(() => 0);
  for (let k = 0; k < 3; k++) {
    const h = hot(f - k);
    if (h >= 0) heat[h] += 1 / 3;
  }
  return heat;
}

/** The wheel opening at (x, y) on `openAt` and closing on `releaseAt` (opacity + scale .85 → 1 over .12 s). */
export const Wheel: React.FC<WheelProps> = ({ x, y, openAt, releaseAt, hot, scale = 1, ...art }) => {
  const f = useCurrentFrame();
  const DUR = 4; // .12 s at 30 fps
  if (f < openAt || f > releaseAt + DUR) return null;
  const p = f < releaseAt ? easeOut(clamp01((f - openAt + 1) / DUR)) : 1 - easeOut(clamp01((f - releaseAt + 1) / DUR));
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 300,
        top: y - 300,
        width: 600,
        height: 600,
        opacity: p,
        transform: `scale(${(0.85 + 0.15 * p) * scale})`,
        transformOrigin: '300px 300px',
        pointerEvents: 'none',
      }}
    >
      <WheelArt {...art} heat={heatAt(hot, f)} />
    </div>
  );
};
