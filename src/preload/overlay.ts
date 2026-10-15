import { contextBridge, ipcRenderer } from 'electron';
import type { EmoteRef } from '../shared/emotes';
import {
  AGENT_PING_ENDED, OVERLAY_ASSETS, OVERLAY_CHANNELS, OVERLAY_EMOTED, OVERLAY_PINGED, SELECTION_READY, SELECTION_RESULT,
  type OverlayChannel, type OverlayEvents, type ScreenshotSelection,
} from '../shared/ipc';
import type { PingId } from '../shared/pings';

const api = {
  selectionReady(requestId: number): void { ipcRenderer.send(SELECTION_READY, requestId); },
  selectionResult(requestId: number, selection: ScreenshotSelection | null): void { ipcRenderer.send(SELECTION_RESULT, { requestId, selection }); },
  agentPingEnded(requestId: number): void { ipcRenderer.send(AGENT_PING_ENDED, requestId); },
  on<C extends OverlayChannel>(channel: C, cb: (payload: OverlayEvents[C]) => void): void {
    if (!OVERLAY_CHANNELS.includes(channel)) throw new Error(`unknown overlay channel: ${channel}`);
    ipcRenderer.on(channel, (_event, payload: OverlayEvents[C]) => cb(payload));
  },
  reportMissingAssets(names: string[]): void {
    ipcRenderer.send(OVERLAY_ASSETS, names);
  },
  /** A wheel ping was placed here (CSS px in this overlay). */
  reportPing(id: PingId, x: number, y: number): void {
    ipcRenderer.send(OVERLAY_PINGED, { id, x, y });
  },
  /** A wheel emote was placed here (CSS px in this overlay). */
  reportEmote(ref: EmoteRef, x: number, y: number): void {
    ipcRenderer.send(OVERLAY_EMOTED, { ref, x, y });
  },
};

contextBridge.exposeInMainWorld('overlay', api);

export type OverlayApi = typeof api;
