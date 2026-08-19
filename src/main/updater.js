'use strict';
const { autoUpdater } = require('electron-updater');

/**
 * Silent-ish auto-update from GitHub Releases (feed configured in
 * electron-builder.yml -> publish). Checks on launch and then periodically.
 * Downloads in the background; tells the renderer when an update is ready so
 * the UI can offer "Restart to update".
 */

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

function initUpdater(getWindow) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const send = (channel, payload) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };

  autoUpdater.on('checking-for-update', () => send('update:status', { state: 'checking' }));
  autoUpdater.on('update-available', (info) => send('update:status', { state: 'available', version: info.version }));
  autoUpdater.on('update-not-available', () => send('update:status', { state: 'none' }));
  autoUpdater.on('download-progress', (p) => send('update:status', { state: 'downloading', percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', (info) => send('update:status', { state: 'ready', version: info.version }));
  autoUpdater.on('error', (err) => send('update:status', { state: 'error', message: String(err && err.message || err) }));

  const check = () => {
    autoUpdater.checkForUpdates().catch((err) => {
      // Common in dev (no publish feed / not packaged) — don't crash.
      console.warn('[updater] check failed:', err && err.message);
    });
  };

  // First check shortly after launch, then on an interval.
  setTimeout(check, 8000);
  setInterval(check, CHECK_INTERVAL_MS);

  return {
    check,
    quitAndInstall: () => autoUpdater.quitAndInstall(),
  };
}

module.exports = { initUpdater };
