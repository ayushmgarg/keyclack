'use strict';
const Store = require('electron-store');

/**
 * Local persistence — plain JSON on disk (electron-store), no database.
 * Two logical sections live in one file: `settings` and `stats`.
 */

const defaults = {
  settings: {
    enabled: true,
    volume: 60,            // 10..100
    holdToRepeat: false,   // false = one sound per physical press (suppress OS auto-repeat)
    modifierKeys: true,    // play for Shift/Ctrl/Alt/Meta too
    playOnRelease: false,  // also play a (quieter) sound on key release
    launchAtLogin: false,
    theme: 'system',       // 'system' | 'light' | 'dark'
    soundPack: 'default',  // id of active pack
    minimizeToTray: true,
    lastMuteUntil: 0,
  },
  stats: {
    installedAt: 0,
    totalKeystrokes: 0,
    perKey: {},            // keycode -> count
    daily: {},             // 'YYYY-MM-DD' -> count
    typingTests: [],       // { mode, wpm, raw, accuracy, consistency, at }
    bestWpm: 0,
  },
  // user-imported sound packs: { id, name, press, release|null }
  customPacks: [],
};

const store = new Store({ defaults, name: 'keyclack' });

if (!store.get('stats.installedAt')) {
  store.set('stats.installedAt', Date.now());
}

function getSettings() {
  return store.get('settings');
}

function setSetting(key, value) {
  store.set('settings.' + key, value);
  return store.get('settings');
}

function getStats() {
  return store.get('stats');
}

function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** Record a single fired keystroke (called from the global hook path). */
function recordKeystroke(keycode) {
  const stats = store.get('stats');
  stats.totalKeystrokes += 1;
  const k = String(keycode);
  stats.perKey[k] = (stats.perKey[k] || 0) + 1;
  const day = todayKey();
  stats.daily[day] = (stats.daily[day] || 0) + 1;
  store.set('stats', stats);
}

function recordTypingTest(result) {
  const stats = store.get('stats');
  const entry = Object.assign({ at: Date.now() }, result);
  stats.typingTests = (stats.typingTests || []).concat(entry).slice(-100); // keep last 100
  if ((result.wpm || 0) > (stats.bestWpm || 0)) stats.bestWpm = result.wpm;
  store.set('stats', stats);
  return stats;
}

function resetStats() {
  store.set('stats', Object.assign({}, defaults.stats, { installedAt: store.get('stats.installedAt') || Date.now() }));
  return store.get('stats');
}

function getCustomPacks() {
  return store.get('customPacks') || [];
}

function setCustomPacks(packs) {
  store.set('customPacks', packs);
  return packs;
}

module.exports = {
  store,
  getSettings,
  setSetting,
  getStats,
  recordKeystroke,
  recordTypingTest,
  resetStats,
  getCustomPacks,
  setCustomPacks,
  todayKey,
};
