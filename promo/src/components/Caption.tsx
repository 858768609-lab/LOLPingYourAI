import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { Lang } from '../copy';
import { bodyFont, displayFont } from '../fonts';
import { clamp01, easeIn, outExpo, progress } from '../lib/anim';
import { C } from '../theme';
import { ModGlyph } from './KeyHud';

/** Inline keycap for ⌥ / ⌃ inside running text. */
const InlineKey: React.FC<{ kind: 'option' | 'control' }> = ({ kind }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      verticalAlign: '-0.12em',
      height: '1.05em',
      minWidth: '1.15em',
      margin: '0 0.08em',
      padding: '0 0.12em',
      borderRadius: '0.2em',
      border: '2px solid rgba(200,170,110,.75)',
      background: 'linear-gradient(180deg, #22364b, #132233)',
      boxShadow: '0 3px 0 #08111b',
      boxSizing: 'border-box',
    }}
  >
    <ModGlyph kind={kind} size={30} color={C.text} stroke={2.6} />
  </span>
);

/** Splits text into animation tokens: words for English, single characters for Chinese; ⌥/⌃ become keycaps. */
function tokens(text: string, lang: Lang): React.ReactNode[] {
  const parts = lang === 'zh' ? [...text] : text.split(/(\s+)/);
  return parts.flatMap((p) => {
    if (!p.includes('⌥') && !p.includes('⌃')) return [p];
    return p
      .split(/([⌥⌃])/)
      .filter(Boolean)
      .map((q) => (q === '⌥' ? <InlineKey kind="option" /> : q === '⌃' ? <InlineKey kind="control" /> : q));
  });
}

interface CaptionProps {
  kicker?: string;
  text: string;
  /** Frames of the parent timeline. */
  from: number;
  to: number;
  lang: Lang;
  size?: number;
  style?: React.CSSProperties;
}

/** Lower-third caption: a gold kicker over one or two large lines that reveal word by word. */
export const Caption: React.FC<CaptionProps> = ({ kicker, text, from, to, lang, size = 52, style }) => {
  const f = useCurrentFrame();
  if (f < from || f > to) return null;
  const out = progress(f, to - 10, 10, easeIn);
  const toks = tokens(text, lang);
  const step = lang === 'zh' ? 0.9 : 2;
  let visibleIndex = 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        bottom: 70,
        maxWidth: 1240,
        opacity: 1 - out,
        transform: `translateY(${-14 * out}px)`,
        ...style,
      }}
    >
      {kicker && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, opacity: progress(f, from, 10) }}>
          <div style={{ width: 12, height: 12, transform: 'rotate(45deg)', background: C.gold, boxShadow: `0 0 12px ${C.gold}` }} />
          <div
            style={{
              font: `700 ${lang === 'zh' ? 24 : 22}px ${displayFont(lang)}`,
              letterSpacing: lang === 'zh' ? 6 : 5,
              textTransform: 'uppercase',
              color: C.gold,
            }}
          >
            {kicker}
          </div>
          <div
            style={{ height: 1.5, width: 140 * progress(f, from + 2, 18, outExpo), background: `linear-gradient(90deg, ${C.gold}, transparent)` }}
          />
        </div>
      )}
      <div
        style={{
          font: `${lang === 'zh' ? 700 : 600} ${size}px/1.22 ${bodyFont(lang)}`,
          color: C.text,
          letterSpacing: lang === 'zh' ? 1 : -0.4,
          textShadow: '0 2px 18px rgba(0,0,0,.65)',
          textWrap: 'balance',
        }}
      >
        {toks.map((tok, i) => {
          if (typeof tok === 'string' && /^\s+$/.test(tok)) return <span key={i}>{tok}</span>;
          const start = from + 3 + visibleIndex++ * step;
          const p = clamp01(progress(f, start, 12, outExpo));
          return (
            <span key={i} style={{ display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * 26}px)`, whiteSpace: 'pre' }}>
              {tok}
            </span>
          );
        })}
      </div>
    </div>
  );
};
