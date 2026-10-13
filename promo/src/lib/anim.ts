import { Easing } from 'remotion';

export type Ease = (t: number) => number;

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// CSS timing functions used by src/renderer/overlay/overlay.css
export const linear: Ease = (t) => t;
export const ease: Ease = Easing.bezier(0.25, 0.1, 0.25, 1);
export const easeOut: Ease = Easing.bezier(0, 0, 0.58, 1);
export const easeIn: Ease = Easing.bezier(0.42, 0, 1, 1);
export const easeInOut: Ease = Easing.bezier(0.42, 0, 0.58, 1);
export const popEase: Ease = Easing.bezier(0.2, 1.6, 0.4, 1);
export const slideEase: Ease = Easing.bezier(0.5, 0, 0.9, 0.5);
// motion-design curves for the promo itself
export const smooth: Ease = Easing.bezier(0.65, 0, 0.35, 1);
export const outExpo: Ease = Easing.bezier(0.16, 1, 0.3, 1);
export const outBack: Ease = Easing.bezier(0.34, 1.56, 0.64, 1);

/**
 * CSS-style keyframes: `kfs` are [time, value] pairs and `fn` eases each interval separately,
 * exactly like animation-timing-function does between keyframes.
 */
export function keyframes(t: number, kfs: ReadonlyArray<readonly [number, number]>, fn: Ease = linear): number {
  if (t <= kfs[0][0]) return kfs[0][1];
  for (let i = 1; i < kfs.length; i++) {
    const [t0, v0] = kfs[i - 1];
    const [t1, v1] = kfs[i];
    if (t <= t1) return t1 === t0 ? v1 : v0 + (v1 - v0) * fn((t - t0) / (t1 - t0));
  }
  return kfs[kfs.length - 1][1];
}

/** 0→1 over [start, start + dur] with easing, clamped. */
export const progress = (f: number, start: number, dur: number, fn: Ease = linear): number => fn(clamp01((f - start) / Math.max(1e-6, dur)));

/** Fades in over `inDur` from `from`, holds, fades out over `outDur` ending at `to`. */
export function window01(f: number, from: number, to: number, inDur = 10, outDur = 10, fn: Ease = easeOut): number {
  if (f < from || f > to) return 0;
  return Math.min(progress(f, from, inDur, fn), 1 - progress(f, to - outDur, outDur, easeIn));
}

/** Deterministic pseudo-random in [0, 1). */
export function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
