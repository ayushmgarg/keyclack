'use strict';
/* Renderer controller: nav, settings binding, sound engine, live stats. */
(function () {
  const api = window.keyclack;
  let settings = null;
  let packs = [];
  let stats = null;
  let sessionCount = 0;
  let currentView = 'home';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // ---- theme ----
  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    $$('#theme-seg button').forEach((b) => b.classList.toggle('on', b.dataset.themeChoice === theme));
  }

  // ---- nav ----
  function switchView(view) {
    currentView = view;
    $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    $$('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === view));
    window.TypingTest.setActive(view === 'test');
    if (view === 'stats') refreshStats();
  }

  // ---- power / enabled ----
  function reflectEnabled() {
    const on = settings.enabled;
    $('#power').classList.toggle('on', on);
    $('#power-title').textContent = on ? 'Sound On' : 'Sound Off';
    $('#power-sub').textContent = on ? 'Every keystroke clicks system-wide.' : 'Click to start hearing your keystrokes.';
    const pill = $('#side-status');
    pill.textContent = on ? 'On' : 'Off';
    pill.classList.toggle('on', on);
    pill.classList.toggle('off', !on);
    window.SoundEngine.setEnabled(on);
  }

  async function setSetting(key, value) {
    settings = await api.setSetting(key, value);
    applySettingsToEngine();
  }

  function applySettingsToEngine() {
    window.SoundEngine.setEnabled(settings.enabled);
    window.SoundEngine.setVolume(settings.volume);
    window.SoundEngine.setPlayRelease(settings.playOnRelease);
  }

  // ---- packs ----
  async function loadPacks() {
    packs = await api.listPacks();
    renderPackList();
    const active = packs.find((p) => p.id === settings.soundPack) || packs[0];
    $('#home-pack').textContent = active ? active.name : 'Default';
    if (active) await window.SoundEngine.loadPack(active);
  }

  function renderPackList() {
    const host = $('#pack-list');
    host.innerHTML = packs.map((p) => `
      <div class="pack ${p.id === settings.soundPack ? 'active' : ''}" data-id="${p.id}">
        <div class="pack-info">
          <b>${escapeHtml(p.name)}</b>
          <span class="muted">${p.builtin ? 'Built-in' : 'Custom'}</span>
        </div>
        <div class="pack-actions">
          <button class="btn tiny" data-play="${p.id}">▶</button>
          ${p.builtin ? '' : `<button class="btn tiny danger" data-del="${p.id}">✕</button>`}
          <button class="btn tiny primary" data-use="${p.id}">${p.id === settings.soundPack ? '✓ Active' : 'Use'}</button>
        </div>
      </div>`).join('');

    host.querySelectorAll('[data-use]').forEach((b) => b.addEventListener('click', async () => {
      await setSetting('soundPack', b.dataset.use);
      await loadPacks();
      renderPackList();
    }));
    host.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', async () => {
      const p = packs.find((x) => x.id === b.dataset.play);
      if (p) { await window.SoundEngine.loadPack(p); window.SoundEngine.test(); await loadPacks(); }
    }));
    host.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      packs = await api.deletePack(b.dataset.del);
      settings = await api.getSettings();
      await loadPacks();
      renderPackList();
      toast('Sound removed');
    }));
  }

  // ---- stats ----
  async function refreshStats() {
    stats = await api.getStats();
    window.StatsView.render($('#stats-body'), stats, sessionCount);
  }

  // ---- key events (global hook) ----
  function onKey(evt) {
    if (evt.type === 'down') {
      window.SoundEngine.down();
      sessionCount++;
      const hs = $('#home-session');
      if (hs) hs.textContent = sessionCount.toLocaleString();
    } else {
      window.SoundEngine.up();
    }
  }

  // ---- updates ----
  function onUpdate(status) {
    const el = $('#update-status');
    const install = $('#install-update');
    if (!el) return;
    install.hidden = true;
    switch (status.state) {
      case 'checking': el.textContent = 'Checking for updates…'; break;
      case 'available': el.textContent = 'Downloading v' + status.version + '…'; break;
      case 'downloading': el.textContent = 'Downloading… ' + status.percent + '%'; break;
      case 'ready': el.textContent = 'Update v' + status.version + ' ready.'; install.hidden = false; toast('Update ready — restart to apply'); break;
      case 'none': el.textContent = 'Up to date.'; break;
      case 'error': el.textContent = 'Update check failed.'; break;
      default: el.textContent = '';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---- wire UI ----
  function wire() {
    $$('.nav-item').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));
    $$('[data-goto]').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.goto)));

    $('#power').addEventListener('click', async () => { await setSetting('enabled', !settings.enabled); reflectEnabled(); });

    const vol = $('#volume');
    vol.addEventListener('input', () => { $('#vol-val').textContent = vol.value + '%'; window.SoundEngine.setVolume(parseInt(vol.value, 10)); });
    vol.addEventListener('change', () => setSetting('volume', parseInt(vol.value, 10)));

    $('#test-sound').addEventListener('click', () => window.SoundEngine.test());
    $('#import-sound').addEventListener('click', async () => {
      const pack = await api.importPack();
      if (pack) { await setSetting('soundPack', pack.id); await loadPacks(); renderPackList(); toast('Added "' + pack.name + '"'); }
    });

    $('#play-release').addEventListener('change', (e) => setSetting('playOnRelease', e.target.checked));
    $('#hold-repeat').addEventListener('change', (e) => setSetting('holdToRepeat', e.target.checked));
    $('#modifier-keys').addEventListener('change', (e) => setSetting('modifierKeys', e.target.checked));
    $('#launch-login').addEventListener('change', (e) => setSetting('launchAtLogin', e.target.checked));
    $('#minimize-tray').addEventListener('change', (e) => setSetting('minimizeToTray', e.target.checked));

    $$('#theme-seg button').forEach((b) => b.addEventListener('click', async () => {
      await setSetting('theme', b.dataset.themeChoice); applyTheme(b.dataset.themeChoice);
    }));

    $('#reset-stats').addEventListener('click', async () => {
      stats = await api.resetStats(); sessionCount = 0; refreshStats(); toast('Stats reset');
    });

    $('#check-update').addEventListener('click', () => { api.checkForUpdates(); $('#update-status').textContent = 'Checking…'; });
    $('#install-update').addEventListener('click', () => api.installUpdate());
    $('#quit-app').addEventListener('click', () => api.quit());
  }

  function bindSettingsToUI() {
    $('#volume').value = settings.volume;
    $('#vol-val').textContent = settings.volume + '%';
    $('#play-release').checked = settings.playOnRelease;
    $('#hold-repeat').checked = settings.holdToRepeat;
    $('#modifier-keys').checked = settings.modifierKeys;
    $('#launch-login').checked = settings.launchAtLogin;
    $('#minimize-tray').checked = settings.minimizeToTray;
    applyTheme(settings.theme);
    reflectEnabled();
  }

  async function init() {
    settings = await api.getSettings();
    const version = await api.getVersion();
    $('#side-version').textContent = 'v' + version;
    $('#settings-version').textContent = 'v' + version;

    window.SoundEngine.init();
    applySettingsToEngine();
    bindSettingsToUI();
    wire();

    window.TypingTest.mount($('#typing-test'), {
      onFinish: async (result) => { await api.recordTest(result); if (currentView === 'stats') refreshStats(); },
    });

    await loadPacks();
    await refreshStats();

    api.onKeyEvent(onKey);
    api.onSettingsChanged((s) => { settings = s; bindSettingsToUI(); renderPackList(); });
    api.onUpdateStatus(onUpdate);

    // resume audio on first interaction (autoplay policy safety)
    const resume = () => { window.SoundEngine.init(); window.removeEventListener('pointerdown', resume); };
    window.addEventListener('pointerdown', resume);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
