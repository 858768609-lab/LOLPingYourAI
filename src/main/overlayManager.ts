import { BrowserWindow, ipcMain, screen, type Display, type WebContents } from 'electron';
import { EventEmitter } from 'node:events';
import { isEmoteRefShape, type EmoteArt, type EmoteRef } from '../shared/emotes';
import {
  AGENT_PING_ENDED, OVERLAY_ASSETS, OVERLAY_EMOTED, OVERLAY_PINGED, SELECTION_READY, SELECTION_RESULT,
  type OverlayChannel, type OverlayEvents, type PingTag, type ScreenshotSelection,
} from '../shared/ipc';
import { isPingId, type PingId } from '../shared/pings';
import type { HelperEvent, WheelKind } from '../shared/protocol';
import type { OverlaySettings } from '../shared/settings';
import { physicalToLocal, type DisplayMap } from './coords';
import { numberDisplays, type NumberedDisplay } from './displayNumbers';
import { IS_MAC, loadPage, preloadPath } from './paths';

/** A ping the user just placed, in overlay-local CSS px: the room shares these. */
export interface SharedPing {
  id: PingId;
  displayId: number;
  x: number;
  y: number;
  selection?: ScreenshotSelection;
}

/** An emote the user just placed, in overlay-local CSS px: the room shares these. */
export interface SharedEmote {
  ref: EmoteRef;
  displayId: number;
  x: number;
  y: number;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * One transparent, click-through, always-on-top window per display.
 * Emits 'shared' (SharedPing) for every wheel or trigger+click ping and 'sharedEmote' (SharedEmote) for every wheel or
 * trigger+click emote, never for settings previews.
 */
export class OverlayManager extends EventEmitter {
  readonly missingAssets = new Set<string>();
  private readonly windows = new Map<number, BrowserWindow>();
  private maps: DisplayMap[] = [];
  private numberedList: NumberedDisplay[] = [];
  private wheelDisplay: number | null = null;
  private wheelKind: WheelKind = 'ping';
  private agentQueue: Array<SharedPing & { tag: PingTag; requestId: number }> = [];
  private agentActive: (SharedPing & { tag: PingTag; requestId: number }) | null = null;
  private agentSequence = 0;
  private ready = new Set<number>();
  private selectionSequence = 0;
  private selectionActive: (SharedPing & { requestId: number; selecting: boolean }) | null = null;
  private readonly captureWindows = new Set<BrowserWindow>();

  /** `resolveArt` says what an emote looks like: `remote` is true for a room member's, whose files may be missing here. */
  constructor(private settings: OverlaySettings, private readonly resolveArt: (ref: EmoteRef, remote: boolean) => EmoteArt) {
    super();
  }

