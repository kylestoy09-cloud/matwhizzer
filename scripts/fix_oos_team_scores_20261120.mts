// Team scores credited to NJ schools at out-of-state tournaments (Kyle 2026-11-20: "last year's powerade has two
// franklins and williamstown listed as nj schools … none of them are nj schools. how were these matches confirmed?").
// They weren't: the team-score import matched each printed name to a school by name alone, so a local team named like an
// NJ school ("Franklin", "Williamstown", "Westfield") was taken as NJ. Each fixed here was checked: its wrestlers in the
// tournament files / bouts are no NJ wrestlers on file, and its real school comes from the files ("Franklin-MA",
// "Williamstown-WV"), the bouts (already linked to Ridgefield (CT), Notre Dame (CT), Delaware Valley (PA)) or a lookup
// (Westfield's Connor Maddox — Indiana; Highland (Medina) and Columbia — Ohio; Edison's Hermes family — Milan Edison,
// Ohio; Warren Township — Illinois). Overbrook (girls, Ralph Wetzel Classic) is left for Kyle. Backup first.
// Dry run unless --apply.   npx tsx scripts/fix_oos_team_scores_20261120.mts [--apply]
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { createOosSchool } from '../src/lib/oosSchool'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const FIX: { tournament: string; season: string; printed: string; to: number | { name: string; state: string } }[] = [
  { tournament: 'Powerade', season: '2025-26', printed: 'Franklin Regional', to: { name: 'Franklin Regional', state: 'PA' } },
  { tournament: 'Powerade', season: '2025-26', printed: 'Franklin', to: { name: 'Franklin', state: 'MA' } },
  { tournament: 'Powerade', season: '2025-26', printed: 'Williamstown', to: 1201 },
  { tournament: 'Iron Man Tournament', season: '2025-26', printed: 'Warren Township', to: { name: 'Warren Township', state: 'IL' } },
  { tournament: 'Iron Man Tournament', season: '2025-26', printed: 'Westfield', to: { name: 'Westfield', state: 'IN' } },
  { tournament: 'Iron Man Tournament', season: '2025-26', printed: 'Edison', to: { name: 'Milan Edison', state: 'OH' } },
  { tournament: 'Iron Man Tournament', season: '2025-26', printed: 'Highland', to: { name: 'Highland', state: 'OH' } },
  { tournament: 'Iron Man Tournament', season: '2025-26', printed: 'Columbia', to: { name: 'Columbia', state: 'OH' } },
  { tournament: 'Beast of the East', season: '2025-26', printed: 'Ridgefield Memorial', to: 737 },
  { tournament: 'East Coast Catholic Classic', season: '2025-26', printed: 'Notre Dame', to: 904 },
  { tournament: 'Bethlehem Holiday Classic', season: '2025-26', printed: 'Delaware Valley', to: 1200 },
]
const backup: unknown[] = []
for (const f of FIX) {
  const { data: t } = await db.from('in_season_tournaments').select('id').eq('name', f.tournament).eq('season', f.season).single()
  const { data: rows } = await db.from('in_season_tournament_team_scores').select('*, school:schools!school_id(display_name, is_nj)').eq('tournament_id', t!.id).eq('school_name', f.printed)
  const row = (rows ?? []).find(r => (r as { school: { is_nj: boolean } | null }).school?.is_nj)
  if (!row) { console.log(`${f.tournament} — "${f.printed}": no NJ-credited row (already fixed?)`); continue }
  backup.push(row)
  const target = typeof f.to === 'number' ? f.to : APPLY ? (await createOosSchool(db, f.to.name, f.to.state)).id : `new ${f.to.name} (${f.to.state})`
  console.log(`${f.tournament} #${row.place} "${f.printed}": ${(row as { school: { display_name: string } }).school.display_name} (NJ) → ${typeof f.to === 'number' ? f.to : `${f.to.name} (${f.to.state})`}`)
  if (APPLY) { const { error } = await db.from('in_season_tournament_team_scores').update({ school_id: target }).eq('id', row.id); if (error) throw new Error(error.message) }
}
if (APPLY) writeFileSync('docs/migrations/backups/20261120_oos_team_scores.json', JSON.stringify(backup, null, 1))
console.log(APPLY ? 'applied (backup docs/migrations/backups/20261120_oos_team_scores.json)' : 'dry run')
