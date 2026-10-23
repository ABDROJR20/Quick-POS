const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal PNG encoder in pure Node.js
function createPNG(width, height, r, g, b) {
  const bytesPerPixel = 4;
  const lineLength = width * bytesPerPixel;
  const buffer = Buffer.alloc(height * (lineLength + 1));

  let pos = 0;
  for (let y = 0; y < height; y++) {
    buffer[pos++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      // Create a nice rounded border / icon look
      const isCorner =
        (x < 24 && y < 24 && Math.hypot(x - 24, y - 24) > 24) ||
        (x > width - 24 && y < 24 && Math.hypot(x - (width - 24), y - 24) > 24) ||
        (x < 24 && y > height - 24 && Math.hypot(x - 24, y - (height - 24)) > 24) ||
        (x > width - 24 && y > height - 24 && Math.hypot(x - (width - 24), y - (height - 24)) > 24);

      if (isCorner) {
        buffer[pos++] = 0;
        buffer[pos++] = 0;
        buffer[pos++] = 0;
        buffer[pos++] = 0; // Transparent
      } else {
        buffer[pos++] = r;
        buffer[pos++] = g;
        buffer[pos++] = b;
        buffer[pos++] = 255; // Alpha
      }
    }
  }

  const compressedData = zlib.deflateSync(buffer);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.slice(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// Simple CRC32 for PNG chunks
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }

  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const publicDir = path.join(__dirname, '../public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Quick-POS Cobalt Blue: rgb(20, 71, 230)
const icon192 = createPNG(192, 192, 20, 71, 230);
const icon512 = createPNG(512, 512, 20, 71, 230);

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), icon512);

console.log('Quick-POS PWA icons generated successfully in Cobalt Blue (#1447E6)!');
