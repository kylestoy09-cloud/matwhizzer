// Girls 2024-25 regions: 3rd / 4th placement rows from the 3rd place bouts added 2026-11-09 (2026-11-09).
// The placements table had only 1st and 2nd (24 rows per region) because the 3rd place bouts weren't stored.
// Built as the other regions' rows are (2025-26 Region 1, 20261109_girls_region1_placements.sql): 3rd place bout
// winner 3rd, loser 4th; the name column holds the profile name. Adds only places that are empty.
//   npx tsx --tsconfig tsconfig.json scripts/add_girls_2025_region_thirds_placements.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const rows: any[] = []
for (const t of [134, 135, 136, 137]) {
  const { data: ms } = await db.from('matches').select('weight_class_id, winner_entry_id, loser_entry_id, validated, w:tournament_entries!winner_entry_id(wrestlers(first_name,last_name)), l:tournament_entries!loser_entry_id(wrestlers(first_name,last_name))').eq('tournament_id', t).eq('round', '3rd_Place')
  const { data: pl } = await db.from('placements').select('weight_class_id, place').eq('tournament_id', t)
  const have = new Set((pl ?? []).map(p => `${p.weight_class_id}|${p.place}`))
  for (const m of ms ?? []) {
    if (!m.validated) continue
    for (const [place, entry, who] of [[3, m.winner_entry_id, (m as any).w], [4, m.loser_entry_id, (m as any).l]] as const) {
      if (!entry || have.has(`${m.weight_class_id}|${place}`)) continue
      rows.push({ tournament_id: t, weight_class_id: m.weight_class_id, place, entry_id: entry, wrestler_name_raw: `${who?.wrestlers?.first_name ?? ''} ${who?.wrestlers?.last_name ?? ''}`.trim() })
    }
  }
}
const by = rows.reduce((a: any, r) => { a[r.tournament_id] = (a[r.tournament_id] ?? 0) + 1; return a }, {})
console.log('rows to add:', rows.length, JSON.stringify(by))
if (!APPLY) process.exit(0)
const { data, error } = await db.from('placements').insert(rows).select('id')
if (error) throw error
fs.writeFileSync('docs/migrations/backups/20261109_girls_2025_region_placements_added.json', JSON.stringify(data!.map(d => d.id)))
console.log(`added ${data!.length} placements (ids: docs/migrations/backups/20261109_girls_2025_region_placements_added.json)`)
