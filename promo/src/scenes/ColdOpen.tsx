import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame } from 'remotion';
import { Backdrop, Particles, Vignette } from '../components/Backdrop';
import { Sfx } from '../components/Sfx';
import { COPY, type Lang } from '../copy';
import { DEFAULT_WHEEL, HUB_TEXTURE, PINGS, sound, texture } from '../data/pings';
import { displayFont, FONT } from '../fonts';
import { clamp01, easeIn, easeOut, keyframes, outExpo, popEase, progress, smooth } from '../lib/anim';
import { polar, WHEEL } from '../lib/geometry';
import { C } from '../theme';

export const COLD_OPEN_FRAMES = 150;
const CX = 960;
const CY = 410;
const R = 232;
const ICON = 116;
const FIRST = 8;
const STAGGER = 8; // ≈ .27 s

const TitleLine: React.FC<{ text: string; from: number; to: number; lang: Lang }> = ({ text, from, to, lang }) => {
  const f = useCurrentFrame();
  const pin = progress(f, from, 18, outExpo);
  const pout = progress(f, to - 10, 10, easeIn);
  if (f < from || f > to) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 790,
        textAlign: 'center',
        opacity: pin * (1 - pout),
        transform: `translateY(${(1 - pin) * 30 - pout * 16}px)`,
        filter: `blur(${(1 - pin) * 6}px)`,
      }}
    >
      <span
        style={{
          font: `700 ${lang === 'zh' ? 66 : 64}px ${displayFont(lang)}`,
          letterSpacing: lang === 'zh' ? 4 : 1.5,
          background: `linear-gradient(180deg, ${C.text} 20%, ${C.gold} 100%)`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          filter: 'drop-shadow(0 4px 22px rgba(0,0,0,.6))',
        }}
      >
        {text}
      </span>
    </div>
  );
};

/** 0:00–0:05 — the eight default pings pop into a ring, each with its real sound. */
export const ColdOpen: React.FC<{ lang: Lang }> = ({ lang }) => {
  const f = useCurrentFrame();
  const copy = COPY[lang];
  const spin = keyframes(f, [
    [0, -6],
    [COLD_OPEN_FRAMES, 6],
  ]);
  const push = 1 + 0.07 * progress(f, 118, 32, easeIn);
  const ringDraw = progress(f, 0, 40, smooth);
  const hubIn = progress(f, FIRST + STAGGER * 8, 16, outExpo);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Particles seed={3} />
      {DEFAULT_WHEEL.map((id, i) => (
        <Sfx key={id} at={FIRST + i * STAGGER} src={sound(PINGS[id].sound)} volume={0.42} maxS={0.55} fadeS={0.2} />
      ))}
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: `${CX}px ${CY}px` }}>
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id="co-core" cx={CX} cy={CY - 10} r={WHEEL.innerR} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#2c5d60" />
              <stop offset="1" stopColor="#11292c" />
            </radialGradient>
          </defs>
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={C.gold}
            strokeOpacity={0.35}
            strokeWidth={1.5}
            strokeDasharray={2 * Math.PI * R}
            strokeDashoffset={(1 - ringDraw) * 2 * Math.PI * R}
            transform={`rotate(-90 ${CX} ${CY})`}
          />
          <circle
            cx={CX}
            cy={CY}
            r={R + 70}
            fill="none"
            stroke={C.gold}
            strokeOpacity={0.12}
            strokeWidth={1}
            strokeDasharray="2 10"
            transform={`rotate(${spin * 2} ${CX} ${CY})`}
            opacity={ringDraw}
          />
          <g opacity={hubIn} transform={`translate(${CX} ${CY}) scale(${0.6 + 0.4 * hubIn}) translate(${-CX} ${-CY})`}>
            <circle cx={CX} cy={CY} r={WHEEL.innerR + 4} fill="none" stroke="#1a1a1a" strokeWidth={6} opacity={0.6} />
            <circle cx={CX} cy={CY} r={WHEEL.innerR} fill="url(#co-core)" stroke={C.gold} strokeWidth={3} />
            <circle cx={CX} cy={CY} r={WHEEL.innerR - 7} fill="none" stroke="#8a7448" strokeWidth={1} opacity={0.6} />
            <text x={CX} y={CY + 24} textAnchor="middle" style={{ font: `600 19px ${FONT.body}`, letterSpacing: 1.5, fill: C.blue }}>
              PING
            </text>
          </g>
        </svg>
        {hubIn > 0 && (
          <Img
            src={texture(HUB_TEXTURE)}
            style={{
              position: 'absolute',
              left: CX - 26,
              top: CY - 50,
              width: 52,
              height: 52,
              opacity: hubIn,
              transform: `scale(${0.6 + 0.4 * hubIn})`,
            }}
          />
        )}
        {DEFAULT_WHEEL.map((id, i) => {
          const def = PINGS[id];
          const t = (f - (FIRST + i * STAGGER)) / 30;
          if (t < 0) return null;
          const [dx, dy] = polar(R, -90 + i * 45 + spin);
          const scale = keyframes(
            t,
            [
              [0, 0.4],
              [0.168, 1.15],
              [0.28, 1],
            ],
            popEase,
          );
          const op = clamp01(
            keyframes(
              t,
              [
                [0, 0],
                [0.168, 1],
              ],
              popEase,
            ),
          );
          const ringP = easeOut(clamp01(t / 0.65));
          const bob = Math.sin((f / 30) * Math.PI * 1.25 + i) * 4 * clamp01(t / 0.4);
          return (
            <React.Fragment key={id}>
              {t < 0.65 && (
                <div
                  style={{
                    position: 'absolute',
                    left: CX + dx - ICON * 0.6,
                    top: CY + dy - ICON * 0.6,
                    width: ICON * 1.2,
                    height: ICON * 1.2,
                    borderRadius: '50%',
                    border: `3px solid ${def.color}`,
                    boxShadow: `0 0 18px ${def.color}, inset 0 0 12px ${def.color}`,
                    transform: `scale(${0.25 + 1.1 * ringP})`,
                    opacity: 0.95 * (1 - ringP),
                    boxSizing: 'border-box',
                  }}
                />
              )}
              <div
                style={{
                  position: 'absolute',
                  left: CX + dx - ICON * 0.9,
                  top: CY + dy - ICON * 0.9,
                  width: ICON * 1.8,
                  height: ICON * 1.8,
                  borderRadius: '50%',
                  background: `radial-gradient(closest-side, ${def.color}55, transparent)`,
                  opacity: op * 0.8,
                }}
              />
              <Img
                src={texture(def.icon)}
                style={{
                  position: 'absolute',
                  left: CX + dx - ICON / 2,
                  top: CY + dy - ICON / 2 + bob,
                  width: ICON,
                  height: ICON,
                  opacity: op,
                  transform: `scale(${scale})`,
                  filter: `drop-shadow(0 0 12px ${def.color}aa)`,
                }}
              />
            </React.Fragment>
          );
        })}
      </AbsoluteFill>
      <TitleLine text={copy.coldOpen[0]} from={8} to={76} lang={lang} />
      <TitleLine text={copy.coldOpen[1]} from={80} to={COLD_OPEN_FRAMES + 20} lang={lang} />
      <Vignette />
    </AbsoluteFill>
  );
};
