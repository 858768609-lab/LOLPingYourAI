import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmoteArt } from '../../src/shared/emotes';
import { OVERLAY_EMOTED, OVERLAY_PINGED, SELECTION_READY, SELECTION_RESULT } from '../../src/shared/ipc';
import { DEFAULT_SETTINGS, overlaySettings } from '../../src/shared/settings';

const h = vi.hoisted(() => ({
  windows: [] as Array<{ x: number; visible: boolean; destroyed: boolean; hide: ReturnType<typeof vi.fn>; showInactive: ReturnType<typeof vi.fn>; setIgnoreMouseEvents: ReturnType<typeof vi.fn>; setFocusable: ReturnType<typeof vi.fn>; webContents: { send: ReturnType<typeof vi.fn> } }>,
  handlers: new Map<string, (event: unknown, raw: unknown) => void>(),
}));

vi.mock('electron', async () => {
  const { EventEmitter: Emitter } = await import('node:events');
  class FakeWindow extends Emitter {
    static fromWebContents(wc: unknown): FakeWindow | null {
      return (h.windows as unknown as FakeWindow[]).find((w) => w.webContents === wc) ?? null;
    }
    x: number;
    visible = true;
    destroyed = false;
    hide = vi.fn(() => { this.visible = false; });
    showInactive = vi.fn(() => { this.visible = true; });
    webContents = Object.assign(new Emitter(), { send: vi.fn() });
    constructor(opts: { x: number }) {
      super();
      this.x = opts.x;
      h.windows.push(this);
    }
    setIgnoreMouseEvents = vi.fn();
    setFocusable = vi.fn();
    show(): void { this.visible = true; }
    focus(): void {}
    setAlwaysOnTop(): void {}
    setBounds(): void {}
    isVisible(): boolean { return this.visible; }
    isDestroyed(): boolean {
      return this.destroyed;
    }
    destroy(): void {}
  }
  const displays = [
    { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, scaleFactor: 1 },
    { id: 2, bounds: { x: 1920, y: 0, width: 1280, height: 1024 }, scaleFactor: 1 },
  ];
  const screen = Object.assign(new Emitter(), {
    getAllDisplays: () => displays,
    getPrimaryDisplay: () => displays[0],
    dipToScreenRect: (_win: unknown, r: unknown) => r,
  });
  const ipcMain = { on: (channel: string, fn: (event: unknown, raw: unknown) => void) => h.handlers.set(channel, fn) };
  return { BrowserWindow: FakeWindow, ipcMain, screen };
});

afterEach(() => { vi.useRealTimers(); });

