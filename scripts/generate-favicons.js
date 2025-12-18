/* eslint-disable no-console */
const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

const ROOT = process.cwd()
const PUBLIC_DIR = path.join(ROOT, "public")

const SOURCE_PNG = path.join(PUBLIC_DIR, "icon-512x512.png")
const OUT_FAVICON_ICO = path.join(PUBLIC_DIR, "favicon.ico")
const OUT_PNGS = [
  { size: 16, file: path.join(PUBLIC_DIR, "favicon-16x16.png") },
  { size: 32, file: path.join(PUBLIC_DIR, "favicon-32x32.png") },
  { size: 48, file: path.join(PUBLIC_DIR, "favicon-48x48.png") }
]

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${path.relative(ROOT, filePath)}`)
  }
}

function buildIcoFromPngBuffers(entries) {
  // ICO header: Reserved (2) + Type (2) + Count (2)
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // 1 = icon
  header.writeUInt16LE(entries.length, 4)

  const dirEntries = []
  let offset = 6 + entries.length * 16

  for (const { size, data } of entries) {
    const dir = Buffer.alloc(16)
    dir.writeUInt8(size === 256 ? 0 : size, 0) // 0 means 256
    dir.writeUInt8(size === 256 ? 0 : size, 1)
    dir.writeUInt8(0, 2) // color palette
    dir.writeUInt8(0, 3) // reserved
    dir.writeUInt16LE(1, 4) // planes
    dir.writeUInt16LE(32, 6) // bits per pixel
    dir.writeUInt32LE(data.length, 8) // bytes in resource
    dir.writeUInt32LE(offset, 12) // offset
    offset += data.length
    dirEntries.push(dir)
  }

  return Buffer.concat([header, ...dirEntries, ...entries.map(e => e.data)])
}

async function main() {
  assertFileExists(SOURCE_PNG)
  await fs.promises.mkdir(PUBLIC_DIR, { recursive: true })

  // Generate favicon PNGs for explicit size link tags.
  for (const { size, file } of OUT_PNGS) {
    const buf = await sharp(SOURCE_PNG)
      .resize(size, size, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toBuffer()
    await fs.promises.writeFile(file, buf)
  }

  // Generate an ICO with embedded PNGs (modern browsers + Google Search).
  const icoSizes = [16, 32, 48, 256]
  const icoEntries = []
  for (const size of icoSizes) {
    const data = await sharp(SOURCE_PNG)
      .resize(size, size, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toBuffer()
    icoEntries.push({ size, data })
  }

  const ico = buildIcoFromPngBuffers(icoEntries)
  await fs.promises.writeFile(OUT_FAVICON_ICO, ico)

  console.log("Generated favicons:")
  console.log("-", path.relative(ROOT, OUT_FAVICON_ICO))
  for (const { file } of OUT_PNGS) console.log("-", path.relative(ROOT, file))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

