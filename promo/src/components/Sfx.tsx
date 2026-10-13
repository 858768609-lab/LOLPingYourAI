import React from 'react';
import { Audio, interpolate, Sequence, useVideoConfig } from 'remotion';

interface SfxProps {
  /** Frame (of the parent timeline) the sound starts on. */
  at: number;
  src: string;
  volume?: number;
  /** Play only this many seconds, fading out over the last `fadeS`. */
  maxS?: number;
  fadeS?: number;
}

/** One of the repo's WAV/OGG sounds at a given frame. */
export const Sfx: React.FC<SfxProps> = ({ at, src, volume = 0.6, maxS, fadeS = 0.15 }) => {
  const { fps } = useVideoConfig();
  const len = maxS ? Math.round(maxS * fps) : undefined;
  return (
    <Sequence from={at} durationInFrames={len} layout="none" name={`sfx:${src.split('/').pop()}`}>
      <Audio
        src={src}
        volume={(f) =>
          len ? volume * interpolate(f, [0, len - fadeS * fps, len], [1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : volume
        }
      />
    </Sequence>
  );
};
