// Pure Node.js PNG generator - no external deps
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// CRC32 table
const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length)
  const crcBuf = Buffer.concat([typeBytes, data])
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(crcBuf))
  return Buffer.concat([len, typeBytes, data, crc])
}

function pointInPolygon(px, py, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi))
      inside = !inside
  }
  return inside
}

function generateIcon(size) {
  const s = size
  const pixels = Buffer.alloc(s * s * 4)

  // Background: #0d1117  (dark)
  const bg = [0x0d, 0x11, 0x17, 0xff]
  // Accent: #10b981 (emerald)
  const accent = [0x10, 0xb9, 0x81, 0xff]

  // Lightning bolt polygon (fractions of size)
  const bolt = [
    [0.60, 0.06],  // top right
    [0.26, 0.52],  // mid left
    [0.49, 0.52],  // mid center-bottom
    [0.37, 0.94],  // bottom left
    [0.74, 0.48],  // mid right
    [0.51, 0.48],  // mid center-top
  ].map(([fx, fy]) => [fx * s, fy * s])

  // Rounded rect clip radius
  const radius = s * 0.22

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const idx = (y * s + x) * 4

      // Rounded rect clip
      let inRect = true
      if (x < radius && y < radius) inRect = (x - radius) ** 2 + (y - radius) ** 2 <= radius ** 2
      else if (x > s - radius && y < radius) inRect = (x - (s - radius)) ** 2 + (y - radius) ** 2 <= radius ** 2
      else if (x < radius && y > s - radius) inRect = (x - radius) ** 2 + (y - (s - radius)) ** 2 <= radius ** 2
      else if (x > s - radius && y > s - radius) inRect = (x - (s - radius)) ** 2 + (y - (s - radius)) ** 2 <= radius ** 2

      if (!inRect) {
        // transparent
        pixels[idx] = 0; pixels[idx+1] = 0; pixels[idx+2] = 0; pixels[idx+3] = 0
        continue
      }

      const color = pointInPolygon(x, y, bolt) ? accent : bg
      pixels[idx] = color[0]; pixels[idx+1] = color[1]; pixels[idx+2] = color[2]; pixels[idx+3] = color[3]
    }
  }

  // Build raw scanlines (filter byte 0 per row)
  const raw = Buffer.alloc(s * (1 + s * 4))
  for (let y = 0; y < s; y++) {
    raw[y * (1 + s * 4)] = 0 // filter: None
    pixels.copy(raw, y * (1 + s * 4) + 1, y * s * 4, (y + 1) * s * 4)
  }

  const compressed = deflateSync(raw, { level: 9 })

  // IHDR
  const ihdrData = Buffer.allocUnsafe(13)
  ihdrData.writeUInt32BE(s, 0)
  ihdrData.writeUInt32BE(s, 4)
  ihdrData[8] = 8  // bit depth
  ihdrData[9] = 6  // color type: RGBA
  ihdrData[10] = 0 // compression
  ihdrData[11] = 0 // filter
  ihdrData[12] = 0 // interlace

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const publicDir = join(__dirname, '..', 'public')

writeFileSync(join(publicDir, 'icon-192.png'), generateIcon(192))
console.log('✓ icon-192.png')

writeFileSync(join(publicDir, 'icon-512.png'), generateIcon(512))
console.log('✓ icon-512.png')
