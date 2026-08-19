'use strict';
/**
 * Low-latency keystroke sound engine on the Web Audio API.
 * - decodes the active pack's press/release buffers once
 * - each keypress spawns a short-lived BufferSource (natural overlap/layering)
 * - tiny random pitch + gain variation so repeated keys don't sound robotic
 */
window.SoundEngine = (function () {
  let ctx = null;
  let master = null;
  let pressBuf = null;
  let releaseBuf = null;
  let volume = 0.6;      // 0..1
  let enabled = true;
  let playRelease = false;

  function ensureCtx() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
      } catch (err) {
        console.warn('[sound] AudioContext unavailable:', err && err.message);
        return null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  async function decode(bytes) {
    if (!bytes) return null;
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    const c = ensureCtx();
    if (!c) return null;
    try {
      return await c.decodeAudioData(ab);
    } catch (err) {
      console.error('[sound] decode failed', err);
      return null;
    }
  }

  async function loadPack(pack) {
    ensureCtx();
    const pressBytes = pack.press ? await window.keyclack.readSound(pack.press) : null;
    pressBuf = await decode(pressBytes);
    if (pack.release) {
      const rb = await window.keyclack.readSound(pack.release);
      releaseBuf = await decode(rb);
    } else {
      releaseBuf = null;
    }
  }

  function playBuffer(buf, gainScale) {
    if (!buf) return;
    const c = ensureCtx();
    if (!c || !master) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    // subtle variation for realism
    src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.06;
    const g = c.createGain();
    g.gain.value = gainScale * (0.9 + Math.random() * 0.1);
    src.connect(g);
    g.connect(master);
    src.start(0);
  }

  return {
    init() { ensureCtx(); },
    setEnabled(v) { enabled = v; },
    setVolume(pct) {
      volume = Math.max(0, Math.min(1, pct / 100));
      if (master) master.gain.value = volume;
    },
    setPlayRelease(v) { playRelease = v; },
    loadPack,
    down() { if (enabled) playBuffer(pressBuf, 1); },
    up() { if (enabled && playRelease) playBuffer(releaseBuf || pressBuf, 0.5); },
    test() { ensureCtx(); playBuffer(pressBuf, 1); },
  };
})();
