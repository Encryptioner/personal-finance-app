/* eslint-disable no-undef */
/**
 * Generate PNG icons for PWA manifest.
 * Uses Node.js built-ins (zlib + manual PNG format).
 * No external dependencies required.
 *
 * Usage: node scripts/gen-icons.mjs
 * Generates: public/pwa-192x192.png, public/pwa-512x512.png, public/maskable-512.png
 */

import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'

/**
 * Build CRC32 lookup table.
 */
function makeCRC32Table() {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
}

const crc32Table = makeCRC32Table()

/**
 * Calculate CRC32 checksum.
 */
function crc32(buf) {
  let crc = 0xffffffff
  for (const byte of buf) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Create a PNG chunk.
 * @param type - 4-char chunk type (e.g., 'IHDR')
 * @param data - chunk data bytes
 * @returns Buffer with complete chunk (length + type + data + CRC)
 */
function pngChunk(type, data) {
  const buf = Buffer.alloc(12 + data.length)
  buf.writeUInt32BE(data.length, 0)
  buf.write(type, 4, 'ascii')
  data.copy(buf, 8)
  const chunkCrc = crc32(Buffer.concat([Buffer.from(type), data]))
  buf.writeUInt32BE(chunkCrc, 8 + data.length)
  return buf
}

/**
 * Generate a solid-color PNG.
 * @param width - image width in pixels
 * @param height - image height in pixels
 * @param r, g, b - RGB color components (0-255)
 * @returns Buffer containing complete PNG file
 */
function createPNG(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk - image metadata
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  ihdr[10] = 0 // compression method
  ihdr[11] = 0 // filter method
  ihdr[12] = 0 // interlace method

  // IDAT chunk - pixel data
  // Each row: 1 filter byte (0 = None) + RGB pixels
  const rowLength = 1 + width * 3
  const pixelData = Buffer.alloc(height * rowLength)

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowLength
    pixelData[rowStart] = 0 // filter byte = None

    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3
      pixelData[pixelStart] = r
      pixelData[pixelStart + 1] = g
      pixelData[pixelStart + 2] = b
    }
  }

  // Compress pixel data with zlib
  const compressedData = deflateSync(pixelData)

  // IEND chunk - empty
  const iend = Buffer.alloc(0)

  // Assemble PNG
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressedData),
    pngChunk('IEND', iend),
  ])
}

/**
 * Generate and write PNG icons.
 */
function generateIcons() {
  const publicDir = 'public'
  mkdirSync(publicDir, { recursive: true })

  // Accent color from Tailwind v4 theme: slate
  const r = 10 // #0a0a0a red
  const g = 10 // #0a0a0a green
  const b = 10 // #0a0a0a blue

  // Generate 192x192
  const png192 = createPNG(192, 192, r, g, b)
  writeFileSync(`${publicDir}/pwa-192x192.png`, png192)
  console.log('✓ Generated public/pwa-192x192.png')

  // Generate 512x512
  const png512 = createPNG(512, 512, r, g, b)
  writeFileSync(`${publicDir}/pwa-512x512.png`, png512)
  console.log('✓ Generated public/pwa-512x512.png')

  // Generate maskable 512x512 (same as regular, will have safe area padding applied by app store)
  const maskable512 = createPNG(512, 512, r, g, b)
  writeFileSync(`${publicDir}/maskable-512.png`, maskable512)
  console.log('✓ Generated public/maskable-512.png')

  console.log('\nAll icons generated successfully!')
}

generateIcons()
