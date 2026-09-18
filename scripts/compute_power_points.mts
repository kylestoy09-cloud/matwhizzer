/**
 * Compute NJSIAA Power Points for all NJ schools and write to the power_points table.
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/compute_power_points.mts
 *   # Add --gender F to compute girls Power Points instead
 *
 * Algorithm (matches NJSIAA):
 *   Each school's PP = average of best 9 meet values (one per opponent), where
 *   each meet value is looked up in the RANKING_SCALE using:
 *     - The OPPONENT'S prior-season final PP as the row index
 *     - The score margin and win/loss as the column index
 *   This is a single pass — opponent PP is frozen at their prior-season values.
 *   Schools absent from the prior-season RTF use DEFAULT_PP (23.0) as opponent baseline.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { computePowerPoints, computeRecord, type SchoolMeets } from '../src/lib/power-points.ts'

const SUPABASE_URL = 'https://vhffduvgcljvhtlyqgcd.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY env var required'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const GENDER  = process.argv.includes('--gender') ? process.argv[process.argv.indexOf('--gender') + 1] : 'M'
const SEASON  = 2
const CUTOFF  = '2026-02-08'
const DEFAULT_PP = 23.0

// Path to the prior season RTF — adjust if the file moves
const PRIOR_SEASON_RTF = '/Users/thebrain/Desktop/wrestling_brackets/Whizzer Upload/2024-25 Final Power Rankings.rtf'

// ── Parse prior-season RTF ────────────────────────────────────────────────────

type PriorEntry = { section: string; teamName: string; pp: number }

function parsePriorSeasonRTF(path: string): PriorEntry[] {
  const text = readFileSync(path, 'latin1')
  const results: PriorEntry[] = []

  // Section header pattern: "2024-2025 Wrestling [SECTION], Group [N] Power Points"
  // or "2024-2025 Wrestling Non-Public [A/B] Power Points"
  const headerRe = /2024-2025 Wrestling ([^\\]+?) Power Points/g

  // Team name from hyperlink: {\fldrslt \cf10 \strokec10 TEAM NAME}}
  const teamRe = /\\fldrslt [^}]*?\\strokec\d+\s+([^}\\]+)}}/g

  // PP value: \cf7 NUMBER\cell  (last cell before \row)
  // We'll extract all rows as sequences of cells then pull the last numeric cell per row
  // Strategy: split on \row, extract cells within each row
  const rowRe = /\\cell[^\\]*\\row/g

  // Split the document into sections by finding headers
  const sections: { section: string; chunk: string }[] = []
  let lastIndex = 0
  let lastSection = ''
  let m: RegExpExecArray | null

  headerRe.lastIndex = 0
  while ((m = headerRe.exec(text)) !== null) {
    if (lastSection && lastIndex < m.index) {
      sections.push({ section: lastSection, chunk: text.slice(lastIndex, m.index) })
    }
    lastSection = normalizeSection(m[1].trim())
    lastIndex = m.index + m[0].length
  }
  if (lastSection) sections.push({ section: lastSection, chunk: text.slice(lastIndex) })

  for (const { section, chunk } of sections) {
    // Split chunk into rows (each \row block is one table row)
    const rows = chunk.split('\\row')

    for (const row of rows) {
      // Skip header rows (contain "Team" or "Rank" or "PP" as the last cell label)
      if (/\\strokec3\s+(?:Rank|Team|W-L|PCT|PP)/.test(row)) continue

      // Extract team name from hyperlink
      teamRe.lastIndex = 0
      const teamMatch = teamRe.exec(row)
      if (!teamMatch) continue
      const teamName = cleanRtfText(teamMatch[1])

      // Extract PP: last numeric cell value in the row
      // Cells look like: \cf7 VALUE\cell
      const cellVals = [...row.matchAll(/\\cf7\s+([\d.]+)\\(?:cell|\n)/g)].map(c => c[1])
      if (cellVals.length === 0) continue
      const pp = parseFloat(cellVals[cellVals.length - 1])
      if (isNaN(pp)) continue

      results.push({ section, teamName, pp })
    }
  }

  return results
}

function normalizeSection(raw: string): string {
  const r = raw.toLowerCase()
  if (r.includes('north') && r.includes('i') && !r.includes('ii')) return 'North I'
  if (r.includes('north') && r.includes('ii')) return 'North II'
  if (r.includes('central')) return 'Central'
  if (r.includes('south')) return 'South'
  if (r.includes('non-public') || r.includes('non public')) return 'Non-Public'
  return raw
}

function cleanRtfText(s: string): string {
  return s
    .replace(/\\[a-z]+\d*\s*/g, '')  // strip RTF control words
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Match prior-season names to school IDs ────────────────────────────────────