describe('OverlayManager fallback screenshot visibility', () => {
  it('captures after a short compositor settle and restores only windows that were visible', async () => {
    vi.useFakeTimers();
    h.windows[1].visible = false;
    const capture = vi.fn(async () => {
      expect(h.windows.every(w => !w.visible)).toBe(true);
      return 'screenshot';
    });
    const result = mgr.captureWithoutOverlays(capture);
    expect(h.windows[0].hide).toHaveBeenCalledOnce();
    expect(h.windows[1].hide).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(33);
    expect(capture).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe('screenshot');
    expect(h.windows[0].showInactive).toHaveBeenCalledOnce();
    expect(h.windows[1].showInactive).not.toHaveBeenCalled();
  });

  it('restores the overlay after capture fails', async () => {
    vi.useFakeTimers();
    const result = mgr.captureWithoutOverlays(async () => { throw new Error('capture failed'); });
    const rejected = expect(result).rejects.toThrow('capture failed');
    await vi.advanceTimersByTimeAsync(34);
    await rejected;
    expect(h.windows.every(w => w.visible)).toBe(true);
  });

  it('does not restore a window that was destroyed during capture', async () => {
    vi.useFakeTimers();
    const result = mgr.captureWithoutOverlays(async () => { h.windows[0].destroyed = true; });
    await vi.advanceTimersByTimeAsync(34);
    await result;
    expect(h.windows[0].showInactive).not.toHaveBeenCalled();
    expect(h.windows[1].showInactive).toHaveBeenCalledOnce();
  });

  it('does not delay a capture when no overlay needs hiding', async () => {
    vi.useFakeTimers();
    h.windows.forEach(w => { w.visible = false; });
    const capture = vi.fn(async () => 'image');
    await expect(mgr.captureWithoutOverlays(capture)).resolves.toBe('image');
    expect(capture).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});

vi.mock('../../src/main/paths', () => ({
  IS_MAC: false,
  loadPage: () => Promise.resolve(),
  preloadPath: () => 'preload.js',
}));

type Manager = InstanceType<typeof import('../../src/main/overlayManager').OverlayManager>;
let mgr: Manager;
let resolveArt: ReturnType<typeof vi.fn<(ref: string, remote: boolean) => EmoteArt>>;

const art = (ref: string, remote: boolean): EmoteArt => ({ kind: 'bundled', slug: `${ref}${remote ? '-remote' : ''}` });
/** What display 1 (index 0) or display 2 (index 1) was told, minus the settings it gets on load. */
const sent = (i: number): Array<[string, unknown]> =>
  h.windows[i].webContents.send.mock.calls.filter((c) => c[0] !== 'overlay:settings') as Array<[string, unknown]>;

beforeEach(async () => {
  h.windows.length = 0;
  h.handlers.clear();
  vi.resetModules();
  const { OverlayManager } = await import('../../src/main/overlayManager');
  resolveArt = vi.fn(art);
  mgr = new OverlayManager(overlaySettings({ ...DEFAULT_SETTINGS, clickEmoteId: 'okay' }), resolveArt);
  mgr.start();
});

describe('OverlayManager wheels', () => {
  it('forwards the open wheel\'s kind with every move and the release', () => {
    mgr.handle({ type: 'wheelOpen', x: 100, y: 200, wheel: 'emote' });
    mgr.handle({ type: 'wheelMove', x: 110, y: 210, wheel: 'emote' });
    mgr.handle({ type: 'wheelRelease', x: 120, y: 220, wheel: 'emote' });
    expect(sent(0)).toEqual([
      ['wheel:open', { x: 100, y: 200, wheel: 'emote' }],
      ['wheel:move', { x: 110, y: 210, wheel: 'emote' }],
      ['wheel:release', { x: 120, y: 220, wheel: 'emote' }],
    ]);
  });

  it('keeps the ping wheel a ping wheel after an emote one', () => {
    mgr.handle({ type: 'wheelOpen', x: 1, y: 1, wheel: 'emote' });
    mgr.handle({ type: 'wheelRelease', x: 1, y: 1, wheel: 'emote' });
    mgr.handle({ type: 'wheelOpen', x: 5, y: 5, wheel: 'ping' });
    mgr.handle({ type: 'wheelMove', x: 6, y: 6, wheel: 'ping' });
    expect(sent(0).slice(2)).toEqual([
      ['wheel:open', { x: 5, y: 5, wheel: 'ping' }],
      ['wheel:move', { x: 6, y: 6, wheel: 'ping' }],
    ]);
  });
});

describe('OverlayManager emote clicks', () => {
  it('shows the click emote where it was clicked, clears ours on the other displays and shares it', () => {
    const shared = vi.fn();
    mgr.on('sharedEmote', shared);
    mgr.on('shared', shared);
    mgr.handle({ type: 'click', x: 1920 + 300, y: 400, wheel: 'emote' });
    expect(sent(1)).toEqual([['emote:spawn', { owner: 'self', art: art('okay', false), x: 300, y: 400 }]]);
    expect(sent(0)).toEqual([['emote:clear', { owner: 'self' }]]);
    expect(resolveArt).toHaveBeenCalledWith('okay', false);
    expect(shared).toHaveBeenCalledOnce();
    expect(shared).toHaveBeenCalledWith({ ref: 'okay', displayId: 2, x: 300, y: 400 });
  });

  it('still drops the click ping for a ping click', () => {
    const emoted = vi.fn();
    const pinged = vi.fn();
    mgr.on('sharedEmote', emoted);
    mgr.on('shared', pinged);
    mgr.handle({ type: 'click', x: 50, y: 60, wheel: 'ping' });
    expect(sent(0)).toEqual([['ping:spawn', { id: DEFAULT_SETTINGS.clickPingId, x: 50, y: 60 }]]);
    expect(sent(1)).toEqual([]);
    expect(emoted).not.toHaveBeenCalled();
    expect(pinged).toHaveBeenCalledOnce();
  });
});

describe('OverlayManager emote reports from the overlay', () => {
  const sender = (i: number): unknown => h.windows[i].webContents;

  it('shares a wheel emote from the display that placed it and clears ours elsewhere', () => {
    const shared = vi.fn();
    mgr.on('sharedEmote', shared);
    h.handlers.get(OVERLAY_EMOTED)!({ sender: sender(1) }, { ref: 'c:' + 'a'.repeat(32), x: 10, y: 20 });
    expect(shared).toHaveBeenCalledWith({ ref: 'c:' + 'a'.repeat(32), displayId: 2, x: 10, y: 20 });
    expect(sent(0)).toEqual([['emote:clear', { owner: 'self' }]]);
    expect(sent(1)).toEqual([]);
  });

  it('ignores a malformed report', () => {
    const shared = vi.fn();
    mgr.on('sharedEmote', shared);
    const report = h.handlers.get(OVERLAY_EMOTED)!;
    for (const raw of [
      null, 'x', 5, {}, { ref: 'Bad Ref', x: 1, y: 1 }, { ref: 'c:abc', x: 1, y: 1 }, { ref: 'okay', x: Number.NaN, y: 1 },
      { ref: 'okay', x: 1, y: Infinity }, { ref: 'okay', x: '1', y: 1 }, { ref: 7, x: 1, y: 1 },
    ]) report({ sender: sender(0) }, raw);
    report({ sender: {} }, { ref: 'okay', x: 1, y: 1 }); // not one of our windows
    expect(shared).not.toHaveBeenCalled();
    expect(sent(0)).toEqual([]);
    expect(sent(1)).toEqual([]);
  });

  it('still shares pings', () => {
    const shared = vi.fn();
    mgr.on('shared', shared);
    h.handlers.get(OVERLAY_PINGED)!({ sender: sender(0) }, { id: 'danger', x: 1, y: 2 });
    expect(shared).toHaveBeenCalledWith({ id: 'danger', displayId: 1, x: 1, y: 2 });
  });
});

describe('OverlayManager remote and preview emotes', () => {
  it('shows a room member\'s emote on the target display with their tag, and clears theirs on the others', () => {
    mgr.spawnRemoteEmote({ displayId: 2, x: 5, y: 6, ref: 'gg_heart', peer: 'peer-1', tag: { name: 'Bob', color: 2 } });
    expect(resolveArt).toHaveBeenCalledWith('gg_heart', true);
    expect(sent(1)).toEqual([['emote:spawn', { owner: 'peer-1', art: art('gg_heart', true), x: 5, y: 6, tag: { name: 'Bob', color: 2 } }]]);
    expect(sent(0)).toEqual([['emote:clear', { owner: 'peer-1' }]]);
  });

  it('previews in the middle of the main display without sharing', () => {
    const shared = vi.fn();
    mgr.on('sharedEmote', shared);
    mgr.previewEmote('nice');
    expect(resolveArt).toHaveBeenCalledWith('nice', false);
    expect(sent(0)).toEqual([['emote:spawn', { owner: 'preview', art: art('nice', false), x: 960, y: 540 }]]);
    expect(sent(1)).toEqual([]);
    expect(shared).not.toHaveBeenCalled();
  });
});

describe('local question screenshot selection', () => {
  const from = (i = 0) => ({ sender: h.windows[i].webContents });
  const question = (i = 0) => {
    h.handlers.get(OVERLAY_PINGED)!(from(i), { id: 'missing', x: 300, y: 400 });
    return (sent(i).filter(([ch]) => ch === 'selection:prepare').at(-1)![1] as { requestId: number }).requestId;
  };
  const ready = (requestId: number, i = 0) => h.handlers.get(SELECTION_READY)!(from(i), requestId);
  const result = (requestId: number, selection: unknown, i = 0) => h.handlers.get(SELECTION_RESULT)!(from(i), { requestId, selection });

  it('waits for the full question animation and explicit confirmation before sharing once', () => {
    const shared = vi.fn(); mgr.on('shared', shared);
    const requestId = question();
    expect(shared).not.toHaveBeenCalled();
    expect(sent(0).map(([ch]) => ch)).toEqual(['selection:prepare']);
    result(requestId, { x: 20, y: 30, width: 640, height: 360 });
    expect(shared).not.toHaveBeenCalled();
    ready(requestId);
    expect(h.windows[0].setFocusable).toHaveBeenLastCalledWith(true);
    expect(h.windows[0].setIgnoreMouseEvents).toHaveBeenLastCalledWith(false);
    expect(sent(0).at(-1)?.[0]).toBe('selection:show');
    expect(shared).not.toHaveBeenCalled();
    const selection = { x: 20, y: 30, width: 640, height: 360 };
    result(requestId, selection); result(requestId, selection);
    expect(shared).toHaveBeenCalledExactlyOnceWith({ id: 'missing', displayId: 1, x: 300, y: 400, selection });
    expect(h.windows[0].setIgnoreMouseEvents).toHaveBeenLastCalledWith(true);
    expect(h.windows[0].setFocusable).toHaveBeenLastCalledWith(false);
    expect(sent(0).at(-1)?.[0]).toBe('selection:cancel');
  });

  it('does not open a stale picker after a newer question, including across displays', () => {
    const old = question(), current = question(1);
    ready(old); ready(current, 0);
    expect(sent(0).some(([ch]) => ch === 'selection:show')).toBe(false);
    ready(current, 1);
    expect(sent(1).at(-1)?.[0]).toBe('selection:show');
  });

  it('cancel and invalid rectangles never send a question to AI', () => {
    const shared = vi.fn(); mgr.on('shared', shared);
    const requestId = question(); ready(requestId);
    for (const selection of [{ x: -1, y: 0, width: 20, height: 20 }, { x: 1900, y: 0, width: 200, height: 200 }, { x: 0, y: 0, width: NaN, height: 20 }, { x: 0, y: 0, width: 0, height: 20 }]) result(requestId, selection);
    expect(shared).not.toHaveBeenCalled();
    result(requestId, null);
    expect(h.windows[0].setIgnoreMouseEvents).toHaveBeenLastCalledWith(true);
    expect(h.windows[0].setFocusable).toHaveBeenLastCalledWith(false);
    ready(requestId); result(requestId, { x: 0, y: 0, width: 20, height: 20 });
    expect(shared).not.toHaveBeenCalled();
  });

  it('routes click-bound questions through selection, while previews remain ordinary pings', () => {
    mgr.updateSettings(overlaySettings({ ...DEFAULT_SETTINGS, clickPingId: 'missing' }));
    const shared = vi.fn(); mgr.on('shared', shared);
    mgr.handle({ type: 'click', x: 120, y: 150, wheel: 'ping' });
    expect(sent(0)[0][0]).toBe('selection:prepare');
    expect(shared).not.toHaveBeenCalled();
    mgr.previewPing('missing');
    expect(sent(0).at(-1)?.[0]).toBe('ping:spawn');
  });
});

describe('Agent reply queue', () => {
  const reply = (displayId: number, id: 'missing' | 'omw' = 'missing') => ({ displayId, id, x: 20, y: 30, tag: { name: 'AI', color: 4 } });
  const loaded = (i: number) => (h.windows[i].webContents as unknown as { emit: (name: string) => void }).emit('did-finish-load');
  const ended = (i: number, requestId: number) => h.handlers.get('overlay:agent-ping-ended')!({ sender: h.windows[i].webContents }, requestId);
  it('serializes a burst across displays and ignores stale/wrong-display acknowledgements', () => {
    loaded(0); loaded(1);
    mgr.spawnAgent(reply(1)); mgr.spawnAgent(reply(2, 'omw')); mgr.spawnAgent(reply(1));
    expect(sent(0)).toHaveLength(1); expect(sent(1)).toHaveLength(0);
    const first = (sent(0)[0][1] as { requestId: number }).requestId;
    ended(1, first); ended(0, first + 50);
    expect(sent(1)).toHaveLength(0);
    ended(0, first);
    expect(sent(1)[0][0]).toBe('agent:ping');
    ended(0, first); expect(sent(0)).toHaveLength(1);
    ended(1, (sent(1)[0][1] as { requestId: number }).requestId);
    expect(sent(0)).toHaveLength(2);
  });
  it('waits for renderer readiness and does not queue the user or preview pings', () => {
    mgr.spawnAgent(reply(1)); expect(sent(0)).toHaveLength(0);
    loaded(0); expect(sent(0)[0][0]).toBe('agent:ping');
    mgr.previewPing('danger'); expect(sent(0)[1][0]).toBe('ping:spawn');
  });
  it('skips removed displays rather than stranding later replies', () => {
    loaded(0); mgr.spawnAgent(reply(99)); mgr.spawnAgent(reply(1));
    expect(sent(0)).toHaveLength(1);
  });
});
