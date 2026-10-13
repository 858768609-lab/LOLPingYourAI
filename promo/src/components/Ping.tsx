import React from 'react';
import { Audio, Img, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { PINGS, sound, texture, type PingId } from '../data/pings';
import { easeInOut, easeOut, keyframes, linear, popEase, slideEase, clamp01 } from '../lib/anim';
import { FONT } from '../fonts';

export interface PingTag {
  text: string;
  color: string;
}

interface PingProps {
  id: PingId;
  x: number;
  y: number;
  /** --size in the app (default 110 px). */
  size?: number;
  /** --dur in the app (default 3.2 s). */
  durS?: number;
  tag?: PingTag;
  /** Font for the tag (emoji and CJK fall back automatically). */
  tagFont?: string;
  /** Freeze the effect at this many seconds after landing (for stills). */
  atS?: number;
}

/**
 * A ping exactly as src/renderer/overlay/overlay.css draws it (ground glow, three rings, pop + bob, All In clash and
 * flash, name tag), but driven by the Remotion frame instead of CSS animations. Time 0 is the start of the Sequence.
 */
export const PingFx: React.FC<PingProps> = ({ id, x, y, size = 110, durS = 3.2, tag, tagFont, atS }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = atS ?? frame / fps;
  const def = PINGS[id];
  const S = size;
  const k = S / 110; // the app sizes some effects in fixed px; scale them with the ping
  const c = def.color;
  const D = durS;
  if (t > D + 0.05) return null;

  const life = keyframes(
    t / D,
    [
      [0, 1],
      [0.87, 1],
      [1, 0],
    ],
    linear,
  );
  const groundO = keyframes(
    t / D,
    [
      [0, 0],
      [0.1, 0.75],
      [0.85, 0.55],
      [1, 0],
    ],
    easeOut,
  );
  const bob = (start: number): number => {
    if (t < start) return 0;
    const tb = (t - start) % 1.6;
    return (
      keyframes(
        tb,
        [
          [0, 0],
          [0.8, -5],
          [1.6, 0],
        ],
        easeInOut,
      ) * k
    );
  };

  const ring = (delay: number, key: string): React.ReactNode => {
    const tr = t - delay;
    if (tr < 0 || tr > 0.65) return null;
    const p = easeOut(clamp01(tr / 0.65));
    return (
      <div
        key={key}
        style={{
          position: 'absolute',
          left: -0.545 * S,
          top: -0.545 * S,
          width: 1.09 * S,
          height: 1.09 * S,
          boxSizing: 'border-box',
          borderRadius: '50%',
          border: `${3 * k}px solid ${c}`,
          boxShadow: `0 0 ${18 * k}px ${c}, inset 0 0 ${12 * k}px ${c}`,
          transform: `scale(${0.25 + 1.1 * p})`,
          opacity: 0.95 * (1 - p),
        }}
      />
    );
  };

  const imgStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    filter: `drop-shadow(0 0 ${10 * k}px ${c})`,
  };

  let art: React.ReactNode;
  if (def.art.length === 2) {
    const p = slideEase(clamp01(t / 0.22));
    const ts = t - 0.22;
    const shake = ts >= 0 && ts <= 0.25 ? ts / 0.25 : -1;
    const sx =
      shake < 0
        ? 0
        : keyframes(shake, [
            [0, 0],
            [0.25, -3],
            [0.5, 3],
            [0.75, -2],
            [1, 0],
          ]) * k;
    const sy =
      shake < 0
        ? 0
        : keyframes(shake, [
            [0, 0],
            [0.25, 2],
            [0.5, -2],
            [0.75, -1],
            [1, 0],
          ]) * k;
    const tf = t - 0.2;
    const fp = clamp01(tf / 0.35);
    const flashO =
      tf < 0 || tf > 0.35
        ? 0
        : keyframes(
            fp,
            [
              [0, 0],
              [0.3, 1],
              [1, 0],
            ],
            easeOut,
          );
    const flashS = 0.3 + 1.9 * easeOut(fp);
    art = (
      <>
        <div style={{ position: 'absolute', inset: 0, transform: `translate(${sx}px, ${sy + bob(0.5)}px)` }}>
          <Img
            src={texture(def.art[0])}
            style={{ ...imgStyle, opacity: p, transform: `translate(${(1 - p) * 0.64 * S}px, ${(1 - p) * -0.64 * S}px)` }}
          />
          <Img
            src={texture(def.art[1])}
            style={{ ...imgStyle, opacity: p, transform: `translate(${(1 - p) * -0.64 * S}px, ${(1 - p) * -0.64 * S}px)` }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            left: '25%',
            top: '25%',
            width: '50%',
            height: '50%',
            borderRadius: '50%',
            background: `radial-gradient(closest-side, #fff, ${c} 40%, transparent)`,
            opacity: flashO,
            transform: `scale(${flashS})`,
          }}
        />
      </>
    );
  } else {
    const scale = keyframes(
      t,
      [
        [0, 0.4],
        [0.168, 1.15],
        [0.28, 1],
      ],
      popEase,
    );
    const op = keyframes(
      t,
      [
        [0, 0],
        [0.168, 1],
      ],
      popEase,
    );
    art = (
      <div style={{ position: 'absolute', inset: 0, opacity: clamp01(op), transform: `translateY(${bob(0.3)}px) scale(${scale})` }}>
        <Img src={texture(def.art[0])} style={imgStyle} />
      </div>
    );
  }

  const tagY = 4 * k * (1 - easeOut(clamp01(t / 0.25)));

  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: -0.42 * S,
          top: 0.2 * S,
          width: 0.84 * S,
          height: 0.24 * S,
          borderRadius: '50%',
          background: `radial-gradient(closest-side, ${c}, transparent)`,
          opacity: groundO,
        }}
      />
      {ring(0, 'r1')}
      {ring(0.22, 'r2')}
      {ring(1.4, 'r3')}
      <div style={{ position: 'absolute', left: -0.5 * S, top: -0.73 * S, width: S, height: S, opacity: life }}>{art}</div>
      {tag && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0.5 * S,
            transform: `translate(-50%, ${tagY}px)`,
            whiteSpace: 'nowrap',
            padding: `${1 * k}px ${7 * k}px`,
            borderRadius: 4 * k,
            background: 'rgba(8, 12, 16, .62)',
            color: tag.color,
            font: `600 ${13 * k}px/${18 * k}px ${tagFont ?? FONT.body}`,
            letterSpacing: 0.2 * k,
            textShadow: '0 1px 2px #000',
            opacity: life,
          }}
        >
          {tag.text}
        </div>
      )}
    </div>
  );
};

/** A ping that lands at frame `at` of the parent timeline, with its sound unless muted. */
export const Ping: React.FC<PingProps & { at: number; muted?: boolean; volume?: number }> = ({ at, durS = 3.2, muted, volume = 0.6, ...rest }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {!muted && (
        <Sequence from={at} layout="none" name={`sound:${PINGS[rest.id].sound}`}>
          <Audio src={sound(PINGS[rest.id].sound)} volume={volume} />
        </Sequence>
      )}
      <Sequence from={at} durationInFrames={Math.ceil((durS + 0.1) * fps)} layout="none" name={`ping:${rest.id}`}>
        <PingFx durS={durS} {...rest} />
      </Sequence>
    </>
  );
};
