// scripts/test-school-match.mjs
// Run with: node --experimental-strip-types scripts/test-school-match.mjs
// Loads .env.local, then runs matchSchoolNames against known test cases.

import { readFileSync } from 'fs'

// Load .env.local into process.env before importing the lib
const envRaw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
for (const line of envRaw.split('\n')) {
  const eq = line.indexOf('=')
  if (eq > 0 && !line.startsWith('#')) {
    const key = line.slice(0, eq).trim()
    const val = line.slice(eq + 1).trim()
    if (key && !(key in process.env)) process.env[key] = val
  }
}

import { matchSchoolNames } from '../src/lib/matchSchools.ts'

const TEST_CASES = [
  { name: 'Garfield',                          expect: 'exact',      note: 'exact display_name' },
  { name: 'St Joseph (Montvale) HS',           expect: 'exact',      note: 'exact display_name (school includes HS)' },
  { name: 'Toms River East H.S.',              expect: 'exact',      note: 'strip H.S. → exact' },
  { name: 'Kittatinny Regional Jr/Sr',         expect: 'exact',      note: 'strip Regional Jr/Sr → exact' },
  { name: 'Red Bank Catholic Hs',              expect: 'exact',      note: 'strip Hs → exact' },
  { name: 'College Achieve Paterson Charter',  expect: 'exact',      note: 'strip Charter → exact' },
  { name: 'Kushner Academy',                   expect: 'low/none',   note: 'no match expected — flag it' },
  { name: 'Lodi/Saddle Brook',                 expect: 'exact',      note: 'co-op school, exact display_name' },
]

const CONFIDENCE_RANK = { exact: 4, high: 3, low: 2, none: 1 }

function badge(confidence) {
  return {
    exact: '✅ exact',
    high:  '🟡 high ',
    low:   '🟠 low  ',
    none:  '❌ none ',
  }[confidence] ?? confidence
}

console.log(`\n${'═'.repeat(72)}`)
console.log('School matching test')
console.log('═'.repeat(72))

let passed = 0
let total  = TEST_CASES.length

for (const tc of TEST_CASES) {
  const result = await matchSchoolNames(tc.name)

  const expectMet = tc.expect === 'low/none'
    ? ['low', 'none'].includes(result.confidence)
    : result.confidence === tc.expect

  const status = expectMet ? '✓' : '✗'
  if (expectMet) passed++

  console.log(`\n${status} ${badge(result.confidence)}  "${tc.name}"`)
  console.log(`  → matched: ${result.displayName ?? '(none)'}  (id: ${result.schoolId ?? '—'})`)
  console.log(`  note: ${tc.note}`)

  if (result.alternates.length > 0) {
    console.log('  alternates:')
    for (const alt of result.alternates) {
      console.log(`    ${(alt.score * 100).toFixed(1).padStart(5)}%  ${alt.displayName}  (id ${alt.schoolId})`)
    }
  }
}

console.log(`\n${'─'.repeat(72)}`)
console.log(`Results: ${passed}/${total} passed`)
console.log('─'.repeat(72))

// ── Detailed spot-checks ──────────────────────────────────────────────────────

console.log('\n── Spot checks (raw JSON) ───────────────────────────────────────────────')
const spots = ['Toms River East H.S.', 'Kushner Academy', 'Kittatinny Regional Jr/Sr']
for (const name of spots) {
  const r = await matchSchoolNames(name)
  console.log(`\n"${name}":`)
  console.log(JSON.stringify(r, null, 2))
}
