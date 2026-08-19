'use strict';
const { app, BrowserWindow, Tray, Menu, nativeImage, nativeTheme, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const store = require('./store');
const keyboard = require('./keyboard');
const { initUpdater } = require('./updater');

const APP_ROOT = app.getAppPath();
const ASSETS = path.join(APP_ROOT, 'assets');
const BUNDLED_SOUND_DIR = path.join(ASSETS, 'sounds', 'bundled');
const USER_SOUND_DIR = path.join(app.getPath('userData'), 'sounds');

let mainWindow = null;
let tray = null;
let updater = null;
let isQuiting = false;
let settingsCache = store.getSettings();

fs.mkdirSync(USER_SOUND_DIR, { recursive: true });

// ---- single instance ----
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
  app.whenReady().then(onReady);
}

function onReady() {
  applyTheme(settingsCache.theme);
  createWindow();
  createTray();
  startHook();
  applyLoginItem(settingsCache.launchAtLogin);
  updater = initUpdater(() => mainWindow);
  registerIpc();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else showWindow();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 940,
    height: 660,
    minWidth: 820,
    minHeight: 560,
    show: false,
    backgroundColor: '#14161c',
    title: 'Keyclack',
    icon: path.join(ASSETS, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // keep audio responsive while hidden
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Close = hide to tray, keep the hook + audio engine alive.
  mainWindow.on('close', (e) => {
    if (!isQuiting && settingsCache.minimizeToTray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Open external links in the browser, not inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function showWindow() {
  if (!mainWindow) return createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

// ---- tray ----
function trayImage(active) {
  const file = active ? 'tray-active.png' : 'tray-idle.png';
  const img = nativeImage.createFromPath(path.join(ASSETS, 'icons', file));
  if (process.platform === 'darwin') img.setTemplateImage(false);
  return img;
}

function createTray() {
  tray = new Tray(trayImage(settingsCache.enabled));
  tray.setToolTip('Keyclack');
  refreshTrayMenu();
  tray.on('click', () => showWindow());
}

function refreshTrayMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: settingsCache.enabled ? 'Sound: On' : 'Sound: Off',
      type: 'checkbox',
      checked: settingsCache.enabled,
      click: () => toggleEnabled(),
    },
    { type: 'separator' },
    { label: 'Open Keyclack', click: () => showWindow() },
    { label: 'Check for Updates', click: () => updater && updater.check() },
    { type: 'separator' },
    { label: 'Quit Keyclack', click: () => { isQuiting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
  tray.setImage(trayImage(settingsCache.enabled));
  tray.setToolTip(settingsCache.enabled ? 'Keyclack — on' : 'Keyclack — off');
}

function toggleEnabled() {
  settingsCache = store.setSetting('enabled', !settingsCache.enabled);
  refreshTrayMenu();
  broadcastSettings();
}

// ---- global hook ----
function startHook() {
  keyboard.start(
    (evt) => {
      if (evt.type === 'down') {
        store.recordKeystroke(evt.keycode); // stats accumulate in main
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('key:event', evt); // renderer plays sound / typing test
      }
    },
    () => settingsCache
  );
}

// ---- side effects ----
function applyTheme(theme) {
  nativeTheme.themeSource = theme === 'light' || theme === 'dark' ? theme : 'system';
}

function applyLoginItem(enabled) {
  try {
    app.setLoginItemSettings({ openAtLogin: !!enabled });
  } catch (err) {
    console.warn('[main] setLoginItemSettings failed:', err && err.message);
  }
}

function broadcastSettings() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings:changed', settingsCache);
  }
}

// ---- sound packs ----
function listPacks() {
  const custom = store.getCustomPacks().map((p) => ({
    id: p.id,
    name: p.name,
    builtin: false,
    press: p.press,
    release: p.release || null,
  }));
  return [
    {
      id: 'default',
      name: 'Default',
      builtin: true,
      press: path.join(BUNDLED_SOUND_DIR, 'default.wav'),
      release: null,
    },
    ...custom,
  ];
}

async function importPack() {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose a sound file',
    filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg', 'flac', 'm4a', 'aac'] }],
    properties: ['openFile'],
  });
  if (res.canceled || !res.filePaths.length) return null;

  const src = res.filePaths[0];
  const id = 'pack_' + crypto.randomBytes(4).toString('hex');
  const dir = path.join(USER_SOUND_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(src) || '.wav';
  const dest = path.join(dir, 'press' + ext);
  fs.copyFileSync(src, dest);

  const name = path.basename(src, path.extname(src)).slice(0, 40) || 'Custom';
  const packs = store.getCustomPacks();
  const pack = { id, name, press: dest, release: null };
  store.setCustomPacks(packs.concat(pack));
  return pack;
}

function deletePack(id) {
  const packs = store.getCustomPacks();
  const pack = packs.find((p) => p.id === id);
  if (pack) {
    try { fs.rmSync(path.join(USER_SOUND_DIR, id), { recursive: true, force: true }); } catch (_) {}
  }
  const remaining = packs.filter((p) => p.id !== id);
  store.setCustomPacks(remaining);
  if (settingsCache.soundPack === id) {
    settingsCache = store.setSetting('soundPack', 'default');
    broadcastSettings();
  }
  return listPacks();
}

// ---- IPC ----
function registerIpc() {
  ipcMain.handle('settings:get', () => settingsCache);

  ipcMain.handle('settings:set', (_e, { key, value }) => {
    settingsCache = store.setSetting(key, value);
    if (key === 'theme') applyTheme(value);
    if (key === 'launchAtLogin') applyLoginItem(value);
    if (key === 'enabled') refreshTrayMenu();
    return settingsCache;
  });

  ipcMain.handle('stats:get', () => store.getStats());
  ipcMain.handle('stats:reset', () => store.resetStats());
  ipcMain.handle('stats:recordTest', (_e, result) => store.recordTypingTest(result));

  ipcMain.handle('packs:list', () => listPacks());
  ipcMain.handle('pack:import', () => importPack());
  ipcMain.handle('pack:delete', (_e, id) => deletePack(id));

  ipcMain.handle('sound:read', (_e, filePath) => {
    try {
      return fs.readFileSync(filePath); // Buffer -> Uint8Array in renderer
    } catch (err) {
      console.error('[main] sound:read failed', filePath, err && err.message);
      return null;
    }
  });

  ipcMain.handle('theme:effective', () => (nativeTheme.shouldUseDarkColors ? 'dark' : 'light'));

  ipcMain.handle('update:check', () => updater && updater.check());
  ipcMain.handle('update:install', () => updater && updater.quitAndInstall());

  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('window:hide', () => mainWindow && mainWindow.hide());
  ipcMain.handle('app:quit', () => { isQuiting = true; app.quit(); });
}

// Keep running in tray; only quit via tray/menu.
app.on('window-all-closed', (e) => {
  // do not quit — we live in the tray
});

app.on('before-quit', () => { isQuiting = true; keyboard.stop(); });