  start(): void {
    ipcMain.on(SELECTION_READY, (event, requestId: unknown) => {
      const active = this.selectionActive;
      if (!active || active.requestId !== requestId || active.selecting || this.displayOf(event.sender) !== active.displayId) return;
      const win = this.windows.get(active.displayId);
      if (!win || win.isDestroyed()) { this.cancelSelection(); return; }
      active.selecting = true;
      win.setFocusable(true);
      win.setIgnoreMouseEvents(false);
      win.show(); win.focus();
      this.send(active.displayId, 'selection:show', { x: active.x, y: active.y, requestId: active.requestId, size: 512 });
    });
    ipcMain.on(SELECTION_RESULT, (event, raw: unknown) => {
      const p = raw as { requestId?: unknown; selection?: unknown } | null;
      const active = this.selectionActive;
      if (!p || !active || !active.selecting || p.requestId !== active.requestId || this.displayOf(event.sender) !== active.displayId) return;
      if (p.selection === null) { this.cancelSelection(); return; }
      const r = p.selection as Partial<ScreenshotSelection> | null;
      const bounds = this.maps.find(d => d.id === active.displayId)?.dip;
      if (!r || !bounds || !isNum(r.x) || !isNum(r.y) || !isNum(r.width) || !isNum(r.height)
        || r.x < 0 || r.y < 0 || r.width < 1 || r.height < 1
        || r.x + r.width > bounds.width || r.y + r.height > bounds.height) return;
      const selection: ScreenshotSelection = { x: r.x, y: r.y, width: r.width, height: r.height };
      this.cancelSelection();
      this.emit('shared', { id: active.id, displayId: active.displayId, x: active.x, y: active.y, selection } satisfies SharedPing);
    });
    ipcMain.on(AGENT_PING_ENDED, (event, requestId: unknown) => {
      if (!this.agentActive || requestId !== this.agentActive.requestId || this.displayOf(event.sender) !== this.agentActive.displayId) return;
      this.agentActive = null;
      this.pumpAgentQueue();
    });
    ipcMain.on(OVERLAY_ASSETS, (_event, missing: unknown) => {
      if (!Array.isArray(missing)) return;
      for (const m of missing) if (typeof m === 'string') this.missingAssets.add(m);
    });
    ipcMain.on(OVERLAY_PINGED, (event, raw: unknown) => {
      const p = raw as { id?: unknown; x?: unknown; y?: unknown } | null;
      if (!p || !isPingId(p.id) || !isNum(p.x) || !isNum(p.y)) return;
      const displayId = this.displayOf(event.sender);
      if (displayId !== undefined) {
        const ping = { id: p.id, displayId, x: p.x, y: p.y };
        if (p.id === 'missing') this.prepareSelection(ping);
        else this.emit('shared', ping satisfies SharedPing);
      }
    });
    ipcMain.on(OVERLAY_EMOTED, (event, raw: unknown) => {
      const p = raw as { ref?: unknown; x?: unknown; y?: unknown } | null;
      if (!p || !isEmoteRefShape(p.ref) || !isNum(p.x) || !isNum(p.y)) return;
      const displayId = this.displayOf(event.sender);
      if (displayId === undefined) return;
      this.emit('sharedEmote', { ref: p.ref, displayId, x: p.x, y: p.y } satisfies SharedEmote);
      // The wheel's own overlay already shows it. Another display may still hold an earlier one of ours.
      this.clearElsewhere(displayId, 'self');
    });
    this.rebuild();
    screen.on('display-added', () => this.rebuild());
    screen.on('display-removed', () => this.rebuild());
    screen.on('display-metrics-changed', () => this.rebuild());
  }

  updateSettings(s: OverlaySettings): void {
    this.settings = s;
    for (const id of this.windows.keys()) this.send(id, 'overlay:settings', s);
  }

  handle(ev: HelperEvent): void {
    switch (ev.type) {
      case 'wheelOpen': {
        this.cancelSelection();
        const p = physicalToLocal(ev.x, ev.y, this.maps);
        if (!p) return;
        this.wheelDisplay = p.displayId;
        this.wheelKind = ev.wheel;
        this.send(p.displayId, 'wheel:open', { x: p.x, y: p.y, wheel: ev.wheel });
        break;
      }
      case 'wheelMove':
      case 'wheelRelease': {
        if (this.wheelDisplay === null) return;
        const p = physicalToLocal(ev.x, ev.y, this.maps, this.wheelDisplay);
        if (!p) return;
        this.send(p.displayId, ev.type === 'wheelMove' ? 'wheel:move' : 'wheel:release', { x: p.x, y: p.y, wheel: this.wheelKind });
        if (ev.type === 'wheelRelease') this.wheelDisplay = null;
        break;
      }
      case 'click': {
        const p = physicalToLocal(ev.x, ev.y, this.maps);
        if (!p) break;
        if (ev.wheel === 'emote') {
          const ref = this.settings.clickEmoteId;
          this.send(p.displayId, 'emote:spawn', { owner: 'self', art: this.resolveArt(ref, false), x: p.x, y: p.y });
          this.clearElsewhere(p.displayId, 'self');
          this.emit('sharedEmote', { ref, displayId: p.displayId, x: p.x, y: p.y } satisfies SharedEmote);
          break;
        }
        const ping = { id: this.settings.clickPingId, displayId: p.displayId, x: p.x, y: p.y };
        if (ping.id === 'missing') this.prepareSelection(ping);
        else {
          this.send(p.displayId, 'ping:spawn', { id: ping.id, x: p.x, y: p.y });
          this.emit('shared', ping satisfies SharedPing);
        }
        break;
      }
      case 'cancel':
        this.cancelWheel();
        this.cancelSelection();
        break;
      default:
        break;
    }
  }

