import React from 'react';
import { AbsoluteFill } from 'remotion';
import { emoteStill, PROMO_EMOTE_WHEEL } from '../data/emotes';
import { DEFAULT_WHEEL, PINGS, texture } from '../data/pings';

/** Ping --size on the 1920×1080 desktop (the app's default is 110 px; a little larger reads better on video). */
export const PING_SIZE = 160;

/** Where the keycap overlay sits: bottom right, level with the caption. */
export const HUD_POS: React.CSSProperties = { right: 96, bottom: 72 };

export const PING_WHEEL_ITEMS = DEFAULT_WHEEL.map((id) => ({ key: id, icon: texture(PINGS[id].icon) }));
export const EMOTE_WHEEL_ITEMS = PROMO_EMOTE_WHEEL.map((slug) => ({ key: slug, icon: emoteStill(slug) }));

/** Darkens the bottom of the frame so the lower-third caption always reads. */
export const BottomShade: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      opacity,
      background: 'linear-gradient(180deg, transparent 0%, transparent 66%, rgba(4,9,18,.72) 82%, rgba(4,9,18,.92) 100%)',
    }}
  />
);
