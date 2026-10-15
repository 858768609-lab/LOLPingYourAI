import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Desktop } from '../desktop.mjs';

test('tracked captures select window identity and pad a 2x negative-coordinate square', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lolping-capture-'));
  const bounds = { x: -950, y: 50, width: 300, height: 200 }, target = { id: '44', pid: 3, bounds, relative: { x: .5, y: .5 } };
  const png = await sharp({ create: { width: 600, height: 400, channels: 4, background: '#ff0000' } }).png().toBuffer();
  const display = { id: 5, bounds: { x: -1024, y: 0, width: 1024, height: 768 }, scaleFactor: 2 };
  const desktop = new Desktop({ dataDir: dir, overlays: { captureWithoutOverlays: fn => fn() }, electron: { screen: {
    getDisplayNearestPoint: () => display,
    screenToDipRect: (_window, rect) => Object.fromEntries(Object.entries(rect).map(([key, value]) => [key, value / 2])),
    dipToScreenPoint: point => ({ x: point.x * 2, y: point.y * 2 }),
  }, desktopCapturer: { getSources: async options => { assert.deepEqual(options.types, ['window']); return [{ id: 'window:44:0', thumbnail: { isEmpty: () => false, getSize: () => ({ width: 600, height: 400 }), crop: rect => { assert.deepEqual(rect, { x: 0, y: 0, width: 600, height: 400 }); return { toPNG: () => png }; } } }]; } } } });
  // Win32 reports physical pixels; the public capture contract uses logical pixels.
  const nativeTarget = process.platform === 'win32'
    ? { ...target, bounds: Object.fromEntries(Object.entries(bounds).map(([key, value]) => [key, value * 2])) }
    : target;
  desktop.native = async op => op === 'doctor' ? { locked: false, screenRecording: true } : nativeTarget;
  try {
    const capture = await desktop.capture(target, 512, true);
    assert.equal(capture.region.captureKind, 'window'); assert.equal(capture.region.scaleFactor, 2);
    assert.deepEqual(capture.region.valid, bounds);
    const { data, info } = await sharp(capture.imagePath).raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 512); assert.equal(info.height, 512);
    assert.deepEqual([...data.subarray((256 * 512 + 256) * 4, (256 * 512 + 256) * 4 + 3)], [255, 0, 0]);
    assert.deepEqual([...data.subarray(0, 3)], [21, 25, 34]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('explicit rectangular selection captures exact screen pixels and restores overlays before encoding', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lolping-selection-'));
  const selection = { x: 30, y: 20, width: 80, height: 40 };
  const cropPng = await sharp({ create: { width: 80, height: 40, channels: 4, background: '#00ff00' } }).png().toBuffer();
  let hidden = false, hideCount = 0;
  const desktop = new Desktop({ dataDir: dir, overlays: { captureWithoutOverlays: async fn => { hidden = true; hideCount++; try { return await fn(); } finally { hidden = false; } } }, electron: { screen: {
    getDisplayNearestPoint: () => ({ id: 2, bounds: { x: 0, y: 0, width: 200, height: 120 }, scaleFactor: 1 }),
    screenToDipRect: (_window, rect) => rect, dipToScreenPoint: point => point,
  }, desktopCapturer: { getSources: async options => {
    assert.deepEqual(options.types, ['screen']); assert.equal(hidden, true);
    return [{ display_id: '2', thumbnail: { isEmpty: () => false, getSize: () => ({ width: 200, height: 120 }), crop: rect => {
      assert.deepEqual(rect, selection); assert.equal(hidden, false); return { toPNG: () => cropPng };
    } } }];
  } } } });
  desktop.native = async op => op === 'doctor' ? { locked: false, screenRecording: true } : { id: '44', pid: 3, bounds: { x: 0, y: 0, width: 100, height: 100 } };
  try {
    const capture = await desktop.capture({ x: 50, y: 50 }, 512, false, selection);
    assert.equal(hideCount, 1); assert.equal(capture.region.captureKind, 'screen'); assert.deepEqual(capture.region.selection, selection);
    const { data, info } = await sharp(capture.imagePath).raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 80); assert.equal(info.height, 40); assert.deepEqual([...data.subarray(0, 3)], [0, 255, 0]);
    await assert.rejects(desktop.capture({ x: 50, y: 50 }, 512, false, { ...selection, width: 500 }), /同一块屏幕/);
    await assert.rejects(desktop.capture({ x: 50, y: 50 }, 512, false, { ...selection, x: NaN }), /无效/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('ordinary window capture keeps overlays visible and never falls back when a tracked window is missing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lolping-visible-'));
  const target = { id: '44', pid: 3, bounds: { x: 0, y: 0, width: 100, height: 100 }, relative: { x: .5, y: .5 } };
  const png = await sharp({ create: { width: 100, height: 100, channels: 4, background: '#ff0000' } }).png().toBuffer();
  let available = true;
  const desktop = new Desktop({ dataDir: dir, overlays: { captureWithoutOverlays: () => { throw new Error('must not hide'); } }, electron: { screen: {
    getDisplayNearestPoint: () => ({ id: 2, bounds: { x: 0, y: 0, width: 200, height: 120 }, scaleFactor: 1 }),
    screenToDipRect: (_window, rect) => rect, dipToScreenPoint: point => point,
  }, desktopCapturer: { getSources: async () => available ? [{ id: 'window:44:0', thumbnail: { isEmpty: () => false, getSize: () => ({ width: 100, height: 100 }), crop: () => ({ toPNG: () => png }) } }] : [] } } });
  desktop.native = async op => op === 'doctor' ? { locked: false, screenRecording: true } : target;
  try {
    assert.equal((await desktop.capture({ x: 50, y: 50 }, 100)).region.captureKind, 'window');
    available = false;
    await assert.rejects(desktop.capture(target, 100, true), /无法截取目标窗口/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('a moved target refuses stale coordinate actions', async () => {
  const desktop = new Desktop({}); desktop.resolve = async () => ({ id: '1', pid: 2, bounds: { x: 20, y: 0, width: 100, height: 100 } });
  await assert.rejects(desktop.action({ action: 'click', x: 25, y: 25 }, { target: { bounds: { x: 0, y: 0, width: 100, height: 100 } } }), /Window moved/);
});
