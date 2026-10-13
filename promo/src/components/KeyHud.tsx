import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C } from '../theme';
import { FONT } from '../fonts';
import { clamp01, easeIn, outBack, progress } from '../lib/anim';

export type ModKey = 'option' | 'control';

/** ⌥ / ⌃ drawn as strokes, so they look the same whatever fonts are installed. */
export const ModGlyph: React.FC<{ kind: ModKey; size?: number; color?: string; stroke?: number }> = ({
  kind,
  size = 28,
  color = C.text,
  stroke = 2.4,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', overflow: 'visible' }}>
    <path
      d={kind === 'option' ? 'M2 6 H8 L16 18 H22 M14 6 H22' : 'M4.5 14.5 L12 7 L19.5 14.5'}
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Keycap: React.FC<{ kind: ModKey; pressed: number; scale: number }> = ({ kind, pressed, scale }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14 * scale,
      height: 84 * scale,
      padding: `0 ${26 * scale}px`,
      borderRadius: 16 * scale,
      background: 'linear-gradient(180deg, #22364b 0%, #132233 100%)',
      border: `${1.5 * scale}px solid ${pressed > 0.5 ? C.teal : 'rgba(200,170,110,.6)'}`,
      boxShadow: `0 ${(7 - 4 * pressed) * scale}px 0 #08111b, 0 ${14 * scale}px ${30 * scale}px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.12), 0 0 ${24 * pressed * scale}px rgba(10,200,185,${0.45 * pressed})`,
      transform: `translateY(${4 * pressed * scale}px)`,
    }}
  >
    <ModGlyph kind={kind} size={34 * scale} color={pressed > 0.5 ? '#bff7f1' : C.text} stroke={2.6} />
    <span style={{ font: `600 ${28 * scale}px ${FONT.body}`, color: C.text, letterSpacing: 0.3 }}>{kind === 'option' ? 'Option' : 'Control'}</span>
  </div>
);

const Mouse: React.FC<{ held: number; scale: number }> = ({ held, scale }) => (
  <svg width={52 * scale} height={76 * scale} viewBox="0 0 52 76" style={{ display: 'block', overflow: 'visible' }}>
    <defs>
      <filter id="hud-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
    </defs>
    <rect x={2} y={2} width={48} height={72} rx={24} fill="#132233" stroke="rgba(240,230,210,.7)" strokeWidth={2.5} />
    <path d="M26 2 A24 24 0 0 0 2 26 V32 H26 Z" fill={C.teal} opacity={held} filter="url(#hud-glow)" />
    <path d="M26 2 A24 24 0 0 0 2 26 V32 H26 Z" fill={C.teal} opacity={held * 0.95} />
    <path d="M2 32 H50 M26 2 V32" stroke="rgba(240,230,210,.7)" strokeWidth={2.5} fill="none" />
  </svg>
);

interface KeyHudProps {
  kind: ModKey;
  /** Frames (parent timeline) the modifier goes down and up. */
  downAt: number;
  upAt: number;
  mouseDownAt: number;
  mouseUpAt: number;
  scale?: number;
  style?: React.CSSProperties;
}

/** A KeyCastr-style overlay: the modifier keycap plus a mouse with its left button held. */
export const KeyHud: React.FC<KeyHudProps> = ({ kind, downAt, upAt, mouseDownAt, mouseUpAt, scale = 1, style }) => {
  const f = useCurrentFrame();
  const show = progress(f, downAt - 8, 10, outBack) * (1 - progress(f, upAt + 8, 10, easeIn));
  if (show <= 0) return null;
  const pressed = clamp01((f - downAt + 1) / 2) * (1 - clamp01((f - upAt) / 2));
  const held = clamp01((f - mouseDownAt + 1) / 2) * (1 - clamp01((f - mouseUpAt) / 2));
  return (
    <div
      style={{
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        gap: 18 * scale,
        opacity: clamp01(show),
        transform: `translateY(${(1 - show) * 30 * scale}px) scale(${0.9 + 0.1 * show})`,
        transformOrigin: 'right bottom',
        ...style,
      }}
    >
      <Keycap kind={kind} pressed={pressed} scale={scale} />
      <span style={{ font: `600 ${30 * scale}px ${FONT.body}`, color: C.gold }}>+</span>
      <Mouse held={held} scale={scale} />
    </div>
  );
};
