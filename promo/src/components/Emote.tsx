import React from 'react';
import { AnimatedImage, Sequence, useVideoConfig } from 'remotion';
import { EMOTE_DURATION_S, emoteAnim, emoteSound } from '../data/emotes';
import { Sfx } from './Sfx';

interface EmoteProps {
  slug: string;
  at: number;
  x: number;
  y: number;
  /** --size: the art's width (the app's default is 150 px). */
  size?: number;
  volume?: number;
}

/**
 * A bundled emote as the overlay plays it: the baked animated WebP (a 320 px canvas holding 256 px of art, so drawn
 * 1.25× the art size) plays once from frame 0 and is gone after EMOTE_DURATION_S, with its OGG sound.
 */
export const Emote: React.FC<EmoteProps> = ({ slug, at, x, y, size = 150, volume = 0.8 }) => {
  const { fps } = useVideoConfig();
  const sheet = size * 1.25;
  return (
    <>
      <Sfx at={at} src={emoteSound(slug)} volume={volume} />
      <Sequence from={at} durationInFrames={Math.round(EMOTE_DURATION_S * fps)} layout="none" name={`emote:${slug}`}>
        <div style={{ position: 'absolute', left: x - sheet / 2, top: y - sheet / 2, width: sheet, height: sheet, pointerEvents: 'none' }}>
          <AnimatedImage src={emoteAnim(slug)} width={sheet} height={sheet} loopBehavior="clear-after-finish" />
        </div>
      </Sequence>
    </>
  );
};
