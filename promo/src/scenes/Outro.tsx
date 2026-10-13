import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { Backdrop, Particles, Vignette } from '../components/Backdrop';
import { WheelArt } from '../components/Wheel';
import { COPY, type Lang } from '../copy';
import { HUB_TEXTURE, texture } from '../data/pings';
import { bodyFont, FONT } from '../fonts';
import { outBack, outExpo, progress } from '../lib/anim';
import { C } from '../theme';
import { PING_WHEEL_ITEMS } from './shared';

export const OUTRO_FRAMES = 165;
export const REPO_URL = 'github.com/ChristianYang37/LOLPingYourAI';

const In: React.FC<{ at: number; children: React.ReactNode; dy?: number; style?: React.CSSProperties }> = ({ at, children, dy = 24, style }) => {
  const f = useCurrentFrame();
  const p = progress(f, at, 20, outExpo);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * dy}px)`, filter: `blur(${(1 - p) * 4}px)`, ...style }}>{children}</div>;
};

/** Gold-gradient "LOLPingYourAI" wordmark in Cinzel. */
export const Wordmark: React.FC<{ size: number }> = ({ size }) => (
  <span
    style={{
      font: `700 ${size}px ${FONT.display}`,
      letterSpacing: size * 0.02,
      background: `linear-gradient(180deg, #fbf4e2 10%, ${C.gold} 95%)`,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      filter: 'drop-shadow(0 6px 30px rgba(0,0,0,.6))',
    }}
  >
    LOLPingYourAI
  </span>
);

export const AppIcon: React.FC<{ size: number; glow?: number }> = ({ size, glow = 1 }) => (
  <div style={{ position: 'relative', width: size, height: size }}>
    <div
      style={{
        position: 'absolute',
        inset: -size * 0.6,
        borderRadius: '50%',
        background: `radial-gradient(closest-side, rgba(31,169,224,${0.45 * glow}), rgba(10,200,185,${0.12 * glow}) 55%, transparent)`,
      }}
    />
    <Img
      src={staticFile('icon.png')}
      style={{ position: 'relative', width: size, height: size, filter: 'drop-shadow(0 10px 30px rgba(0,0,0,.5))' }}
    />
  </div>
);

/** 0:40–end — icon, name, tagline, platform chips, repo URL and the attribution footer. */
export const Outro: React.FC<{ lang: Lang }> = ({ lang }) => {
  const f = useCurrentFrame();
  const o = COPY[lang].outro;
  const icon = progress(f, 0, 22, outBack);
  const glow = 0.75 + 0.25 * Math.sin((f / 30) * Math.PI * 0.8);
  const line = progress(f, 20, 24, outExpo);
  return (
    <AbsoluteFill>
      <Backdrop glow="rgba(31,169,224,.20)" />
      <AbsoluteFill style={{ opacity: 0.08, transform: `rotate(${f * 0.05}deg) scale(1.9)`, transformOrigin: '960px 540px' }}>
        <div style={{ position: 'absolute', left: 660, top: 240 }}>
          <WheelArt id="outro" items={PING_WHEEL_ITEMS} centerLabel="PING" centerIcon={texture(HUB_TEXTURE)} heat={[]} />
        </div>
      </AbsoluteFill>
      <Particles seed={7} />
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <div style={{ marginTop: 172, opacity: Math.min(1, icon * 1.5), transform: `scale(${0.6 + 0.4 * icon})` }}>
          <AppIcon size={190} glow={glow} />
        </div>
        <In at={8} style={{ marginTop: 34 }}>
          <Wordmark size={108} />
        </In>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, opacity: line }}>
          <div style={{ width: 220 * line, height: 1.5, background: `linear-gradient(90deg, transparent, ${C.gold})` }} />
          <div style={{ width: 11, height: 11, transform: 'rotate(45deg)', background: C.gold, boxShadow: `0 0 12px ${C.gold}` }} />
          <div style={{ width: 220 * line, height: 1.5, background: `linear-gradient(270deg, transparent, ${C.gold})` }} />
        </div>
        <In at={18} style={{ marginTop: 26 }}>
          <div
            style={{
              font: `${lang === 'zh' ? 700 : 500} ${lang === 'zh' ? 42 : 40}px ${bodyFont(lang)}`,
              color: C.text,
              letterSpacing: lang === 'zh' ? 2 : -0.2,
            }}
          >
            {o.tagline}
          </div>
        </In>
        <div style={{ display: 'flex', gap: 16, marginTop: 46 }}>
          {o.chips.map((chip, i) => (
            <In key={chip} at={30 + i * 6} dy={16}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  height: 52,
                  padding: '0 22px',
                  borderRadius: 999,
                  boxSizing: 'border-box',
                  border: `1px solid ${C.goldLine}`,
                  background: 'rgba(15,30,46,.85)',
                  font: `600 23px ${bodyFont(lang)}`,
                  color: C.text,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: [C.green, C.blue, C.teal, C.gold][i] }} />
                {chip}
              </div>
            </In>
          ))}
        </div>
        <In at={54} style={{ marginTop: 46 }}>
          <div style={{ font: `500 32px ${FONT.mono}`, color: C.teal, letterSpacing: 0.5 }}>{REPO_URL}</div>
        </In>
      </AbsoluteFill>
      <In at={64} dy={8} style={{ position: 'absolute', left: 0, right: 0, bottom: 44, textAlign: 'center' }}>
        <div style={{ font: `400 ${lang === 'zh' ? 19 : 18}px ${bodyFont(lang)}`, color: C.textMuted }}>{o.footer}</div>
      </In>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};
