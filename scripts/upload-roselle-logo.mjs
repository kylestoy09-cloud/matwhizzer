/**
 * One-time upload: converts Roselle Park SVG to 512×512 PNG and uploads to Supabase storage.
 *
 * Usage (from matwhizzer/ root):
 *   node scripts/upload-roselle-logo.mjs [path/to/svg]
 *
 * Default SVG path: ~/Desktop/wrestling_brackets/roselle-park-358.svg
 * (Copy from "Mascot Library/Clean SVG/125 - Roselle Park.svg" if not already there.)
 */

import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { homedir } from 'os'
import { resolve } from 'path'
import { readFileSync as _readEnv } from 'fs'

// Load .env.local
try {
  const env = _readEnv(new URL('../.env.local', import.meta.url), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
} catch { /* .env.local not found — fall back to process.env */ }

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SCHOOL_ID        = 358
const BUCKET           = 'school-logos'
const STORAGE_PATH     = `colored/512/${SCHOOL_ID}.png`

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const svgPath = process.argv[2]
  ?? resolve(homedir(), 'Desktop/wrestling_brackets/Mascot Library/Clean SVG/125 - Roselle Park.svg')

console.log(`Reading SVG: ${svgPath}`)
const svgBuffer = readFileSync(svgPath)
console.log(`SVG size: ${svgBuffer.length} bytes`)

const pngBuffer = await sharp(svgBuffer)
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()

console.log(`PNG size: ${pngBuffer.length} bytes`)

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const { data, error } = await supabase.storage
  .from(BUCKET)
  .upload(STORAGE_PATH, pngBuffer, { contentType: 'image/png', upsert: true })

if (error) {
  console.error('Upload failed:', error.message)
  process.exit(1)
}

console.log('Uploaded:', data.path)
console.log(`URL: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${STORAGE_PATH}`)
