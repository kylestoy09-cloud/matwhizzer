// scripts/test-wrestler-match.mjs
// Run with: node --experimental-strip-types scripts/test-wrestler-match.mjs
// Loads .env.local, then runs matchWrestler against known test cases.

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

import { matchWrestler } from '../src/lib/matchWrestlers.ts'

// School IDs from DB
const GARFIELD   = 53   // Garfield
const TRE        = 253  // Toms River East
const CBA        = 197  // Christian Brothers Academy

const TEST_CASES = [
  {
    name: 'Eryk Barcikowski',
    schoolId: GARFIELD,
    weight: 113,
    gender: 'M',
    expect: 'high',
    note: 'in DB at Garfield but recorded at 106, asking for 113 → name exact, weight mismatch → high',
  },
  {
    name: 'Richard DeLorenzo II',
    schoolId: TRE,
    weight: 132,
    gender: 'M',
    expect: 'exact',
    note: 'in DB at Toms River East, weight 132 — exact match',
  },
  {
    name: 'Unknown',
    schoolId: GARFIELD,
    weight: 106,
    gender: 'M',
    expect: 'none',
    note: 'placeholder name — should always be isNew=true, confidence=none',
  },
  {
    name: 'James Jakub',
    schoolId: CBA,
    weight: 157,
    gender: 'M',
    expect: 'exact',
    note: 'in DB at Christian Brothers, weight 157 — exact match',
  },
]

function badge(confidence) {
  return {
    exact: '✅ exact',
    high:  '🟡 high ',
    low:   '🟠 low  ',
    none:  '❌ none ',
  }[confidence] ?? confidence
}

console.log(`\n${'═'.repeat(72)}`)
console.log('Wrestler matching test')
console.log('═'.repeat(72))

let passed = 0
const total = TEST_CASES.length

for (const tc of TEST_CASES) {
  const result = await matchWrestler(tc.name, tc.schoolId, tc.weight, tc.gender)

  const expectMet = tc.expect === 'low/none'
    ? ['low', 'none'].includes(result.confidence)
    : result.confidence === tc.expect

  const status = expectMet ? '✓' : '✗'
  if (expectMet) passed++

  console.log(`\n${status} ${badge(result.confidence)}  "${tc.name}"  (school ${tc.schoolId}, ${tc.weight}lb)`)
  console.log(`  → wrestlerId: ${result.wrestlerId ?? '—'}`)
  console.log(`  → displayName: ${result.displayName ?? '(none)'}`)
  console.log(`  → isNew: ${result.isNew}`)
  console.log(`  note: ${tc.note}`)

  if (result.alternates.length > 0) {
    console.log('  alternates:')
    for (const alt of result.alternates) {
      console.log(`    ${(alt.score * 100).toFixed(1).padStart(5)}%  ${alt.displayName}  (id ${alt.wrestlerId})`)
    }
  }
}

console.log(`\n${'─'.repeat(72)}`)
console.log(`Results: ${passed}/${total} passed`)
console.log('─'.repeat(72))

// ── Detailed spot-checks ──────────────────────────────────────────────────────

console.log('\n── Spot checks (raw JSON) ───────────────────────────────────────────────')
const spots = [
  { name: 'Eryk Barcikowski',    schoolId: GARFIELD, weight: 113, gender: 'M' },
  { name: 'Richard DeLorenzo II', schoolId: TRE,     weight: 132, gender: 'M' },
  { name: 'Unknown',              schoolId: GARFIELD, weight: 106, gender: 'M' },
]
for (const s of spots) {
  const r = await matchWrestler(s.name, s.schoolId, s.weight, s.gender)
  console.log(`\n"${s.name}" (school ${s.schoolId}, ${s.weight}lb):`)
  console.log(JSON.stringify(r, null, 2))
}
