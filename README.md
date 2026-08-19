<div align="center">

# ⌨️ Keyclack

**Hear every keystroke.** A lightweight desktop app that plays a sound on every
key you press, system-wide — with a live stats dashboard, a built-in typing
test, and fully customizable sounds.

Windows · macOS

</div>

---

> **Private by design.** Keyclack detects key *presses* to play sounds and counts
> them for stats. It never records, stores, or transmits *what* you type.
> Everything stays local on your device.

## Download

No cloning, no Node — just grab the installer from the
[**Releases**](https://github.com/ayushmgarg/keyclack/releases/latest) page.

- **Windows** — download the `.exe`, run it.
- **macOS** — download the `.dmg` (`arm64` for Apple Silicon, `x64` for Intel),
  drag Keyclack to Applications. First launch: right-click → **Open**, then grant
  **Input Monitoring** when prompted.

<details>
<summary>One-line install (Windows PowerShell)</summary>

```powershell
$r=irm https://api.github.com/repos/ayushmgarg/keyclack/releases/latest; $u=($r.assets|?{$_.name -like '*.exe'})[0].browser_download_url; $o="$env:TEMP\KeyclackSetup.exe"; irm $u -OutFile $o; Start-Process $o
```
</details>

<details>
<summary>One-line install (macOS Terminal)</summary>

```bash
A=$([ "$(uname -m)" = arm64 ] && echo arm64 || echo x64); U=$(curl -s https://api.github.com/repos/ayushmgarg/keyclack/releases/latest | grep -o "https://[^\" ]*mac-$A.dmg" | head -1); curl -L "$U" -o ~/Downloads/Keyclack.dmg && open ~/Downloads/Keyclack.dmg
```
</details>

Once installed, Keyclack keeps itself up to date automatically.

## Features

- 🔊 **System-wide keystroke sounds** — works in any app, even unfocused
- 🎚️ **Volume, test-sound preview, hold-to-repeat, modifier-key toggle**
- 🎵 **Customizable sounds** — a bundled default, or upload your own
- 📊 **Stats dashboard** — total keystrokes, per-key counts, daily activity, best WPM
- ⚡ **Typing test** — 15 / 30 / 60s, live WPM · accuracy · raw · consistency
- 🌗 **Simple UI** with a one-tap on/off and dark mode
- 🖥️ **Tray / menu-bar control** and launch-at-login
- 🔄 **Auto-update** from GitHub Releases

## Develop

```bash
npm install    # installs deps + generates placeholder icons
npm start      # run the app
```

## Build installers

```bash
npm run dist:win   # Windows NSIS installer  -> release/
npm run dist:mac   # macOS DMG (x64 + arm64) -> release/
```

## Release & auto-update

Auto-update reads from **GitHub Releases**. To ship a new version:

1. Bump `version` in `package.json`.
2. Commit, then tag and push:
   ```bash
   git tag v0.1.0 && git push origin v0.1.0
   ```
3. GitHub Actions builds the Windows + macOS installers and publishes them to the
   release. Existing installs pick up the update automatically.

> Windows updates work unsigned. macOS auto-update requires an Apple Developer
> signing certificate; without it the app still installs and runs, but users
> update by re-downloading.

## Customizing the default sound

The bundled default is `assets/sounds/bundled/default.wav` — replace that file to
change the built-in sound. Users can also upload their own from
**Sounds → Upload sound**; their choice is saved locally and never overwrites the
default.

## Tech

Electron · uiohook-napi (global hook) · Web Audio API · electron-store (local
JSON, no database) · electron-updater · electron-builder.

## License

MIT
