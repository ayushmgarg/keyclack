# ⌨️ Keyclack

A cross-platform (**Windows + macOS**) desktop app that plays a satisfying sound
on every keystroke, system-wide — in the spirit of
[ShotgunKeyboard](https://www.shotgunkeyboard.com/), plus:

- 📊 **Live stats dashboard** — total keystrokes, per-key counts, daily activity, best WPM
- ⚡ **Monkeytype-style typing test** — 15 / 30 / 60s, live WPM · accuracy · raw · consistency
- 🎛️ **Customizable sounds** — a bundled default, or upload your own sound file
- 🌗 **Simple, VPN-style UI** with a big on/off toggle and dark mode
- 🔄 **Auto-update** from GitHub Releases — ship an update and every install gets it

> **Private by design.** Keyclack detects key *presses* to play sounds and counts
> them for stats. It never records, stores, or transmits *what* you type. All data
> stays local on the device.

## Install

**Just want the app?** No cloning, no Node needed — grab the installer from the
[**Releases**](https://github.com/ayushmgarg/keyclack/releases/latest) page:

- **Windows** — download `Keyclack-<version>-win-x64.exe`, run it, done.
- **macOS** — download the `.dmg` (`arm64` for Apple Silicon, `x64` for Intel),
  open it, drag Keyclack to Applications. First launch: right-click → **Open**
  (unsigned app), then grant **Input Monitoring** when asked.

### One-line install (Windows PowerShell)

Downloads the latest installer and launches it:

```powershell
$r=irm https://api.github.com/repos/ayushmgarg/keyclack/releases/latest; $u=($r.assets|?{$_.name -like '*.exe'})[0].browser_download_url; $o="$env:TEMP\KeyclackSetup.exe"; irm $u -OutFile $o; Start-Process $o
```

### One-line install (macOS Terminal)

```bash
A=$([ "$(uname -m)" = arm64 ] && echo arm64 || echo x64); U=$(curl -s https://api.github.com/repos/ayushmgarg/keyclack/releases/latest | grep -o "https://[^\" ]*mac-$A.dmg" | head -1); curl -L "$U" -o ~/Downloads/Keyclack.dmg && open ~/Downloads/Keyclack.dmg
```

After install, Keyclack auto-updates itself from new releases.

## Features (ShotgunKeyboard parity + extras)

| Feature | Status |
| --- | --- |
| System-wide keystroke sounds | ✅ |
| Volume 10–100% | ✅ |
| Test-sound preview | ✅ |
| Hold-to-repeat toggle | ✅ |
| Modifier-key support (Shift/Ctrl/Alt/⌘) | ✅ |
| Launch at login | ✅ |
| Tray / menu-bar control | ✅ |
| Custom uploaded sounds | ✅ |
| Play-on-release option | ✅ |
| Stats dashboard | ✅ |
| Typing test | ✅ |
| Dark / light / system theme | ✅ |
| Auto-update | ✅ |

## Develop

```bash
npm install      # also generates the default sound + placeholder icons
npm start        # run the app
```

## Build installers

```bash
npm run dist:win   # Windows NSIS installer -> release/
npm run dist:mac   # macOS DMG (x64 + arm64) -> release/
```

## Release & auto-update

Auto-update reads from **GitHub Releases** (`ayushmgarg/keyclack`). To ship:

1. Bump `version` in `package.json`.
2. Commit, then tag and push:
   ```bash
   git tag v0.1.0 && git push origin v0.1.0
   ```
3. GitHub Actions (`.github/workflows/release.yml`) builds Windows + macOS and
   publishes the installers to the release. Existing installs pick up the update
   automatically (checked on launch and every 6 hours).

## Swapping the default sound

Replace the WAVs in `assets/sounds/default/` (`press.wav`, `release.wav`) with
your own, or regenerate the placeholders with `npm run gen:sound`. End users can
also upload their own sound from **Sounds → Upload sound**.

## Permissions

- **macOS** — requires *Input Monitoring* (System Settings → Privacy & Security →
  Input Monitoring) so the global key hook works.
- **Windows** — no special permission; SmartScreen may warn until the app is
  code-signed.

## Stack

Electron · uiohook-napi (global hook) · Web Audio API · electron-store (local
JSON) · electron-updater · electron-builder.

## License

MIT © Ayush Garg
