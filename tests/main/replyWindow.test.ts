import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { windows, handlers } = vi.hoisted(() => ({ windows: [] as any[], handlers: new Map<string, (...args: any[]) => any>() }));
vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events');
  class Contents extends EventEmitter {
    mainFrame = {};
    send = vi.fn();
    setWindowOpenHandler = vi.fn();
  }
  class Window extends EventEmitter {
    webContents = new Contents();
    destroyed = false;
    visible = false;
    bounds: any;
    pinned: boolean;
    constructor(readonly options: any) { super(); this.bounds = { x: options.x, y: options.y, width: options.width, height: options.height }; this.pinned = false; windows.push(this); }
    removeMenu() {}
    isDestroyed() { return this.destroyed; }
    isMinimized() { return false; }
    restore() {}
    showInactive() { this.visible = true; this.pinned = false; this.emit('show'); }
    hide() { this.visible = false; }
    setAlwaysOnTop(value: boolean) { this.pinned = value; }
    isAlwaysOnTop() { return this.pinned; }
    getBounds() { return { ...this.bounds }; }
    destroy() { this.destroyed = true; this.emit('closed'); }
  }
  const display = { workArea: { x: 0, y: 0, width: 1920, height: 1040 } };
  return { BrowserWindow: Window, ipcMain: { handle: (name: string, fn: any) => handlers.set(name, fn), removeHandler: (name: string) => handlers.delete(name) }, screen: { getPrimaryDisplay: () => display, getDisplayMatching: () => display } };
});
vi.mock('../../src/main/paths', () => ({ loadPage: async () => {}, pageUrl: () => 'lolping://app/reply/index.html', preloadPath: () => 'reply.js' }));

import { createReplyWindow, fitReplyBounds } from '../../src/main/replyWindow';
import { REPLY_CH } from '../../src/shared/reply';

beforeEach(() => { windows.length = 0; handlers.clear(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });
const setup = async (saved = {}) => {
  const store = { read: vi.fn(async () => saved), write: vi.fn(async () => {}) };
  const unregister = vi.fn();
  const options = { store, status: () => ({ busy: false, response: '中文回答' }), stop: vi.fn(async () => {}), openSettings: vi.fn(), registerCaptureWindow: vi.fn(() => unregister), onSettingsChange: vi.fn() };
  const api = await createReplyWindow(options);
  const window = windows[0];
  window.emit('ready-to-show');
  return { api, window, options, unregister, event: { sender: window.webContents, senderFrame: window.webContents.mainFrame } };
};

describe('desktop reply window', () => {
  it('stays hidden initially, shows without focus on a signal, and closing only hides it', async () => {
    const { api, window } = await setup();
    expect(window.visible).toBe(false);
    api.onSignal(); expect(window.visible).toBe(true);
    const event = { preventDefault: vi.fn() }; window.emit('close', event);
    expect(event.preventDefault).toHaveBeenCalled(); expect(window.visible).toBe(false); expect(window.destroyed).toBe(false);
    api.onSignal(); expect(window.visible).toBe(true);
    await api.close(); expect(window.destroyed).toBe(true);
  });

  it('does not auto-show when disabled, but the explicit show action enables it', async () => {
    const { api, window, options } = await setup({ enabled: false });
    api.onSignal(); expect(window.visible).toBe(false);
    await api.show(); expect(window.visible).toBe(true);
    expect(api.getSettings().enabled).toBe(true);
    expect(options.store.write).toHaveBeenCalled();
    await api.configure({ enabled: false }); expect(window.visible).toBe(false);
    await api.close();
  });

  it('reapplies the chosen pin state after an external capture hide/show cycle', async () => {
    const { api, window } = await setup();
    expect(window.isAlwaysOnTop()).toBe(true);
    api.onSignal(); expect(window.isAlwaysOnTop()).toBe(true);
    window.hide(); window.showInactive(); expect(window.isAlwaysOnTop()).toBe(true);
    await api.configure({ alwaysOnTop: false });
    window.hide(); window.showInactive(); expect(window.isAlwaysOnTop()).toBe(false);
    api.onSignal(); expect(window.isAlwaysOnTop()).toBe(false);
    await api.close();
  });

  it('only accepts the reply main frame and exposes no configuration or approval operations', async () => {
    const { api, window, event, options } = await setup();
    const call = handlers.get(REPLY_CH.call)!;
    await expect(call({ sender: {}, senderFrame: {} }, 'status')).rejects.toThrow('Unauthorized');
    await expect(call({ sender: window.webContents, senderFrame: {} }, 'stop')).rejects.toThrow('Unauthorized');
    for (const method of ['config', 'approve', 'candidates', '__proto__']) await expect(call(event, method)).rejects.toThrow('Unknown');
    expect(options.stop).not.toHaveBeenCalled();
    await call(event, 'stop'); expect(options.stop).toHaveBeenCalledOnce();
    await expect(call(event, 'pin', 'yes')).rejects.toThrow('Invalid');
    await call(event, 'pin', false); expect(window.pinned).toBe(false);
    expect(api.getSettings().alwaysOnTop).toBe(false);
    await api.close(); expect(handlers.has(REPLY_CH.call)).toBe(false);
  });

  it('saves the last moved/resized bounds at close and unregisters capture handling', async () => {
    const { api, window, options, unregister } = await setup();
    window.bounds = { x: 200, y: 100, width: 500, height: 400 }; window.emit('move'); window.emit('resize');
    await api.close();
    expect(options.store.write).toHaveBeenLastCalledWith('ai-reply-window', { enabled: true, alwaysOnTop: true, bounds: window.bounds });
    expect(unregister).toHaveBeenCalledOnce();
    await vi.runAllTimersAsync();
    expect(options.store.write).toHaveBeenCalledTimes(1);
  });

  it('prevents navigation away from the reply page', async () => {
    const { api, window } = await setup();
    for (const url of ['https://example.com', 'lolping://app/settings/index.html', 'not a url']) {
      const event = { url, preventDefault: vi.fn() }; window.webContents.emit('will-navigate', event); expect(event.preventDefault).toHaveBeenCalled();
    }
    const reload = { url: 'lolping://app/reply/index.html#reply', preventDefault: vi.fn() }; window.webContents.emit('will-navigate', reload); expect(reload.preventDefault).not.toHaveBeenCalled();
    await api.close();
  });
});

describe('reply bounds', () => {
  it('recovers saved bounds outside a disconnected monitor', () => {
    expect(fitReplyBounds({ x: 5000, y: -5000, width: 500, height: 400 }, { x: 0, y: 0, width: 1920, height: 1040 })).toEqual({ x: 1420, y: 0, width: 500, height: 400 });
  });
  it('supports a negative-origin display and clamps excessive dimensions', () => {
    expect(fitReplyBounds({ x: -1600, y: 0, width: 5000, height: 5000 }, { x: -1280, y: 0, width: 1280, height: 720 })).toEqual({ x: -1280, y: 0, width: 1200, height: 720 });
  });
});
