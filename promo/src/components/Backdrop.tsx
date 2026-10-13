import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { rand } from '../lib/anim';
import { C } from '../theme';

/** Slow drifting gold motes. Deterministic: every frame is a pure function of the frame number. */
export const Particles: React.FC<{ count?: number; seed?: number; opacity?: number }> = ({ count = 46, seed = 1, opacity = 1 }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity }}>
      {Array.from({ length: count }, (_, i) => {
        const r = (k: number) => rand(seed * 1000 + i * 17 + k);
        const speed = 0.15 + r(1) * 0.45; // px per frame
        const size = 1.5 + r(2) * 3.5;
        const x0 = r(3) * width;
        const y = ((((r(4) * (height + 100) - f * speed) % (height + 100)) + height + 100) % (height + 100)) - 50;
        const x = x0 + Math.sin(f / (40 + r(5) * 60) + r(6) * 6.28) * 18;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(f / (25 + r(7) * 35) + r(8) * 6.28));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: '#f3dca6',
              boxShadow: `0 0 ${size * 3}px ${C.gold}`,
              opacity: tw * (0.25 + r(9) * 0.55),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Deep navy hextech backdrop with a soft centre glow and vignette. */
export const Backdrop: React.FC<{ glow?: string }> = ({ glow = 'rgba(31,169,224,.16)' }) => (
  <AbsoluteFill
    style={{
      background: [
        `radial-gradient(ellipse 55% 50% at 50% 42%, ${glow}, transparent 70%)`,
        'radial-gradient(ellipse 80% 60% at 50% 110%, rgba(200,170,110,.10), transparent 70%)',
        `linear-gradient(180deg, ${C.navy} 0%, ${C.navy2} 60%, ${C.navyDeep} 100%)`,
      ].join(','),
    }}
  />
);

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.6 }) => (
  <AbsoluteFill
    style={{ pointerEvents: 'none', background: `radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, rgba(2,5,12,${strength}) 100%)` }}
  />
);