  previewPing(id: PingId): void {
    const d = screen.getPrimaryDisplay();
    this.send(d.id, 'ping:spawn', { id, x: d.bounds.width / 2, y: d.bounds.height / 2 });
  }

  /** A room member's ping, already mapped onto one of our displays. */
  spawnRemote(p: { displayId: number; x: number; y: number; id: PingId; tag: PingTag }): void {
    this.send(p.displayId, 'ping:spawn', { id: p.id, x: p.x, y: p.y, tag: p.tag });
  }

  /** Agent replies enqueue immediately; one reply plays across all displays at a time. */
  spawnAgent(p: SharedPing & { tag: PingTag }): void {
    this.agentQueue.push({ ...p, requestId: ++this.agentSequence });
    this.pumpAgentQueue();
  }

  private pumpAgentQueue(): void {
    if (this.agentActive) return;
    while (this.agentQueue.length) {
      const next = this.agentQueue[0], win = this.windows.get(next.displayId);
      if (!win || win.isDestroyed()) { this.agentQueue.shift(); continue; }
      if (!this.ready.has(next.displayId)) return;
      this.agentActive = this.agentQueue.shift()!;
      const { displayId, ...payload } = this.agentActive;
      this.send(displayId, 'agent:ping', payload);
      return;
    }
  }

  /** Shows an emote in the middle of the main display, without sharing it (the settings page's preview). */
  previewEmote(ref: EmoteRef): void {
    const d = screen.getPrimaryDisplay();
    this.send(d.id, 'emote:spawn', { owner: 'preview', art: this.resolveArt(ref, false), x: d.bounds.width / 2, y: d.bounds.height / 2 });
  }

  /** A room member's emote, already mapped onto one of our displays. It replaces their earlier one, whichever display that was on. */
  spawnRemoteEmote(p: { displayId: number; x: number; y: number; ref: EmoteRef; peer: string; tag: PingTag }): void {
    this.send(p.displayId, 'emote:spawn', { owner: p.peer, art: this.resolveArt(p.ref, true), x: p.x, y: p.y, tag: p.tag });
    this.clearElsewhere(p.displayId, p.peer);
  }

  /** This machine's displays with their room numbers (#1 = primary). */
  numbered(): NumberedDisplay[] {
    return this.numberedList;
  }

  toast(title: string, body: string): void {
    this.send(screen.getPrimaryDisplay().id, 'toast:show', { title, body });
  }

  async captureWithoutOverlays<T>(capture: () => Promise<T>): Promise<T> {
    const visible = [...new Set([...this.windows.values(), ...this.captureWindows])].filter(w => !w.isDestroyed() && w.isVisible());
    for (const w of visible) w.hide();
    try {
      // Give the Windows compositor two 60 Hz frames to remove the overlay. Keep this
      // fallback short: the user's ping is hidden until the screenshot has arrived.
      // The longer macOS settle remains until that platform is measured separately.
      if (visible.length) await new Promise(resolve => setTimeout(resolve, IS_MAC ? 100 : 34));
      return await capture();
    } finally {
      for (const w of visible) if (!w.isDestroyed()) w.showInactive();
    }
  }

  /** Include an auxiliary app window in screen captures' hide/restore boundary. Ownership stays with its creator. */
  registerCaptureWindow(window: BrowserWindow): () => void {
    this.captureWindows.add(window);
    return () => { this.captureWindows.delete(window); };
  }

  destroy(): void {
    this.cancelSelection();
    this.captureWindows.clear();
    this.agentQueue = []; this.agentActive = null; this.ready.clear();
    for (const w of this.windows.values()) if (!w.isDestroyed()) w.destroy();
    this.windows.clear();
  }

  /** Dismisses a wheel that is on screen, if any. Also used when the helper stops: its cancel would never arrive. */
  cancelWheel(): void {
    if (this.wheelDisplay === null) return;
    this.send(this.wheelDisplay, 'wheel:cancel', null);
    this.wheelDisplay = null;
  }

