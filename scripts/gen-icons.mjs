// Pure-Node PNG icon generator. No external dependencies (uses only
// built-in zlib + Buffer). Produces simple solid-color icons with
// text centered, suitable as a placeholder PWA app icon.
//
// Output: public/icon-192.png, public/icon-512.png
//
// Format: 8-bit RGBA PNG, hand-assembled per the PNG spec. The "CN"
// glyph is drawn pixel-by-pixel using a small built-in 5x7 bitmap
// font, scaled up. This avoids any native canvas dependency.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';

// 5x7 bitmap font for the characters 'C' and 'N'. 1 = pixel on.
const FONT = {
  C: [
    '01110',
    '10001',
    '10000',
    '10000',
    '10000',
    '10001',
    '01110',
  ],
  N: [
    '10001',
    '11001',
    '10101',
    '10101',
    '10011',
    '10001',
    '10001',
  ],
};

const BG = [0x4a, 0x7d, 0xff, 0xff]; // primary blue, fully opaque
const FG = [0xff, 0xff, 0xff, 0xff]; // white

function makePixels(size) {
  // Allocate an RGBA buffer, fill with BG.
  const rowBytes = size * 4;
  const pixels = Buffer.alloc(size * rowBytes);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i + 0] = BG[0];
    pixels[i + 1] = BG[1];
    pixels[i + 2] = BG[2];
    pixels[i + 3] = BG[3];
  }

  // Draw 'CN' centered. Each glyph is 5 cols x 7 rows. Use a scale
  // that fits comfortably: ~60% of size total width for the two chars.
  const text = ['C', 'N'];
  const glyphCols = 5;
  const glyphRows = 7;
  const gap = 1; // 1 font-cell of gap between letters
  const totalCols = glyphCols * text.length + gap * (text.length - 1);
  const scale = Math.floor((size * 0.55) / totalCols);
  const drawWidth = totalCols * scale;
  const drawHeight = glyphRows * scale;
  const startX = Math.floor((size - drawWidth) / 2);
  const startY = Math.floor((size - drawHeight) / 2);

  const setPixel = (x, y) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const idx = (y * size + x) * 4;
    pixels[idx + 0] = FG[0];
    pixels[idx + 1] = FG[1];
    pixels[idx + 2] = FG[2];
    pixels[idx + 3] = FG[3];
  };

  text.forEach((ch, ci) => {
    const glyph = FONT[ch];
    const charOffsetCols = ci * (glyphCols + gap);
    for (let row = 0; row < glyphRows; row++) {
      for (let col = 0; col < glyphCols; col++) {
        if (glyph[row][col] === '1') {
          // Fill a scale x scale block.
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              setPixel(
                startX + (charOffsetCols + col) * scale + dx,
                startY + row * scale + dy
              );
            }
          }
        }
      }
    }
  });

  return pixels;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(size) {
  const pixels = makePixels(size);

  // Build raw IDAT input: each scanline is prefixed by a 1-byte filter type (0 = None).
  const rowBytes = size * 4;
  const raw = Buffer.alloc(size * (rowBytes + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (rowBytes + 1)] = 0; // filter: None
    pixels.copy(raw, y * (rowBytes + 1) + 1, y * rowBytes, y * rowBytes + rowBytes);
  }
  const idatData = deflateSync(raw);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8;                 // bit depth
  ihdr[9] = 6;                 // color type: truecolor + alpha
  ihdr[10] = 0;                // compression
  ihdr[11] = 0;                // filter
  ihdr[12] = 0;                // interlace

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

if (!existsSync('public')) mkdirSync('public');
writeFileSync('public/icon-192.png', makePng(192));
writeFileSync('public/icon-512.png', makePng(512));
console.log('Icons generated: public/icon-192.png, public/icon-512.png');
