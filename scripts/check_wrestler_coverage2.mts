import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

// Fetch all data in parallel using sets — page through wrestlers
async function fetchAllIds(table: string, column: string): Promise<Set<string>> {
  const ids = new Set<string>()
  let from = 0
  const PAGE = 5000
  while (true) {
    const { data } = await supabase.from(table).select(column).range(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    for (const row of data as any[]) ids.add(row[column])
    if (data.length < PAGE) break
    from += PAGE
  }
  return ids
}

async function fetchAllWrestlers() {
  const rows: { id: string; first_name: string; last_name: string }[] = []
  let from = 0
  const PAGE = 5000
  while (true) {
    const { data } = await supabase.from('wrestlers').select('id, first_name, last_name').range(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    rows.push(...(data as any[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return rows
}

console.log('Fetching all data...')
const [wrestlers, entryIds, boutSchool1Ids, boutSchool2Ids, dualSchoolAIds, dualSchoolBIds] = await Promise.all([
  fetchAllWrestlers(),
  fetchAllIds('tournament_entries', 'wrestler_id'),
  // wrestler1_id from bouts where wrestler1_school_id is not null
  (async () => {
    const ids = new Set<string>()
    let from = 0
    const PAGE = 5000
    while (true) {
      const { data } = await supabase.from('tournament_bouts')
        .select('wrestler1_id')
        .not('wrestler1_school_id', 'is', null)
        .range(from, from + PAGE - 1)
      if (!data || data.length === 0) break
      for (const r of data as any[]) ids.add(r.wrestler1_id)
      if (data.length < PAGE) break
      from += PAGE
    }
    return ids
  })(),
  (async () => {
    const ids = new Set<string>()
    let from = 0
    const PAGE = 5000
    while (true) {
      const { data } = await supabase.from('tournament_bouts')
        .select('wrestler2_id')
        .not('wrestler2_school_id', 'is', null)
        .range(from, from + PAGE - 1)
      if (!data || data.length === 0) break
      for (const r of data as any[]) ids.add(r.wrestler2_id)
      if (data.length < PAGE) break
      from += PAGE
    }
    return ids
  })(),
  // dual meet: wrestler_a linked to team1_school
  (async () => {
    const ids = new Set<string>()
    let from = 0
    const PAGE = 5000
    while (true) {
      const { data } = await supabase.from('dual_meet_matches')
        .select('wrestler_a_id, meet:dual_meets!inner(team1_school_id)')
        .not('dual_meets.team1_school_id', 'is', null)
        .range(from, from + PAGE - 1)
      if (!data || data.length === 0) break
      for (const r of data as any[]) ids.add(r.wrestler_a_id)
      if (data.length < PAGE) break
      from += PAGE
    }
    return ids
  })(),
  (async () => {
    const ids = new Set<string>()
    let from = 0
    const PAGE = 5000
    while (true) {
      const { data } = await supabase.from('dual_meet_matches')
        .select('wrestler_b_id, meet:dual_meets!inner(team2_school_id)')
        .not('dual_meets.team2_school_id', 'is', null)
        .range(from, from + PAGE - 1)
      if (!data || data.length === 0) break
      for (const r of data as any[]) ids.add(r.wrestler_b_id)
      if (data.length < PAGE) break
      from += PAGE
    }
    return ids
  })(),
])

const hasSchoolFromBout = new Set([...boutSchool1Ids, ...boutSchool2Ids])
const hasSchoolFromDual = new Set([...dualSchoolAIds, ...dualSchoolBIds])

let hasEntry = 0, dualResolvable = 0, noData = 0
const noDataSamples: string[] = []

for (const w of wrestlers) {
  if (entryIds.has(w.id)) { hasEntry++; continue }
  if (hasSchoolFromBout.has(w.id) || hasSchoolFromDual.has(w.id)) { dualResolvable++; continue }
  noData++
  if (noDataSamples.length < 5) noDataSamples.push(`${w.first_name} ${w.last_name} (${w.id})`)
}

console.log(`\nTotal wrestlers: ${wrestlers.length}`)
console.log(`Has postseason entries (school + weight from entries): ${hasEntry}`)
console.log(`No entries but resolvable via bouts/duals (fixed by our change): ${dualResolvable}`)
console.log(`No data at all — no entries, no bouts, no dual matches: ${noData}`)
console.log(`\nSample of no-data wrestlers:`)
for (const s of noDataSamples) console.log(' ', s)
