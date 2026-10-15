import { describe, expect, it } from 'vitest';
import { constrainSelection, resizeSelection } from '../../src/renderer/overlay/regionSelection';

const bounds = { width: 1920, height: 1080 };
describe('screenshot region bounds', () => {
  it('keeps a default box usable when the question is placed at the bottom-right corner', () => {
    expect(constrainSelection({ x: 1900 - 256, y: 1070 - 256, width: 512, height: 512 }, bounds))
      .toEqual({ x: 1408, y: 568, width: 512, height: 512 });
  });
  it('moves the whole region against the display edges without changing its size', () => {
    expect(constrainSelection({ x: -80, y: 1200, width: 300, height: 240 }, bounds))
      .toEqual({ x: 0, y: 840, width: 300, height: 240 });
  });
  it('shrinks to a display smaller than the default box', () => {
    expect(constrainSelection({ x: 100, y: 100, width: 512, height: 512 }, { width: 400, height: 300 }))
      .toEqual({ x: 0, y: 0, width: 400, height: 300 });
  });
  it('anchors the opposite corner and prevents inverted or offscreen regions', () => {
    const r = { x: 100, y: 200, width: 300, height: 400 };
    expect(resizeSelection(r, 'nw', -1000, -1000, bounds)).toEqual({ x: 0, y: 0, width: 400, height: 600 });
    expect(resizeSelection(r, 'nw', 1000, 1000, bounds)).toEqual({ x: 368, y: 568, width: 32, height: 32 });
    expect(resizeSelection(r, 'se', 5000, 5000, bounds)).toEqual({ x: 100, y: 200, width: 1820, height: 880 });
  });
  it('resizes a single edge without moving the perpendicular axis', () => {
    expect(resizeSelection({ x: 100, y: 200, width: 300, height: 400 }, 'e', 50, -300, bounds))
      .toEqual({ x: 100, y: 200, width: 350, height: 400 });
  });
});
