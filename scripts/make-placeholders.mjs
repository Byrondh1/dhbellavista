/**
 * Genera imágenes PNG placeholder para los eventos (sin dependencias externas).
 * Se reemplazan por fotos reales simplemente sobrescribiendo los archivos.
 *
 * Uso: node scripts/make-placeholders.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** pixelFn(x, y) => [r, g, b, a] */
function png(width, height, pixelFn) {
  const bytesPerPixel = 4;
  const raw = Buffer.alloc(height * (1 + width * bytesPerPixel));
  let off = 0;
  for (let y = 0; y < height; y++) {
    raw[off++] = 0; // filtro: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      raw[off++] = r;
      raw[off++] = g;
      raw[off++] = b;
      raw[off++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t), 255];

function verticalGradient(from, to) {
  const a = hex(from);
  const b = hex(to);
  return (w, h) => (x, y) => mix(a, b, y / h);
}

function diagonalSplit(from, to) {
  const a = hex(from);
  const b = hex(to);
  return (w, h) => (x, y) => (x / w + y / h < 1 ? [...a, 255] : [...b, 255]);
}

/** Franjas diagonales semitransparentes, simulando banda de rodadura */
function treadPattern(color, period, thickness) {
  const c = hex(color);
  return () => (x, y) => {
    const inStripe = ((x - y) % period + period) % period < thickness;
    return inStripe ? [...c, 255] : [0, 0, 0, 0];
  };
}

function save(relPath, width, height, makePixelFn) {
  const abs = join(root, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, png(width, height, makePixelFn(width, height)));
  console.log(`✓ ${relPath} (${width}x${height})`);
}

const dh = "content/events/downhill-la-cantera-2026/images";
const rd = "content/events/rodada-angelena-4x4-2026/images";

save(`${dh}/hero.png`, 1600, 900, verticalGradient("#0a0a0a", "#661100"));
save(`${dh}/about.png`, 1200, 800, verticalGradient("#661100", "#0a0a0a"));
save(`${dh}/logo-club.png`, 600, 600, diagonalSplit("#cc2200", "#0a0a0a"));

save(`${rd}/hero.png`, 1600, 900, verticalGradient("#111111", "#6b5202"));
save(`${rd}/about.png`, 1200, 800, verticalGradient("#6b5202", "#111111"));
save(`${rd}/logo-club.png`, 600, 600, diagonalSplit("#f2b705", "#111111"));
save(`${rd}/texture-tread.png`, 240, 240, treadPattern("#000000", 60, 26));
