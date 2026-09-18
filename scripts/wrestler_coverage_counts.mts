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

// Use count queries — no row limit issues
const [
  { count: totalWrestlers },
  { count: hasEntry },
  // wrestlers in bouts with a resolved school1
  { count: hasBout1 },
  { count: hasBout2 },
  { count: hasDualA },
  { count: hasDualB },
] = await Promise.all([
  supabase.from('wrestlers').select('*', { count: 'exact', head: true }),
  supabase.from('tournament_entries').select('wrestler_id', { count: 'exact', head: true }),
  supabase.from('tournament_bouts').select('wrestler1_id', { count: 'exact', head: true }).not('wrestler1_school_id', 'is', null).not('wrestler1_id', 'is', null),
  supabase.from('tournament_bouts').select('wrestler2_id', { count: 'exact', head: true }).not('wrestler2_school_id', 'is', null).not('wrestler2_id', 'is', null),
  supabase.from('dual_meet_matches').select('wrestler_a_id', { count: 'exact', head: true }).not('wrestler_a_id', 'is', null),
  supabase.from('dual_meet_matches').select('wrestler_b_id', { count: 'exact', head: true }).not('wrestler_b_id', 'is', null),
])

// Count wrestlers with NO entry, NO bout ref, NO dual ref
// We need to page wrestlers and cross-reference — use sets built from each source

async function buildIdSet(table: string, col: string, filter?: { col: string; notNull: boolean }): Promise<Set<string>> {
  const s = new Set<string>()
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(col).range(from, from + 999)
    if (filter?.notNull) q = q.not(filter.col, 'is', null)
    const { data } = await q
    if (!data || data.length === 0) break
    for (const r of data as any[]) if (r[col]) s.add(r[col])
    if (data.length < 1000) break
  }
  return s
}

async function fetchAllWrestlers() {
  const rows: { id: string; first_name: string; last_name: string; is_stub: boolean }[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('wrestlers').select('id, first_name, last_name, is_stub').range(from, from + 999)
    if (!data || data.length === 0) break
    rows.push(...(data as any[]))
    if (data.length < 1000) break
  }
  return rows
}

console.log('Building ID sets...')
const [wrestlers, entryIds, bout1Ids, bout2Ids, dualAIds, dualBIds] = await Promise.all([
  fetchAllWrestlers(),
  buildIdSet('tournament_entries', 'wrestler_id'),
  buildIdSet('tournament_bouts', 'wrestler1_id', { col: 'wrestler1_school_id', notNull: true }),
  buildIdSet('tournament_bouts', 'wrestler2_id', { col: 'wrestler2_school_id', notNull: true }),
  buildIdSet('dual_meet_matches', 'wrestler_a_id'),
  buildIdSet('dual_meet_matches', 'wrestler_b_id'),
])

const boutIds = new Set([...bout1Ids, ...bout2Ids])
const dualIds = new Set([...dualAIds, ...dualBIds])

let withEntry = 0, fixedByFallback = 0, orphaned = 0, orphanedNonStub = 0
const orphanedSamples: string[] = []

for (const w of wrestlers) {
  if (entryIds.has(w.id)) { withEntry++; continue }
  if (boutIds.has(w.id) || dualIds.has(w.id)) { fixedByFallback++; continue }
  orphaned++
  if (!w.is_stub && orphanedSamples.length < 10) {
    orphanedSamples.push(`${w.first_name} ${w.last_name}`)
  }
  if (!w.is_stub) orphanedNonStub++
}

console.log(`\nTotal wrestlers in DB: ${wrestlers.length}`)
console.log(`  With postseason entries (unaffected):         ${withEntry}`)
console.log(`  Fixed by fallback (bout/dual school lookup):  ${fixedByFallback}`)
console.log(`  Orphaned — no entries, no bouts, no duals:   ${orphaned}`)
console.log(`    Of which non-stub (real profiles):          ${orphanedNonStub}`)
if (orphanedSamples.length > 0) {
  console.log(`\nSample orphaned non-stubs:`)
  for (const s of orphanedSamples) console.log(`  ${s}`)
}
