/**
 * build-flipbook.mjs
 *
 * Build-time script — run manually via `npm run build:flipbook`.
 * NOT wired into the Vercel build pipeline.
 *
 * Reads: ~/Desktop/Mascot Library/animation/Whizzer/  (1.png–97.png, 86 absent = 96 frames)
 * Writes:
 *   public/flipbook.avif     — 10×10 grid sprite (6000×6000 px, 100 frames, AVIF q60)
 *   public/logo-final.webp  — final frame alone  (97.png, 800×800 px, WebP q82)
 */

import sharp from 'sharp'
import { readdir, stat } from 'fs/promises'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { homedir } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT       = resolve(__dirname, '..')
const FRAMES_DIR = join(homedir(), 'Desktop', 'Mascot Library', 'animation', 'Whizzer')
const OUTPUT_DIR = join(ROOT, 'public')

const COLS              = 10
const ROWS              = 10
const GRID_FRAMES       = COLS * ROWS    // 100 — padded frame count
const CELL_PX           = 600
const LOGO_PX           = 800
const SPRITE_QUALITY    = 60
const LOGO_QUALITY      = 82
const SOURCE_FRAMES     = 96            // real source PNGs (86.png absent → 1-97, 96 files)
const MAX_DIM           = 16383          // AVIF/HEIF hard limit
const MAX_SPRITE_BYTES  = 1.6 * 1024 * 1024   // 1.6 MB — fail loudly if exceeded

const CANVAS_W = COLS * CELL_PX  // 6000
const CANVAS_H = ROWS * CELL_PX  // 6000

// ── 0. Dimension guard ─────────────────────────────────────────────────────
if (CANVAS_W > MAX_DIM || CANVAS_H > MAX_DIM) {
  console.error(`❌  Canvas ${CANVAS_W}×${CANVAS_H} exceeds AVIF limit of ${MAX_DIM}px.`)
  process.exit(1)
}
console.log(`✓  Canvas ${CANVAS_W}×${CANVAS_H} — within AVIF limits.`)

// ── 1. Collect and sort frames numerically ─────────────────────────────────
// Default string sort yields 1, 10, 11, 2 … — must use explicit numeric sort.
// Source: 1.png–97.png with 86 absent → exactly 96 PNGs.

const allFiles = await readdir(FRAMES_DIR)
const pngFiles = allFiles
  .filter(f => /^\d+\.png$/.test(f))
  .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))

if (pngFiles.length !== SOURCE_FRAMES) {
  console.error(`❌  Expected ${SOURCE_FRAMES} .png files, found ${pngFiles.length}.`)
  console.error(`    Files: ${pngFiles.join(', ')}`)
  process.exit(1)
}

console.log(`✓  Found ${pngFiles.length} frames: ${pngFiles[0]} … ${pngFiles[pngFiles.length - 1]}`)

// Pad to GRID_FRAMES by repeating the final source frame (97.png).
// These 4 padding copies fill cols 6–9 of row 9 and are visually identical
// to the real last frame, so the hold reads as a natural beat, not a glitch.
const paddedFiles = [
  ...pngFiles,
  ...Array(GRID_FRAMES - pngFiles.length).fill(pngFiles[pngFiles.length - 1]),
]
console.log(`✓  Padded to ${paddedFiles.length} frames (${GRID_FRAMES - pngFiles.length} copies of ${pngFiles[pngFiles.length - 1]})`)

// ── 2. Resize all frames to CELL_PX × CELL_PX ─────────────────────────────
// Resize only the unique SOURCE_FRAMES files; the 4 padding entries are
// copies of the same path, so we deduplicate before encoding.

console.log(`\nResizing ${paddedFiles.length} frames at ${CELL_PX}×${CELL_PX}…`)

// Build a map of path → resized buffer so the final frame is only encoded once.
const uniquePaths = [...new Set(paddedFiles.map(f => join(FRAMES_DIR, f)))]
const bufferByPath = new Map()
await Promise.all(
  uniquePaths.map(async (path, i) => {
    const buf = await sharp(path)
      .resize(CELL_PX, CELL_PX, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer()
    const name = path.split('/').pop()
    if (i === 0 || i === uniquePaths.length - 1 || (i + 1) % 10 === 0) {
      console.log(`  [${String(i + 1).padStart(2)}/${uniquePaths.length}] ${name}`)
    }
    bufferByPath.set(path, buf)
  })
)

const frameBuffers = paddedFiles.map(f => bufferByPath.get(join(FRAMES_DIR, f)))

// ── 3. Composite into 10×10 grid sprite ───────────────────────────────────
// Frame i → col = i % COLS, row = floor(i / COLS).
// All 100 cells are filled: indices 96–99 hold padding copies of 97.png.

console.log(`\nCompositing grid sprite (${CANVAS_W}×${CANVAS_H}, ${frameBuffers.length} frames)…`)

const composites = frameBuffers.map((input, i) => ({
  input,
  left: (i % COLS) * CELL_PX,
  top:  Math.floor(i / COLS) * CELL_PX,
}))

const spriteAvifBuffer = await sharp({
  create: {
    width:      CANVAS_W,
    height:     CANVAS_H,
    channels:   4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(composites)
  .avif({ quality: SPRITE_QUALITY })
  .toBuffer()

const spritePath  = join(OUTPUT_DIR, 'flipbook.avif')
await sharp(spriteAvifBuffer).toFile(spritePath)

const spriteBytes = (await stat(spritePath)).size
const spriteKB    = Math.round(spriteBytes / 1024)
const spriteMB    = (spriteBytes / (1024 * 1024)).toFixed(2)

console.log(`\nSprite → ${spritePath}`)
console.log(`  Dimensions : ${CANVAS_W}×${CANVAS_H} px`)
console.log(`  File size  : ${spriteKB} KB (${spriteMB} MB)`)

if (spriteBytes > MAX_SPRITE_BYTES) {
  console.error(`\n❌  Sprite exceeds ${(MAX_SPRITE_BYTES / 1024 / 1024).toFixed(1)} MB (${spriteMB} MB). STOPPING.`)
  console.error('    Re-export source frames or lower SPRITE_QUALITY before proceeding to Step 2.')
  process.exit(1)
}

// ── 4. Export final frame (97.png) as logo-final.webp (WebP, not AVIF) ───

const finalPath  = join(OUTPUT_DIR, 'logo-final.webp')
const logoBuffer = await sharp(join(FRAMES_DIR, pngFiles[pngFiles.length - 1]))
  .resize(LOGO_PX, LOGO_PX, { fit: 'cover', position: 'centre' })
  .webp({ quality: LOGO_QUALITY })
  .toBuffer()
await sharp(logoBuffer).toFile(finalPath)

const finalKB = Math.round((await stat(finalPath)).size / 1024)
console.log(`\nLogo final → ${finalPath}`)
console.log(`  Source     : ${pngFiles[pngFiles.length - 1]}`)
console.log(`  Dimensions : ${LOGO_PX}×${LOGO_PX} px`)
console.log(`  File size  : ${finalKB} KB`)

console.log('\nDone.')
