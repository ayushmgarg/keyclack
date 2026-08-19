'use strict';
const { contextBridge, ipcRenderer } = require('electron');

/**
 * The only bridge between the sandboxed renderer and the main process.
 * Exposes a small, explicit API — no raw ipcRenderer, no Node in the page.
 */
contextBridge.exposeInMainWorld('keyclack', {
  // settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
  onSettingsChanged: (cb) => ipcRenderer.on('settings:changed', (_e, s) => cb(s)),

  // global key events (for sound + typing test)
  onKeyEvent: (cb) => ipcRenderer.on('key:event', (_e, evt) => cb(evt)),

  // stats
  getStats: () => ipcRenderer.invoke('stats:get'),
  resetStats: () => ipcRenderer.invoke('stats:reset'),
  recordTest: (result) => ipcRenderer.invoke('stats:recordTest', result),

  // sound packs
  listPacks: () => ipcRenderer.invoke('packs:list'),
  importPack: () => ipcRenderer.invoke('pack:import'),
  deletePack: (id) => ipcRenderer.invoke('pack:delete', id),
  readSound: (filePath) => ipcRenderer.invoke('sound:read', filePath),

  // theme
  effectiveTheme: () => ipcRenderer.invoke('theme:effective'),

  // updates
  onUpdateStatus: (cb) => ipcRenderer.on('update:status', (_e, s) => cb(s)),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),

  // app
  getVersion: () => ipcRenderer.invoke('app:version'),
  hideWindow: () => ipcRenderer.invoke('window:hide'),
  quit: () => ipcRenderer.invoke('app:quit'),
});
