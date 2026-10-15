import { BrowserWindow, ipcMain, screen, type Rectangle } from 'electron';
import { REPLY_CH, replyState, type ReplySettings } from '../shared/reply';
import { loadPage, pageUrl, preloadPath } from './paths';

interface SavedReplySettings extends ReplySettings { bounds?: Rectangle }
interface ReplyWindowOptions {
  store: { read(name: string, fallback: unknown): Promise<any>; write(name: string, value: unknown): Promise<void> };
  status(): unknown;
  stop(): Promise<void>;
  openSettings(): unknown;
  registerCaptureWindow(window: BrowserWindow): () => void;
  onSettingsChange(): void;
}

export function fitReplyBounds(bounds: Partial<Rectangle> | undefined, workArea: Rectangle): Rectangle {
  const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
  const width = Math.min(workArea.width, Math.max(320, Math.min(1200, finite(bounds?.width) ? bounds.width : 420)));
  const height = Math.min(workArea.height, Math.max(220, Math.min(1200, finite(bounds?.height) ? bounds.height : 380)));
  return {
    width: Math.round(width), height: Math.round(height),
    x: Math.round(Math.max(workArea.x, Math.min(workArea.x + workArea.width - width, finite(bounds?.x) ? bounds.x : workArea.x + workArea.width - width - 24))),
    y: Math.round(Math.max(workArea.y, Math.min(workArea.y + workArea.height - height, finite(bounds?.y) ? bounds.y : workArea.y + workArea.height - height - 24))),
  };
}

export async function createReplyWindow(options: ReplyWindowOptions) {
  const saved = await options.store.read('ai-reply-window', {});
  const settings: SavedReplySettings = { enabled: saved?.enabled !== false, alwaysOnTop: saved?.alwaysOnTop !== false };
  const savedBounds = saved?.bounds;
  const hasBounds = savedBounds && ['x', 'y', 'width', 'height'].every(key => Number.isFinite(savedBounds[key]));
  const display = hasBounds ? screen.getDisplayMatching(savedBounds) : screen.getPrimaryDisplay();
  settings.bounds = fitReplyBounds(hasBounds ? savedBounds : undefined, display.workArea);
  let closed = false;
  let ready = false;
  let showWhenReady = false;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const window = new BrowserWindow({
    ...settings.bounds, minWidth: 320, minHeight: 220, title: 'AI 队友回复',
    show: false, frame: false, resizable: true, alwaysOnTop: settings.alwaysOnTop,
    backgroundColor: '#141c2b',
    webPreferences: { preload: preloadPath('reply'), nodeIntegration: false, contextIsolation: true, sandbox: true, spellcheck: false, backgroundThrottling: false },
  });
  window.removeMenu();
  // A hidden frameless window on Windows may ignore the constructor's pin flag,
  // and capture hide/show cycles can reset its native z-order. Reapply the user's
  // current choice whenever it is shown, including restoration by the capturer.
  const applyPin = () => {
    if (!closed && !window.isDestroyed() && window.isAlwaysOnTop() !== settings.alwaysOnTop) {
      const level = settings.alwaysOnTop ? process.platform === 'win32' ? 'screen-saver' : 'floating' : 'normal';
      window.setAlwaysOnTop(settings.alwaysOnTop, level);
    }
  };
  applyPin();
  window.on('show', applyPin);
  const unregisterCapture = options.registerCaptureWindow(window);
  const snapshot = () => replyState(options.status(), settings);
  const publish = () => { if (!closed && ready && !window.isDestroyed()) window.webContents.send(REPLY_CH.changed, snapshot()); };
  const save = () => options.store.write('ai-reply-window', settings);
  const persistBounds = () => {
    if (closed) return;
    settings.bounds = window.getBounds();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = undefined; void save().catch(error => console.warn('[reply-window] could not save bounds', error)); }, 250);
  };
  const show = () => {
    if (closed) return;
    showWhenReady = true;
    publish();
    if (ready) { if (window.isMinimized()) window.restore(); window.showInactive(); applyPin(); }
  };
  const hide = () => { showWhenReady = false; if (!window.isDestroyed()) window.hide(); };
  const configure = async (patch: Partial<ReplySettings>) => {
    if (typeof patch.enabled === 'boolean') settings.enabled = patch.enabled;
    if (typeof patch.alwaysOnTop === 'boolean') { settings.alwaysOnTop = patch.alwaysOnTop; applyPin(); }
    if (!settings.enabled) hide();
    await save(); publish(); options.onSettingsChange();
  };
  window.on('move', persistBounds);
  window.on('resize', persistBounds);
  window.on('close', event => { if (!closed) { event.preventDefault(); hide(); } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => {
    try {
      const target = new URL(event.url), own = new URL(pageUrl('reply'));
      if (target.protocol === own.protocol && target.host === own.host && target.pathname === own.pathname) return;
    } catch { /* Invalid URLs are also blocked. */ }
    event.preventDefault();
  });
  window.once('ready-to-show', () => { ready = true; publish(); if (showWhenReady && settings.enabled) show(); });
  ipcMain.handle(REPLY_CH.call, async (event, method: string, argument: unknown) => {
    if (closed || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Unauthorized reply sender');
    switch (method) {
      case 'status': return snapshot();
      case 'stop': await options.stop(); return;
      case 'hide': hide(); return;
      case 'settings': options.openSettings(); return;
      case 'pin': if (typeof argument !== 'boolean') throw new Error('Invalid pin state'); await configure({ alwaysOnTop: argument }); return;
      default: throw new Error('Unknown reply operation');
    }
  });
  void loadPage(window, 'reply').catch(error => console.warn('[reply-window] could not load page', error));
  return {
    publish,
    getSettings: (): ReplySettings => ({ enabled: settings.enabled, alwaysOnTop: settings.alwaysOnTop }),
    configure,
    onSignal: () => { if (settings.enabled) show(); },
    show: async () => { if (!settings.enabled) await configure({ enabled: true }); show(); },
    close: async () => {
      if (closed) return;
      closed = true; clearTimeout(saveTimer); unregisterCapture(); ipcMain.removeHandler(REPLY_CH.call);
      if (!window.isDestroyed()) { settings.bounds = window.getBounds(); window.destroy(); }
      await save();
    },
  };
}
