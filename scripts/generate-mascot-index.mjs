// scripts/generate-mascot-index.mjs
// Generates src/data/mascot-index.json from the SVG files in public/mascots/.
// Run automatically via the "prebuild" npm script before every Next.js build.
// Re-run manually after adding new SVG files:
//   node scripts/generate-mascot-index.mjs

import { readdirSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mascotDir = join(__dirname, '..', 'public', 'mascots')
const outFile   = join(__dirname, '..', 'src', 'data', 'mascot-index.json')

const files = readdirSync(mascotDir).filter(f => f.endsWith('.svg'))

// Build { "289": "289 - Cumberland.svg", "10": "10 - Westwood.svg", ... }
const index = {}
for (const f of files) {
  const id = f.split(' ')[0]
  if (id && !isNaN(Number(id))) index[id] = f
}

mkdirSync(join(__dirname, '..', 'src', 'data'), { recursive: true })
writeFileSync(outFile, JSON.stringify(index, null, 2) + '\n')
console.log(`mascot-index.json: ${Object.keys(index).length} entries written to src/data/mascot-index.json`)
