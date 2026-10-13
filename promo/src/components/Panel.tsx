import React from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';
import { bodyFont, FONT } from '../fonts';
import type { Lang } from '../copy';
import { clamp01, outExpo, progress } from '../lib/anim';
import { C } from '../theme';
import type { Rect } from '../windows/PaperWindow';

export const PANEL: Rect = { x: 1230, y: 64, w: 620, h: 770 };
export const PANEL_HEADER = 72;
export const PANEL_PAD = 22;
export const TURN_H = 52;

/** Fades and lifts its children in at frame `at` (parent timeline). Renders nothing before. */
export const Appear: React.FC<{ at: number; children: React.ReactNode; dy?: number; dur?: number; style?: React.CSSProperties }> = ({
  at,
  children,
  dy = 14,
  dur = 12,
  style,
}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const p = progress(f, at, dur, outExpo);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * dy}px)`, ...style }}>{children}</div>;
};

/** Text that types itself out from frame `at` at `cps` characters per second, with a caret while typing. */
export const Stream: React.FC<{ text: string; at: number; cps?: number; caret?: boolean }> = ({ text, at, cps = 45, caret = true }) => {
  const f = useCurrentFrame();
  const chars = Array.from(text);
  const n = Math.max(0, Math.min(chars.length, Math.floor(((f - at) / 30) * cps)));
  const typing = f >= at && n < chars.length;
  return (
    <span>
      {chars.slice(0, n).join('')}
      {caret && typing && (
        <span style={{ display: 'inline-block', width: 3, height: '0.95em', verticalAlign: '-0.12em', marginLeft: 2, background: C.teal }} />
      )}
    </span>
  );
};

export type Status = 'working' | 'idle' | 'interrupted';

/** Soft top edge for a scrolled log: fully opaque at scroll 0, a 32 px fade once scrolled at least that far. */
const SCROLL_FADE = 32;
function scrollMask(scroll: number): string {
  const a = (1 - clamp01(scroll / SCROLL_FADE)).toFixed(3);
  const mid = (Number(a) + (1 - Number(a)) * 0.35).toFixed(3);
  return `linear-gradient(to bottom, rgba(0,0,0,${a}) 0px, rgba(0,0,0,${a}) 8px, rgba(0,0,0,${mid}) 20px, #000 ${SCROLL_FADE}px)`;
}

const STATUS_COLOR: Record<Status, string> = { working: C.green, idle: '#8a96a3', interrupted: C.red };

interface PanelProps {
  lang: Lang;
  title: string;
  status: Status;
  statusLabel: string;
  /** Frame the panel slides in from the right (omit: already docked). */
  enterAt?: number;
  rect?: Rect;
  children?: React.ReactNode;
  flat?: boolean;
  /** Scrolls the turn log up by this many px (newest turns stay in view). */
  scroll?: number;
  /** Fades the turn log (scene changes clear it). */
  bodyOpacity?: number;
}

/** The "AI Teammate · Codex" panel docked on the right of the desktop. */
export const TeammatePanel: React.FC<PanelProps> = ({
  lang,
  title,
  status,
  statusLabel,
  enterAt,
  rect = PANEL,
  children,
  flat,
  scroll = 0,
  bodyOpacity = 1,
}) => {
  const f = useCurrentFrame();
  const p = enterAt === undefined ? 1 : progress(f, enterAt, 20, outExpo);
  if (p <= 0) return null;
  const pulse = status === 'working' ? 0.55 + 0.45 * Math.abs(Math.sin((f / 30) * Math.PI * 1.2)) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        boxSizing: 'border-box',
        borderRadius: 14,
        background: flat ? C.panel : `linear-gradient(180deg, ${C.panel2} 0%, ${C.panel} 30%)`,
        border: `1px solid ${C.goldLine}`,
        boxShadow: flat ? '0 10px 30px rgba(0,0,0,.4)' : '0 30px 80px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.04)',
        // a short slide + fade: the panel never crosses the frame edge on its way in
        transform: `translateX(${(1 - p) * 56}px)`,
        opacity: clamp01(p * 1.15),
        overflow: 'hidden',
        color: C.text,
      }}
    >
      <div
        style={{
          height: PANEL_HEADER,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: `0 ${PANEL_PAD}px`,
          boxSizing: 'border-box',
          borderBottom: `1px solid ${C.goldLine}`,
          background: 'rgba(0,0,0,.18)',
        }}
      >
        <Img src={staticFile('icon.png')} style={{ width: 34, height: 34 }} />
        <div style={{ font: `600 25px ${bodyFont(lang)}`, letterSpacing: 0.2 }}>
          {title} <span style={{ color: C.gold }}>·</span> Codex
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '5px 12px 5px 10px',
            borderRadius: 999,
            background: `${STATUS_COLOR[status]}1f`,
            border: `1px solid ${STATUS_COLOR[status]}55`,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: STATUS_COLOR[status],
              boxShadow: `0 0 ${10 * pulse}px ${STATUS_COLOR[status]}`,
              opacity: pulse,
            }}
          />
          <span style={{ font: `600 18px ${bodyFont(lang)}`, color: STATUS_COLOR[status] }}>{statusLabel}</span>
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          height: rect.h - PANEL_HEADER - 2,
          overflow: 'hidden',
          opacity: bodyOpacity,
          // once the log scrolls, older turns fade out under the header instead of being cut off
          maskImage: scroll > 0 ? scrollMask(scroll) : undefined,
          WebkitMaskImage: scroll > 0 ? scrollMask(scroll) : undefined,
        }}
      >
        <div style={{ padding: PANEL_PAD, display: 'flex', flexDirection: 'column', gap: 16, transform: `translateY(${-scroll}px)` }}>{children}</div>
      </div>
    </div>
  );
};

