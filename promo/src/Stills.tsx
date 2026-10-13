import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Backdrop, Particles, Vignette } from './components/Backdrop';
import { Cursor } from './components/Cursor';
import { PingFx } from './components/Ping';
import { WheelArt } from './components/Wheel';
import { COPY } from './copy';
import { HUB_TEXTURE, SLOT, texture } from './data/pings';
import { FONT } from './fonts';
import { polar, WHEEL } from './lib/geometry';
import { AppIcon, REPO_URL, Wordmark } from './scenes/Outro';
import { PING_WHEEL_ITEMS } from './scenes/shared';
import { AGENT_TAG_COLOR, C } from './theme';

interface ShowcaseLayout {
  /** Text block. */
  left: number;
  top: number;
  icon: number;
  word: number;
  tagline: number;
  taglineWidth: number;
  chips: boolean;
  url: number;
  /** Wheel centre and scale. */
  wheel: { x: number; y: number; s: number };
  /** The teammate's reverse ping. */
  ping: { x: number; y: number; size: number };
}

const HOT = SLOT.W; // the "?" slice, as in the demo

/** Logo, name and tagline beside the open ping wheel ("?" hot) and the teammate's blue reverse ping. */
const Showcase: React.FC<{ L: ShowcaseLayout }> = ({ L }) => {
  const o = COPY.en.outro;
  const heat = Array.from({ length: 8 }, (_, i) => (i === HOT ? 1 : 0));
  const [hx, hy] = polar(WHEEL.iconR + 40, -90 + HOT * 45);
  return (
    <AbsoluteFill>
      <Backdrop glow="rgba(31,169,224,.14)" />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${L.wheel.x}px ${L.wheel.y}px, rgba(10,200,185,.16), transparent ${WHEEL.extR * L.wheel.s * 1.25}px)`,
        }}
      />
      <Particles seed={11} count={34} />
      <div
        style={{
          position: 'absolute',
          left: L.wheel.x - 300,
          top: L.wheel.y - 300,
          width: 600,
          height: 600,
          transform: `scale(${L.wheel.s})`,
          transformOrigin: '300px 300px',
          filter: 'drop-shadow(0 30px 60px rgba(0,0,0,.55))',
        }}
      >
        <WheelArt id="showcase" items={PING_WHEEL_ITEMS} centerLabel="PING" centerIcon={texture(HUB_TEXTURE)} heat={heat} />
        <Cursor x={300 + hx} y={300 + hy} scale={1.25} pressed={1} />
      </div>
      <PingFx id="omw" x={L.ping.x} y={L.ping.y} size={L.ping.size} atS={0.45} tag={{ text: 'AI', color: AGENT_TAG_COLOR }} />
      <div style={{ position: 'absolute', left: L.left, top: L.top, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <AppIcon size={L.icon} />
        <div style={{ marginTop: L.icon * 0.28, lineHeight: 1 }}>
          <Wordmark size={L.word} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: L.word * 0.3 }}>
          <div style={{ width: 9, height: 9, transform: 'rotate(45deg)', background: C.gold, boxShadow: `0 0 10px ${C.gold}` }} />
          <div style={{ width: L.taglineWidth * 0.45, height: 1.5, background: `linear-gradient(90deg, ${C.gold}, transparent)` }} />
        </div>
        <div
          style={{
            marginTop: L.word * 0.26,
            maxWidth: L.taglineWidth,
            font: `500 ${L.tagline}px/1.3 ${FONT.body}`,
            color: C.text,
            textWrap: 'balance',
          }}
        >
          {o.tagline.split(/(?<=\.) /).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
        {L.chips && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: L.tagline * 1.1, maxWidth: 700 }}>
            {o.chips.map((chip, i) => (
              <div
                key={chip}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  height: L.tagline * 1.45,
                  padding: `0 ${L.tagline * 0.6}px`,
                  borderRadius: 999,
                  border: `1px solid ${C.goldLine}`,
                  background: 'rgba(15,30,46,.85)',
                  font: `600 ${L.tagline * 0.6}px ${FONT.body}`,
                  color: C.text,
                }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: [C.green, C.blue, C.teal, C.gold][i] }} />
                {chip}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: L.tagline * 1.05, font: `500 ${L.url}px ${FONT.mono}`, color: C.teal }}>{REPO_URL}</div>
      </div>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

/** GitHub social preview, 1280×640: key content inside the central safe area (GitHub crops ~40 px). */
export const Social: React.FC = () => (
  <Showcase
    L={{
      left: 92,
      top: 112,
      icon: 92,
      word: 70,
      tagline: 28,
      taglineWidth: 560,
      chips: false,
      url: 21,
      wheel: { x: 1030, y: 322, s: 0.98 },
      ping: { x: 742, y: 470, size: 130 },
    }}
  />
);

/** 1920×1080 poster. */
export const Poster: React.FC = () => (
  <Showcase
    L={{
      left: 150,
      top: 210,
      icon: 128,
      word: 104,
      tagline: 40,
      taglineWidth: 820,
      chips: true,
      url: 29,
      wheel: { x: 1580, y: 530, s: 1.42 },
      ping: { x: 1150, y: 850, size: 190 },
    }}
  />
);
