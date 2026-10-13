import React from 'react';
import { useCurrentFrame } from 'remotion';
import { easeIn, outExpo, progress } from '../lib/anim';

export const SWAP_IN = 12;
export const SWAP_OUT = 10;

/** 1 while the scene runs, easing in over its first frames and out over its last (desktop "app switch"). */
export function useSceneSwap(frames: number): { inP: number; outP: number; visible: number } {
  const f = useCurrentFrame();
  const inP = progress(f, 0, SWAP_IN, outExpo);
  const outP = progress(f, frames - SWAP_OUT, SWAP_OUT, easeIn);
  return { inP, outP, visible: inP * (1 - outP) };
}

/**
 * The scene's app window: scales/fades in when the scene starts and out before it ends, like switching apps. Desktop
 * scenes cut to each other on the wallpaper between those two moments, so no windows double-expose.
 */
export const SceneWindow: React.FC<{ frames: number; children: React.ReactNode; enter?: boolean; exit?: boolean }> = ({
  frames,
  children,
  enter = true,
  exit = true,
}) => {
  const { inP, outP } = useSceneSwap(frames);
  const i = enter ? inP : 1;
  const o = exit ? outP : 0;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: i * (1 - o),
        transform: `translateY(${(1 - i) * 14}px) scale(${(0.97 + 0.03 * i) * (1 - 0.025 * o)})`,
        transformOrigin: '640px 460px',
      }}
    >
      {children}
    </div>
  );
};
