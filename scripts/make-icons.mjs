import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'

function buildPNG(size) {
  const r = 16, g = 185, b = 129 // #10b981 emerald

  // One row: filter byte 0, then RGB pixels
  const row = Buffer.alloc(1 + size * 3)
  row[0] = 0
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r
    row[2 + x * 3] = g
    row[3 + x * 3] = b
  }

  // Draw a white "R" in the center (simple pixel font, ~1/3 icon size)
  const letterSize = Math.floor(size / 2.5)
  const ox = Math.floor((size - letterSize * 0.6) / 2)
  const oy = Math.floor((size - letterSize) / 2)
  const rows = Buffer.alloc((1 + size * 3) * size)
  for (let y = 0; y < size; y++) {
    rows[y * (1 + size * 3)] = 0
    for (let x = 0; x < size; x++) {
      rows[y * (1 + size * 3) + 1 + x * 3] = r
      rows[y * (1 + size * 3) + 2 + x * 3] = g
      rows[y * (1 + size * 3) + 3 + x * 3] = b
    }
  }

  // Letter R pixel pattern (7 cols × 10 rows, scaled to letterSize)
  const R = [
    [1,1,1,1,0,0,0],
    [1,0,0,0,1,0,0],
    [1,0,0,0,1,0,0],
    [1,1,1,1,0,0,0],
    [1,0,0,1,0,0,0],
    [1,0,0,0,1,0,0],
    [1,0,0,0,0,1,0],
  ]
  const cellH = Math.floor(letterSize / R.length)
  const cellW = Math.floor(letterSize * 0.6 / 7)

  for (let row = 0; row < R.length; row++) {
    for (let col = 0; col < R[row].length; col++) {
      if (!R[row][col]) continue
      for (let dy = 0; dy < cellH; dy++) {
        for (let dx = 0; dx < cellW; dx++) {
          const py = oy + row * cellH + dy
          const px = ox + col * cellW + dx
          if (px < 0 || px >= size || py < 0 || py >= size) continue
          const i = py * (1 + size * 3) + 1 + px * 3
          rows[i] = 255
          rows[i + 1] = 255
          rows[i + 2] = 255
        }
      }
    }
  }

  const compressed = deflateSync(rows)

  function chunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const typeB = Buffer.from(type)
    const crc = crc32(Buffer.concat([typeB, data]))
    const crcB = Buffer.alloc(4)
    crcB.writeInt32BE(crc)
    return Buffer.concat([len, typeB, data, crcB])
  }

  function crc32(buf) {
    let crc = 0xFFFFFFFF
    const table = makeCRCTable()
    for (const b of buf) crc = (crc >>> 8) ^ table[(crc ^ b) & 0xFF]
    return (crc ^ 0xFFFFFFFF) | 0
  }

  function makeCRCTable() {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      t[n] = c
    }
    return t
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

mkdirSync('public', { recursive: true })
writeFileSync('public/icon-192.png', buildPNG(192))
writeFileSync('public/icon-512.png', buildPNG(512))
console.log('Icons written: public/icon-192.png, public/icon-512.png')