  private prepareSelection(ping: SharedPing): void {
    this.cancelSelection();
    const requestId = ++this.selectionSequence;
    this.selectionActive = { ...ping, requestId, selecting: false };
    this.send(ping.displayId, 'selection:prepare', { x: ping.x, y: ping.y, requestId });
  }

  /** Cancels both the pending question animation and an already interactive region picker. */
  cancelSelection(): void {
    const active = this.selectionActive;
    if (!active) return;
    this.selectionActive = null;
    this.send(active.displayId, 'selection:cancel', null);
    const win = this.windows.get(active.displayId);
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(true);
      win.setFocusable(false);
    }
  }

  private displayOf(sender: WebContents): number | undefined {
    const win = BrowserWindow.fromWebContents(sender);
    return [...this.windows].find(([, w]) => w === win)?.[0];
  }

  /** Each owner has one emote on screen: clear theirs on every display but the one that just showed their new one. */
  private clearElsewhere(displayId: number, owner: string): void {
    for (const id of this.windows.keys()) if (id !== displayId) this.send(id, 'emote:clear', { owner });
  }

  private rebuild(): void {
    this.cancelSelection();
    this.cancelWheel();
    const displays = screen.getAllDisplays();
    // The macOS helper already reports points in Electron's DIP space; dipToScreenRect only exists on Windows.
    this.maps = displays.map((d) => IS_MAC
      ? { id: d.id, dip: d.bounds, phys: d.bounds, scale: 1 }
      : { id: d.id, dip: d.bounds, phys: screen.dipToScreenRect(null, d.bounds), scale: d.scaleFactor });
    this.numberedList = numberDisplays(displays, screen.getPrimaryDisplay().id);
    this.emit('displays', this.numberedList);
    for (const [id, win] of this.windows) {
      if (!displays.some((d) => d.id === id)) {
        win.destroy();
        this.windows.delete(id);
      }
    }
    for (const d of displays) {
      const win = this.windows.get(d.id);
      if (win) win.setBounds(d.bounds);
      else this.windows.set(d.id, this.createWindow(d));
    }
  }

  private createWindow(d: Display): BrowserWindow {
    const win = new BrowserWindow({
      ...d.bounds,
      transparent: true,
      backgroundColor: '#00000000',
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      focusable: false,
      skipTaskbar: true,
      hasShadow: false,
      alwaysOnTop: true,
      enableLargerThanScreen: true, // also stops macOS pushing the window below the menu bar
      show: false,
      type: IS_MAC ? 'panel' : 'toolbar', // a macOS panel can float over full-screen apps
      webPreferences: {
        preload: preloadPath('overlay'),
        backgroundThrottling: false,
        autoplayPolicy: 'no-user-gesture-required',
        spellcheck: false,
      },
    });
    win.setIgnoreMouseEvents(true);
    win.setAlwaysOnTop(true, 'screen-saver');
    if (IS_MAC) win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('overlay:settings', this.settings);
      this.ready.add(d.id);
      this.pumpAgentQueue();
    });
    win.on('closed', () => {
      if (this.selectionActive?.displayId === d.id) this.cancelSelection();
      this.ready.delete(d.id);
      this.agentQueue = this.agentQueue.filter(p => p.displayId !== d.id);
      if (this.agentActive?.displayId === d.id) this.agentActive = null;
      this.pumpAgentQueue();
    });
    // Destroying the renderer also ends its audio/visuals; do not strand the queue.
    win.webContents.on('render-process-gone', () => { if (!win.isDestroyed()) win.destroy(); });
    win.once('ready-to-show', () => {
      win.showInactive();
      win.setBounds(d.bounds); // re-apply: mixed-DPI setups can size the first frame wrong
    });
    void loadPage(win, 'overlay');
    return win;
  }

  private send<C extends OverlayChannel>(displayId: number, channel: C, payload: OverlayEvents[C]): void {
    const w = this.windows.get(displayId);
    if (w && !w.isDestroyed()) w.webContents.send(channel, payload);
  }
}
