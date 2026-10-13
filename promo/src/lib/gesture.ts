import { clamp01, easeInOut, type Ease } from './anim';
import { pickSlice } from './geometry';

export interface Pt {
  x: number;
  y: number;
}

/** A cursor move between frames `from` and `to` through `points` (a Catmull-Rom spline). */
export interface Move {
  from: number;
  to: number;
  points: Pt[];
  ease?: Ease;
}

function catmull(p0: number, p1: number, p2: number, p3: number, u: number): number {
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
}

function along(points: Pt[], s01: number): Pt {
  if (points.length === 1) return points[0];
  const n = points.length;
  const s = s01 * (n - 1);
  const i = Math.min(Math.floor(s), n - 2);
  const u = s - i;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(n - 1, i + 2)];
  return { x: catmull(p0.x, p1.x, p2.x, p3.x, u), y: catmull(p0.y, p1.y, p2.y, p3.y, u) };
}

/** Cursor position at any frame: rests between moves, follows each move's spline while it runs. */
export function track(start: Pt, moves: Move[]): (f: number) => Pt {
  const sorted = [...moves].sort((a, b) => a.from - b.from);
  return (f: number): Pt => {
    let pos = start;
    for (const m of sorted) {
      if (f < m.from) return pos;
      if (f <= m.to) return along(m.points, (m.ease ?? easeInOut)(clamp01((f - m.from) / Math.max(1, m.to - m.from))));
      pos = m.points[m.points.length - 1];
    }
    return pos;
  };
}

/** One press-drag-release: the wheel opens where the button went down and closes on release. */
export interface WheelGesture {
  origin: Pt;
  openAt: number;
  releaseAt: number;
}

/** The hot slice at frame f, as Wheel.move() would compute it (-1 while closed or in the dead zone). */
export function hotAt(g: WheelGesture, cursor: (f: number) => Pt, f: number): number {
  if (f < g.openAt || f >= g.releaseAt) return -1;
  const p = cursor(f);
  return pickSlice(p.x - g.origin.x, p.y - g.origin.y);
}

/** Frames where a new slice turns hot: the app plays its tick sound on each. */
export function tickFrames(g: WheelGesture, cursor: (f: number) => Pt): number[] {
  const out: number[] = [];
  let prev = -1;
  for (let f = g.openAt; f < g.releaseAt; f++) {
    const h = hotAt(g, cursor, f);
    if (h >= 0 && h !== prev) out.push(f);
    prev = h;
  }
  return out;
}

/** The slice picked on release (what Wheel.release() hands back), or -1 for the dead zone. */
export function released(g: WheelGesture, cursor: (f: number) => Pt): number {
  const p = cursor(g.releaseAt);
  return pickSlice(p.x - g.origin.x, p.y - g.origin.y);
}
