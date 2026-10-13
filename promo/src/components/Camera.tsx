import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { clamp01 } from '../lib/anim';

export interface CameraState {
  cx: number;
  cy: number;
  z: number;
}

/** Frames the desktop: `cx, cy` (desktop coordinates) lands in the middle of the video at zoom `z`. */
export const Camera: React.FC<CameraState & { children: React.ReactNode }> = ({ cx, cy, z, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${width / 2 - cx * z}px, ${height / 2 - cy * z}px) scale(${z})` }}>
      {children}
    </AbsoluteFill>
  );
};

/**
 * How many screen pixels a desktop rect sticks out past the frame edges under this camera (0 when fully in frame).
 * `vertical` only checks top/bottom, for full-width bars such as the menu bar.
 */
export function overflowPx(
  cam: CameraState,
  r: { x: number; y: number; w: number; h: number },
  frame: { width: number; height: number },
  vertical = false,
): number {
  const sx = (x: number) => frame.width / 2 + (x - cam.cx) * cam.z;
  const sy = (y: number) => frame.height / 2 + (y - cam.cy) * cam.z;
  const v = Math.max(0, -sy(r.y), sy(r.y + r.h) - frame.height);
  return vertical ? v : Math.max(v, -sx(r.x), sx(r.x + r.w) - frame.width);
}

/** 1 while the rect is fully in frame, fading to 0 within `soft` px of it being cut by an edge. */
export const inFrame = (overflow: number, soft = 6): number => clamp01(1 - overflow / soft);
