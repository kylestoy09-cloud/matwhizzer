/**
 * build-flipbook.mjs
 *
 * Build-time script — run manually via `npm run build:flipbook`.
 * NOT wired into the Vercel build pipeline.
 *
 * Reads: public/updated/1.svg … 34.svg
 * Writes:
 *   public/flipbook.webp      — vertical sprite sheet (800 × 27200)
 *   public/logo-final.webp   — frame 34 alone (fallback / reduced-motion / preload poster)
 */

import sharp from 'sharp'
import { readdir, stat } from 'fs/promises'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT       = resolve(__dirname, '..')
const FRAMES_DIR = join(ROOT, 'public', 'updated')
const OUTPUT_DIR = join(ROOT, 'public')

// WebP hard cap: 16383 × 16383. 34 × 800 = 27200 > 16383 — exceeds the limit.
// 34 × 400 = 13600 < 16383 — fits. Sprite uses 400px frames; logo-final uses 800px.
const SPRITE_PX = 400   // per-frame pixels in the sprite sheet
const LOGO_PX   = 800   // pixel size for the standalone logo-final.webp
const QUALITY   = 82

// ── 1. Collect and sort frames numerically ─────────────────────────────────
// Default string sort yields 1, 10, 11, 2 … — must use explicit numeric sort.

const allFiles = await readdir(FRAMES_DIR)
const svgFiles = allFiles
  .filter(f => /^\d+\.svg$/.test(f))
  .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))

if (svgFiles.length !== 34) {
  console.error(`❌  Expected 34 .svg files, found ${svgFiles.length}.`)
  console.error(`    Files found: ${svgFiles.join(', ')}`)
  process.exit(1)
}

console.log(`✓  Found ${svgFiles.length} frames in numeric order: ${svgFiles[0]} … ${svgFiles[svgFiles.length - 1]}`)

// ── 2. Rasterize all frames to 800 × 800 PNG buffers ──────────────────────
// fit:'cover' + position:'centre' guarantees exactly FRAME_PX × FRAME_PX output.
// The 1px width difference (1729 vs 1728 viewBox) is negligible at this output
// size — cover crops from centre, effectively invisible.

console.log(`\nRasterizing ${svgFiles.length} frames at ${SPRITE_PX}×${SPRITE_PX} for sprite…`)

const frameBuffers = await Promise.all(
  svgFiles.map(async (file, i) => {
    const buf = await sharp(join(FRAMES_DIR, file))
      .resize(SPRITE_PX, SPRITE_PX, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer()
    if (i === 0 || i === svgFiles.length - 1 || (i + 1) % 5 === 0) {
      console.log(`  [${String(i + 1).padStart(2)}/${svgFiles.length}] ${file}`)
    }
    return buf
  })
)

// ── 3. Composite into vertical sprite (800 wide × 27200 tall) ─────────────

const SPRITE_H = SPRITE_PX * svgFiles.length  // 400 × 34 = 13600

console.log(`\nCompositing sprite sheet (${SPRITE_PX} × ${SPRITE_H})…`)

const composites = frameBuffers.map((input, i) => ({
  input,
  top:  i * SPRITE_PX,
  left: 0,
}))

const spriteWebpBuffer = await sharp({
  create: {
    width:      SPRITE_PX,
    height:     SPRITE_H,
    channels:   4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(composites)
  .webp({ quality: QUALITY })
  .toBuffer()

const spritePath = join(OUTPUT_DIR, 'flipbook.webp')
await sharp(spriteWebpBuffer).toFile(spritePath)

const spriteKB = Math.round((await stat(spritePath)).size / 1024)
const flagStr  = spriteKB > 800 ? ' ⚠️  EXCEEDS 800 KB — consider lowering quality' : ' ✓'
console.log(`\nSprite → ${spritePath}`)
console.log(`  Dimensions : ${SPRITE_PX} × ${SPRITE_H} px`)
console.log(`  File size  : ${spriteKB} KB${flagStr}`)

// ── 4. Export frame 34 alone at 2× resolution (fallback / reduced-motion) ─
// Re-rasterize at LOGO_PX (800) for a crisp static image on high-DPI displays.

const finalPath = join(OUTPUT_DIR, 'logo-final.webp')
const logoBuffer = await sharp(join(FRAMES_DIR, svgFiles[33]))
  .resize(LOGO_PX, LOGO_PX, { fit: 'cover', position: 'centre' })
  .webp({ quality: QUALITY })
  .toBuffer()
await sharp(logoBuffer).toFile(finalPath)

const finalKB  = Math.round((await stat(finalPath)).size / 1024)
console.log(`\nLogo final → ${finalPath}`)
console.log(`  Dimensions : ${LOGO_PX} × ${LOGO_PX} px`)
console.log(`  File size  : ${finalKB} KB`)

console.log('\nDone.')
