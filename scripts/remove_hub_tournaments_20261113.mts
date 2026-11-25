// Kyle 2026-11-13: "permanently remove whos number 1, beast of east, walsh jesuit, powerade, escape rock and national
// prep from the list. remove uww u17 and u20 world team trials and tyrant duals". Counts what each has (seasons, places,
// bouts) on every list first and backs the rows up; deletes only tournaments with nothing attached. Usage: [go]
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const NAMES = ["Who's Number One (FloWrestling WNO)", 'Beast of the East', 'Walsh Jesuit Ironman', 'PowerAde Tournament', 'Escape the Rock', 'National Prep Championship', 'UWW U17 & U20 World Team Trials', 'Tyrant Fall & Spring Duals']
const backup: any[] = [], empty: { pool: string; id: number; name: string }[] = []
let blocked = 0
for (const pool of ['boys', 'girls', 'mixed']) {
  const { data: ts } = await db.from(`${pool}_hub_tournaments`).select('*').in('name', NAMES)
  for (const t of ts ?? []) {
    const { data: evs } = await db.from(`${pool}_hub_events`).select('*').eq('tournament_id', t.id)
    const ids = (evs ?? []).map(e => e.id)
    const pl = ids.length ? (await db.from(`${pool}_hub_placements`).select('*', { count: 'exact', head: true }).in('event_id', ids)).count : 0
    const bo = ids.length ? (await db.from(`${pool}_hub_bouts`).select('*', { count: 'exact', head: true }).in('event_id', ids)).count : 0
    console.log(`${pool.padEnd(5)} ${t.name.padEnd(38)} seasons ${ids.length} · places ${pl} · bouts ${bo}`)
    backup.push({ pool, tournament: t, events: evs })
    if (ids.length || pl || bo) blocked++; else empty.push({ pool, id: t.id, name: t.name })
  }
}
writeFileSync('docs/migrations/backups/20261113_removed_hub_tournaments.json', JSON.stringify(backup, null, 1))
console.log(`to delete ${empty.length}; with data (kept) ${blocked}`)
if (process.argv[2] === 'go') {
  for (const e of empty) { const { error } = await db.from(`${e.pool}_hub_tournaments`).delete().eq('id', e.id); if (error) throw error }
  console.log('deleted', empty.length)
}
