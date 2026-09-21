#!/usr/bin/env node
// Fails the build if app code hardcodes a season.
//
// Seasons must come from the database (getWorkingSeason / getLiveSeason / getSeasons / useSeasons)
// so every tool follows the season rollover. A hardcoded "2025-26", a season-specific date like
// '2026-02-28', or a season key like 2026 silently pins a tool to one season.
//
// Flags, in src/ (comments skipped):
//   - season labels:          2025-26, 2025–26
//   - quoted ISO dates:       '2026-02-28'
//   - season keys in code:    season_id === 2026, .eq('season_id', 2026), { 2026: ... }
//
// A line that genuinely needs one (e.g. a link to an NJSIAA document, a pinned historical record)
// is allowed with a `season-literal-ok` marker on the same line or the line above. For a block,
// put `season-literal-ok-start` and `season-literal-ok-end` comments around it.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const SRC = join(ROOT, 'src')
const MARKER = 'season-literal-ok'

const PATTERNS = [
  { name: 'season label', re: /\b(20\d\d)[-–](\d\d)\b/g, check: m => (Number(m[1]) + 1) % 100 === Number(m[2]) },
  { name: 'hardcoded date', re: /['"`]20\d\d-\d\d-\d\d['"`]/g },
  { name: 'season key', re: /(season_?[iI]d['"]?\s*(===|!==|==|,|:)\s*|\{\s*)20[2-3]\d\s*[,:)}]/g },
]

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else if (/\.(ts|tsx|mts|js|jsx)$/.test(name)) yield p
  }
}

// Drop comments so documentation examples don't trip the check
function codeOnly(line, state) {
  let out = ''
  for (let i = 0; i < line.length; i++) {
    if (state.block) {
      if (line[i] === '*' && line[i + 1] === '/') { state.block = false; i++ }
      continue
    }
    if (line[i] === '/' && line[i + 1] === '*') { state.block = true; i++; continue }
    if (line[i] === '/' && line[i + 1] === '/' && line[i - 1] !== ':') break
    out += line[i]
  }
  return out
}

const hits = []
for (const file of walk(SRC)) {
  const lines = readFileSync(file, 'utf8').split('\n')
  const state = { block: false }
  let allowedBlock = false
  lines.forEach((raw, i) => {
    const code = codeOnly(raw, state)
    if (raw.includes(`${MARKER}-start`)) allowedBlock = true
    if (raw.includes(`${MARKER}-end`)) { allowedBlock = false; return }
    if (allowedBlock) return
    if (raw.includes(MARKER) || (i > 0 && lines[i - 1].includes(MARKER))) return
    for (const p of PATTERNS) {
      for (const m of code.matchAll(p.re)) {
        if (p.check && !p.check(m)) continue
        hits.push(`${relative(ROOT, file)}:${i + 1}  [${p.name}]  ${raw.trim().slice(0, 140)}`)
      }
    }
  })
}

if (hits.length) {
  console.error(`\n✖ Hardcoded season found (${hits.length}). Read the season from the database instead,`)
  console.error(`  or mark a deliberate exception with a "${MARKER}" comment.\n`)
  for (const h of hits) console.error('  ' + h)
  console.error('')
  process.exit(1)
}
console.log('✓ No hardcoded seasons in src/')
