/*
 * Generates placeholder PNG icons with a hand-rolled PNG encoder (zlib only,
 * no native deps). Produces:
 *   build/icon.png            512x512 app icon (electron-builder derives .ico/.icns)
 *   assets/icons/tray-active.png / tray-idle.png   tray/menu-bar icons
 * Replace build/icon.png with real artwork anytime; these are just defaults.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function encodePNG(width, height, rgba) {
  // rgba: Uint8Array length width*height*4
  const rowLen = width * 4;
  const raw = Buffer.alloc((rowLen + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (rowLen + 1)] = 0; // filter type 0 (none)
    rgba.copy
      ? rgba.copy(raw, y * (rowLen + 1) + 1, y * rowLen, y * rowLen + rowLen)
      : Buffer.from(rgba.buffer, y * rowLen, rowLen).copy(raw, y * (rowLen + 1) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0, 0);
    return Buffer.concat([len, body, crc]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// --- tiny drawing helpers on an RGBA buffer ---
function makeCanvas(w, h) {
  return { w, h, data: Buffer.alloc(w * h * 4) };
}
function px(cv, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
  const i = (y * cv.w + x) * 4;
  const ia = a / 255;
  const bg = 1 - ia;
  cv.data[i] = Math.round(r * ia + cv.data[i] * bg);
  cv.data[i + 1] = Math.round(g * ia + cv.data[i + 1] * bg);
  cv.data[i + 2] = Math.round(b * ia + cv.data[i + 2] * bg);
  cv.data[i + 3] = Math.min(255, cv.data[i + 3] + a);
}
function roundRect(cv, x0, y0, x1, y1, radius, color) {
  const [r, g, b, a] = color;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      // rounded-corner mask with slight anti-alias
      let inside = true;
      let alpha = a;
      const corners = [
        [x0 + radius, y0 + radius], [x1 - radius, y0 + radius],
        [x0 + radius, y1 - radius], [x1 - radius, y1 - radius],
      ];
      if ((x < x0 + radius || x >= x1 - radius) && (y < y0 + radius || y >= y1 - radius)) {
        let cx = x < x0 + radius ? x0 + radius : x1 - radius;
        let cy = y < y0 + radius ? y0 + radius : y1 - radius;
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (d > radius) inside = false;
        else if (d > radius - 1.5) alpha = a * (radius - d) / 1.5;
      }
      if (inside) px(cv, x, y, r, g, b, alpha);
    }
  }
}

function appIcon(size) {
  const cv = makeCanvas(size, size);
  const s = size / 512;
  // dark rounded background
  roundRect(cv, 0, 0, size, size, 112 * s, [20, 22, 30, 255]);
  // subtle inner panel
  roundRect(cv, 96 * s, 150 * s, 416 * s, 380 * s, 40 * s, [31, 34, 48, 255]);
  // orange keycap
  roundRect(cv, 150 * s, 120 * s, 362 * s, 320 * s, 46 * s, [255, 90, 60, 255]);
  roundRect(cv, 150 * s, 300 * s, 362 * s, 340 * s, 46 * s, [200, 62, 40, 255]); // keycap base
  // keycap highlight
  roundRect(cv, 178 * s, 150 * s, 334 * s, 240 * s, 26 * s, [255, 130, 105, 200]);
  return encodePNG(size, size, cv.data);
}

function trayIcon(size, active) {
  const cv = makeCanvas(size, size);
  const s = size / 32;
  const col = active ? [255, 120, 90, 255] : [150, 150, 160, 235];
  // a small keycap glyph, transparent background
  roundRect(cv, 6 * s, 8 * s, 26 * s, 24 * s, 5 * s, col);
  roundRect(cv, 10 * s, 12 * s, 22 * s, 18 * s, 3 * s, [20, 22, 30, active ? 220 : 200]);
  return encodePNG(size, size, cv.data);
}

const buildDir = path.join(__dirname, '..', 'build');
const trayDir = path.join(__dirname, '..', 'assets', 'icons');
fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(trayDir, { recursive: true });

fs.writeFileSync(path.join(buildDir, 'icon.png'), appIcon(512));
// also ship a copy inside assets/ so the runtime window icon exists when packaged
fs.writeFileSync(path.join(trayDir, '..', 'icon.png'), appIcon(256));
fs.writeFileSync(path.join(trayDir, 'tray-active.png'), trayIcon(32, true));
fs.writeFileSync(path.join(trayDir, 'tray-idle.png'), trayIcon(32, false));
// macOS template tray (also provide @2x)
fs.writeFileSync(path.join(trayDir, 'tray-active@2x.png'), trayIcon(64, true));
fs.writeFileSync(path.join(trayDir, 'tray-idle@2x.png'), trayIcon(64, false));

console.log('[gen-icons] wrote build/icon.png and assets/icons/tray-*.png');