/** A turn's header row: the signal's icon, its name, and who sent it. */
export const TurnHeader: React.FC<{ icon: string; title: string; meta?: string; lang: Lang; round?: boolean; accent?: string }> = ({
  icon,
  title,
  meta,
  lang,
  round,
  accent,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: TURN_H }}>
    <div
      style={{
        width: TURN_H,
        height: TURN_H,
        borderRadius: 10,
        background: 'rgba(255,255,255,.04)',
        border: `1px solid ${accent ?? C.goldLine}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Img src={icon} style={{ width: 42, height: 42, borderRadius: round ? '50%' : undefined }} />
    </div>
    <div style={{ font: `600 27px ${bodyFont(lang)}`, color: C.text }}>{title}</div>
    {meta && <div style={{ font: `500 19px ${bodyFont(lang)}`, color: C.textMuted, marginTop: 4 }}>{meta}</div>}
  </div>
);

/** A payload field as the app sends it: `key: value` in mono. */
export const Chip: React.FC<{ k: string; v: string; size?: number }> = ({ k, v, size = 17 }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: size * 2.15,
      padding: `0 ${size * 0.8}px`,
      borderRadius: 8,
      boxSizing: 'border-box',
      border: `1px solid ${C.goldLine}`,
      background: 'rgba(200,170,110,.06)',
      font: `500 ${size}px ${FONT.mono}`,
      whiteSpace: 'nowrap',
    }}
  >
    <span style={{ color: C.gold }}>{k}:</span>
    <span style={{ color: C.text, marginLeft: size * 0.55 }}>{v}</span>
  </div>
);

/** A tool call in the teammate's log. */
export const ToolLine: React.FC<{ name: string; arg: string }> = ({ name, arg }) => (
  <div style={{ font: `400 19px/27px ${FONT.mono}`, color: C.textDim, whiteSpace: 'nowrap' }}>
    <span style={{ color: C.teal }}>›</span> <span style={{ color: C.blue }}>{name.padEnd(6, ' ')}</span> {arg}
  </div>
);

/** A coloured status line (verified, interrupted, ward placed). */
export const StatusLine: React.FC<{ color: string; icon: React.ReactNode; text: string; lang: Lang }> = ({ color, icon, text, lang }) => (
  <div
    style={{
      display: 'inline-flex',
      alignSelf: 'flex-start',
      alignItems: 'center',
      gap: 10,
      padding: '7px 14px',
      borderRadius: 9,
      background: `${color}1c`,
      border: `1px solid ${color}66`,
      color,
      font: `600 21px ${bodyFont(lang)}`,
    }}
  >
    {icon}
    {text}
  </div>
);

/** The teammate's reply: a small agent mark, "Codex · reply", then the text. */
export const Reply: React.FC<{ lang: Lang; label: string; icon?: string; children: React.ReactNode }> = ({ lang, label, icon, children }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: '14px 16px',
      borderRadius: 12,
      background: 'rgba(31,169,224,.07)',
      border: '1px solid rgba(31,169,224,.25)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {icon && <Img src={icon} style={{ width: 34, height: 34 }} />}
      <span style={{ font: `600 19px ${bodyFont(lang)}`, color: C.blue, letterSpacing: 0.3 }}>Codex · {label}</span>
    </div>
    <div style={{ font: `500 ${lang === 'zh' ? 25 : 24}px/1.45 ${bodyFont(lang)}`, color: C.text }}>{children}</div>
  </div>
);

/** Small inline icons for status lines. */
export const Icons = {
  check: (c: string) => (
    <svg width={18} height={18} viewBox="0 0 18 18">
      <path d="M3 9.5 L7.2 13.5 L15 4.8" stroke={c} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  stop: (c: string) => (
    <svg width={18} height={18} viewBox="0 0 18 18">
      <rect x={2.5} y={2.5} width={13} height={13} rx={3} fill={c} />
    </svg>
  ),
  eye: (c: string) => (
    <svg width={20} height={18} viewBox="0 0 20 18">
      <path d="M1.5 9 C5 3, 15 3, 18.5 9 C15 15, 5 15, 1.5 9 Z" stroke={c} strokeWidth={2} fill="none" />
      <circle cx={10} cy={9} r={3} fill={c} />
    </svg>
  ),
};