function normalize(name: string): string {
  return name.toLowerCase()
    .replace(/\bhs\b|\bhigh school\b|\bregional\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build a map of school_id → prior-season final PP, used as static opponent
 * reference values during the current-season PP calculation.
 */
function buildPriorSeasonPPMap(
  priorEntries: PriorEntry[],
  schools: { id: number; display_name: string; section: string | null; aliases: string[] }[]
): Map<number, number> {
  // Build lookup: normalized name → school id
  const nameToId = new Map<string, number>()
  for (const s of schools) {
    nameToId.set(normalize(s.display_name), s.id)
    for (const alias of s.aliases) nameToId.set(normalize(alias), s.id)
  }

  const ppMap = new Map<number, number>()

  for (const entry of priorEntries) {
    const normName = normalize(entry.teamName)
    let schoolId = nameToId.get(normName)

    // Fallback: best partial match within same section
    if (!schoolId) {
      const sectionSchools = schools.filter(s => s.section === entry.section)
      let bestScore = 0
      for (const s of sectionSchools) {
        const score = partialMatchScore(normName, normalize(s.display_name))
        if (score > bestScore) { bestScore = score; schoolId = s.id }
      }
      if (bestScore < 0.6) schoolId = undefined
    }

    if (schoolId) {
      // If a school appears in multiple sections, keep the highest PP value
      const existing = ppMap.get(schoolId) ?? 0
      if (entry.pp > existing) ppMap.set(schoolId, entry.pp)
    } else {
      console.warn(`  [no match] "${entry.teamName}" (${entry.section})`)
    }
  }

  return ppMap
}

function partialMatchScore(a: string, b: string): number {
  const wordsA = new Set(a.split(' '))
  const wordsB = new Set(b.split(' '))
  let shared = 0
  for (const w of wordsA) if (wordsB.has(w)) shared++
  return shared / Math.max(wordsA.size, wordsB.size)
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`Computing Power Points: season=${SEASON} gender=${GENDER} cutoff=${CUTOFF}`)

// Load NJ schools with aliases
const { data: schools, error: schoolErr } = await supabase
  .from('schools')
  .select('id, display_name, section, is_nj')
  .eq('is_nj', true)
  .eq('is_combined', false)

if (schoolErr || !schools) { console.error('Failed to load schools:', schoolErr?.message); process.exit(1) }

const { data: aliasRows } = await supabase
  .from('school_aliases')
  .select('school_id, alias')

const aliasMap = new Map<number, string[]>()
for (const a of (aliasRows ?? [])) {
  if (!aliasMap.has(a.school_id)) aliasMap.set(a.school_id, [])
  aliasMap.get(a.school_id)!.push(a.alias)
}

const schoolsWithAliases = schools.map(s => ({
  id: s.id as number,
  display_name: s.display_name as string,
  section: s.section as string | null,
  aliases: aliasMap.get(s.id as number) ?? [],
}))

console.log(`Loaded ${schools.length} NJ schools`)

// Load prior season final PP — used as static opponent reference during calculation
let priorSeasonPP = new Map<number, number>()
if (existsSync(PRIOR_SEASON_RTF)) {
  console.log('Parsing prior season Power Points RTF...')
  const priorEntries = parsePriorSeasonRTF(PRIOR_SEASON_RTF)
  console.log(`  Parsed ${priorEntries.length} prior-season entries`)
  priorSeasonPP = buildPriorSeasonPPMap(priorEntries, schoolsWithAliases)
  console.log(`  Matched ${priorSeasonPP.size} schools to prior-season PP values`)
} else {
  console.log('No prior season RTF found — using flat 23.0 as opponent baseline for all')
}

// Load dual meets (paginate to avoid the 1000-row Supabase default limit)
const njIds = new Set(schools.map(s => s.id as number))

const PAGE = 1000
const meets: { team1_school_id: number; team2_school_id: number; team1_score: number; team2_score: number }[] = []
for (let from = 0; ; from += PAGE) {
  const { data, error: meetErr } = await supabase
    .from('dual_meets')
    .select('team1_school_id, team2_school_id, team1_score, team2_score')
    .eq('season_id', SEASON)
    .eq('gender', GENDER)
    .lte('meet_date', CUTOFF)
    .not('team1_school_id', 'is', null)
    .not('team2_school_id', 'is', null)
    .not('team1_score', 'is', null)
    .not('team2_score', 'is', null)
    .range(from, from + PAGE - 1)
  if (meetErr) { console.error('Failed to load dual meets:', meetErr.message); process.exit(1) }
  if (!data || data.length === 0) break
  meets.push(...(data as typeof meets))
  if (data.length < PAGE) break
}

const njMeets = meets.filter(
  m => njIds.has(m.team1_school_id as number) && njIds.has(m.team2_school_id as number)
)
console.log(`Dual meets: ${meets.length} total → ${njMeets.length} NJ-vs-NJ`)

// Build per-school meet lists
const meetMap = new Map<number, { opponentId: number; myScore: number; oppScore: number }[]>()
for (const s of schools) meetMap.set(s.id as number, [])

for (const m of njMeets) {
  const t1 = m.team1_school_id as number, t2 = m.team2_school_id as number
  const s1 = m.team1_score as number,    s2 = m.team2_score as number
  meetMap.get(t1)?.push({ opponentId: t2, myScore: s1, oppScore: s2 })
  meetMap.get(t2)?.push({ opponentId: t1, myScore: s2, oppScore: s1 })
}

const allSchoolMeets: SchoolMeets[] = schools.map(s => ({
  schoolId: s.id as number,
  meets: meetMap.get(s.id as number) ?? [],
}))

// Single-pass calculation: each meet value is based on opponent's prior-season PP (static)
console.log('Running single-pass Power Points calculation (opponent PP = prior-season final)...')
const ppMap = computePowerPointsWithSeeds(allSchoolMeets, priorSeasonPP, DEFAULT_PP)

// Top 20 summary
const sorted = [...ppMap.entries()].sort((a, b) => b[1] - a[1])
console.log('\nTop 20 by Power Points:')
for (const [id, pp] of sorted.slice(0, 20)) {
  const s = schoolsWithAliases.find(sc => sc.id === id)!
  console.log(`  ${pp.toFixed(2).padStart(5)}  ${(s.section ?? '').padEnd(12)}  ${s.display_name}`)
}

// Upsert
const rows = schools.map(s => {
  const schoolMeets = meetMap.get(s.id as number) ?? []
  const { wins, losses } = computeRecord(schoolMeets)
  // meets_counted = number of unique opponents in top 9 (same as NJSIAA)
  const uniqueOpps = new Set(schoolMeets.map(m => m.opponentId)).size
  return {
    school_id:      s.id as number,
    season_id:      SEASON,
    gender:         GENDER,
    power_points:   ppMap.get(s.id as number) ?? DEFAULT_PP,
    overall_wins:   wins,
    overall_losses: losses,
    meets_counted:  Math.min(uniqueOpps, 9),
  }
})

console.log(`\nUpserting ${rows.length} rows into power_points...`)
const { error: upsertErr } = await supabase
  .from('power_points')
  .upsert(rows, { onConflict: 'school_id,season_id,gender' })

if (upsertErr) { console.error('Upsert failed:', upsertErr.message); process.exit(1) }
console.log('Done.')

// ── Single-pass PP calculation using static prior-season opponent PP ───────────
//
// Each meet value is looked up in RANKING_SCALE using the OPPONENT'S prior-season
// final PP (from `oppRefPP`). This reference is never updated — it is frozen at
// prior-season values for the entire calculation. The result is each school's
// current-season PP based on how they performed against historically-rated opponents.

function computePowerPointsWithSeeds(
  allSchools: SchoolMeets[],
  oppRefPP: Map<number, number>,  // prior-season final PP per opponent (static)
  defaultPP: number,
): Map<number, number> {
  const RANKING_SCALE = [
    [43,42,41,40,38,36,33,29,26,24],
    [42,41,40,39,37,35,32,28,25,23],
    [41,40,39,38,36,34,31,27,24,22],
    [40,39,38,37,35,33,30,26,23,21],
    [39,38,37,36,34,32,29,25,22,20],
    [38,37,36,35,33,31,28,24,21,19],
    [37,36,35,34,32,30,27,23,20,18],
    [36,35,34,33,31,29,27,22,19,17],
    [35,34,33,32,30,28,26,21,18,16],
    [34,33,32,31,29,27,26,20,17,15],
    [33,32,31,30,28,26,25,19,16,14],
    [32,31,30,29,27,25,24,18,15,13],
    [31,30,29,28,26,24,23,17,15,12],
    [30,29,28,27,25,23,22,16,14,11],
    [29,28,27,26,24,22,21,15,14,10],
    [28,27,27,26,24,22,20,15,14,10],
    [28,27,27,26,24,22,20,15,14,10],
    [27,26,26,25,23,21,19,14,13,10],
    [27,26,26,25,23,21,19,14,13, 9],
    [26,26,25,25,23,21,18,14,13, 9],
  ]

  function row(pp: number) {
    if (pp>=32) return 0; if (pp>=31.5) return 1; if (pp>=31) return 2
    if (pp>=30.5) return 3; if (pp>=30) return 4; if (pp>=29.5) return 5
    if (pp>=29) return 6; if (pp>=28.5) return 7; if (pp>=28) return 8
    if (pp>=27.5) return 9; if (pp>=27) return 10; if (pp>=26.5) return 11
    if (pp>=26) return 12; if (pp>=25.5) return 13; if (pp>=25) return 14
    if (pp>=24.5) return 15; if (pp>=24) return 16; if (pp>=23.5) return 17
    if (pp>=23) return 18; return 19
  }
  function col(margin: number, won: boolean) {
    if (won) { if (margin>=19) return 0; if (margin>=13) return 1; if (margin>=7) return 2; return 3 }
    if (margin>=40) return 9; if (margin>=30) return 8; if (margin>=19) return 7
    if (margin>=13) return 6; if (margin>=7) return 5; return 4
  }
  function meetVal(oppPP: number, myS: number, oppS: number) {
    return RANKING_SCALE[row(oppPP)][col(Math.abs(myS-oppS), myS>oppS)]
  }

  const pp = new Map<number, number>()
  for (const { schoolId, meets } of allSchools) {
    const bestPerOpp = new Map<number, number>()
    for (const m of meets) {
      const oppPP = oppRefPP.get(m.opponentId) ?? defaultPP
      let myVal = meetVal(oppPP, m.myScore, m.oppScore)
      // Loss cap: cannot receive more than if you had won
      if (m.myScore <= m.oppScore) {
        const winnerVal = meetVal(oppPP, m.oppScore, m.myScore)
        if (myVal >= winnerVal) myVal = winnerVal - 1
      }
      const existing = bestPerOpp.get(m.opponentId) ?? -Infinity
      if (myVal > existing) bestPerOpp.set(m.opponentId, myVal)
    }
    const vals = [...bestPerOpp.values()].sort((a, b) => b - a).slice(0, 9)
    pp.set(schoolId, vals.length === 0
      ? (oppRefPP.get(schoolId) ?? defaultPP)
      : Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 100) / 100)
  }
  return pp
}
