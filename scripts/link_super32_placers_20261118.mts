// Kyle 2026-11-18: the Super 32 placers the import couldn't tie to one wrestler because several share the name — read
// from their records, each is a different person; the placer is the one whose school, class and weight fit:
//   Louie Cerchio 2022 → Louis Cerchio (Delbarton 2021–24; Lou Cerchio is a 1990 Scotch Plains placer)
//   Adrian DeJesus 2023, 2024 → Adrian DeJesus, class of 2025 (St. Peter's / DePaul / St. Joseph; not the Camden
//     class of 2027 Adrian De'jesus)
//   Alex Reyes 2024, 2025 (190) → Alexander Reyes, Holmdel class of 2026 (190 in 2025-26)
// Sets the placers' prospects' wrestler_id (only where none is set). Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const LINKS: [string, string, string][] = [   // name listed, wrestler first + last, school check
  ['Louie Cerchio', 'Louis|Cerchio', 'Delbarton'],
  ['Adrian DeJesus', 'Adrian|DeJesus', 'St. Joseph'],
  ['Alex Reyes', 'Alexander|Reyes', 'Holmdel'],
]
const { data: ev } = await db.from('boys_hub_events').select('id, season').eq('tournament_id', 18)
for (const [listed, wn, school] of LINKS) {
  const [first, last] = wn.split('|')
  const { data: ws } = await db.from('wrestlers').select('id, graduation_year').eq('gender', 'M').eq('first_name', first).eq('last_name', last)
  // the one at that school
  let pick: string | null = null
  for (const w of ws ?? []) {
    const { data: en } = await db.from('tournament_entries').select('school:schools(display_name)').eq('wrestler_id', w.id)
    const { data: al } = await db.from('wrestler_name_aliases').select('school:schools(display_name)').eq('wrestler_id', w.id)
    if ([...(en ?? []), ...(al ?? [])].some((r: any) => (r.school?.display_name ?? '').includes(school))) { if (pick) throw new Error(`two ${wn} at ${school}`); pick = w.id }
  }
  if (!pick) throw new Error(`no ${wn} at ${school}`)
  const { data: pl } = await db.from('boys_hub_placements').select('id, event_id, weight, place, prospect_id').eq('name_listed', listed).in('event_id', (ev ?? []).map(e => e.id))
  const pids = [...new Set((pl ?? []).map(p => p.prospect_id))]
  console.log(`${listed} → ${wn} (${school}) ${pick.slice(0, 8)}: ${(pl ?? []).map(p => `${ev!.find(e => e.id === p.event_id)?.season} ${p.weight} ${p.place}`).join(', ')} · prospects ${pids.join(', ')}`)
  if (APPLY) { const { error } = await db.from('boys_prospects').update({ wrestler_id: pick }).in('id', pids).is('wrestler_id', null); if (error) throw new Error(error.message) }
}
