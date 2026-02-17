import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('smartpaste', {
  invoke: (channel: string, payload?: unknown) => ipcRenderer.invoke(channel, payload),
  on: (channel: string, listener: (event: Electron.IpcRendererEvent, payload: unknown) => void) =>
    ipcRenderer.on(channel, listener),
});
