import { contextBridge, ipcRenderer } from "electron";

import type { SkinAPI } from "../shared/api";
import { CHANNELS } from "../shared/channels";

const api: SkinAPI = {
  system: {
    inspect: () => ipcRenderer.invoke(CHANNELS.inspect),
    openSponsor: () => ipcRenderer.invoke(CHANNELS.systemOpenSponsor),
  },
  engine: {
    run: (request) => ipcRenderer.invoke(CHANNELS.engineRun, request),
    clearData: () => ipcRenderer.invoke(CHANNELS.engineClearData),
  },
  themes: {
    list: () => ipcRenderer.invoke(CHANNELS.themesList),
    active: () => ipcRenderer.invoke(CHANNELS.themesActive),
    chooseImage: () => ipcRenderer.invoke(CHANNELS.themesChooseImage),
    create: (input) => ipcRenderer.invoke(CHANNELS.themesCreate, input),
    update: (id, patch) => ipcRenderer.invoke(CHANNELS.themesUpdate, id, patch),
    duplicate: (id) => ipcRenderer.invoke(CHANNELS.themesDuplicate, id),
    select: (id) => ipcRenderer.invoke(CHANNELS.themesSelect, id),
    remove: (id) => ipcRenderer.invoke(CHANNELS.themesRemove, id),
    importPackage: () => ipcRenderer.invoke(CHANNELS.themesImport),
    exportPackage: (id) => ipcRenderer.invoke(CHANNELS.themesExport, id),
  },
  settings: {
    get: () => ipcRenderer.invoke(CHANNELS.settingsGet),
    update: (patch) => ipcRenderer.invoke(CHANNELS.settingsUpdate, patch),
  },
  logs: {
    reveal: () => ipcRenderer.invoke(CHANNELS.logsReveal),
  },
  onProgress(listener) {
    const wrapped = (_event: Electron.IpcRendererEvent, result: Parameters<typeof listener>[0]) =>
      listener(result);
    ipcRenderer.on(CHANNELS.progress, wrapped);
    return () => ipcRenderer.removeListener(CHANNELS.progress, wrapped);
  },
};

contextBridge.exposeInMainWorld("skinAPI", api);
