import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { REPLY_CH, type ReplyApi, type ReplyState } from '../shared/reply';

const api: ReplyApi = {
  status: () => ipcRenderer.invoke(REPLY_CH.call, 'status'),
  stop: () => ipcRenderer.invoke(REPLY_CH.call, 'stop'),
  hide: () => ipcRenderer.invoke(REPLY_CH.call, 'hide'),
  openSettings: () => ipcRenderer.invoke(REPLY_CH.call, 'settings'),
  setAlwaysOnTop: on => ipcRenderer.invoke(REPLY_CH.call, 'pin', on),
  onChange: callback => {
    const handler = (_event: IpcRendererEvent, state: ReplyState) => callback(state);
    ipcRenderer.on(REPLY_CH.changed, handler);
    return () => ipcRenderer.removeListener(REPLY_CH.changed, handler);
  },
};
contextBridge.exposeInMainWorld('replyApi', api);
