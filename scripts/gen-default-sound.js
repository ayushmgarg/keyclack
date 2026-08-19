/*
 * Generates the bundled default keystroke sounds as 16-bit mono WAV files.
 * These are placeholders — Ayush will drop in his own default later by
 * replacing assets/sounds/default/*.wav (the app also lets end-users upload
 * their own). Run automatically via `postinstall`.
 */
const fs = require('fs');
const path = require('path');

const SR = 44100;

function wavFromSamples(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);       // PCM chunk size
  buf.writeUInt16LE(1, 20);        // PCM
  buf.writeUInt16LE(1, 22);        // mono
  buf.writeUInt32LE(SR, 24);       // sample rate
  buf.writeUInt32LE(SR * 2, 28);   // byte rate
  buf.writeUInt16LE(2, 32);        // block align
  buf.writeUInt16LE(16, 34);       // bits
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

// A crisp mechanical "click": a fast noise transient + a short low "thock"
// body, both under an exponential envelope. `press` is punchier than `release`.
function clickSamples({ ms, thockHz, noiseAmt, decay, body }) {
  const n = Math.floor((ms / 1000) * SR);
  const out = new Float32Array(n);
  let prevNoise = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * decay);
    // low-passed noise transient (the "click")
    const white = Math.random() * 2 - 1;
    prevNoise = prevNoise * 0.6 + white * 0.4;
    const noise = prevNoise * noiseAmt * Math.exp(-t * decay * 2.2);
    // tonal body (the "thock")
    const tone = Math.sin(2 * Math.PI * thockHz * t) * body * env;
    out[i] = (noise + tone) * env;
  }
  // tiny fade-out to avoid a tail pop
  const fade = Math.min(200, n);
  for (let i = 0; i < fade; i++) out[n - 1 - i] *= i / fade;
  return out;
}

const press = clickSamples({ ms: 55, thockHz: 165, noiseAmt: 0.9, decay: 60, body: 0.55 });
const release = clickSamples({ ms: 40, thockHz: 220, noiseAmt: 0.5, decay: 95, body: 0.25 });

const dir = path.join(__dirname, '..', 'assets', 'sounds', 'default');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'press.wav'), wavFromSamples(press));
fs.writeFileSync(path.join(dir, 'release.wav'), wavFromSamples(release));
fs.writeFileSync(path.join(dir, 'default.wav'), wavFromSamples(press));

console.log('[gen-default-sound] wrote press.wav, release.wav, default.wav ->', dir);
