// Kyle 2026-11-13 ("yes ... review all of this"): offseason results that can't be the HS wrestler they were linked
// to by name (a NY school, 7-12 weight classes lighter, a 14U kid for an 11th grader, two kids at two weights in one
// event). Each moves to a new, unlinked prospect under the name and club the results list (one per name + club),
// so it stops counting for our wrestler. Backup: docs/migrations/backups/20261113_unlinked_results.json. Usage: [go]
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { splitName } from '../src/lib/hub'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
// [pool, wrestler's name, event (tournament), weight listed]
const WRONG: [string, string, string, string][] = [
  ['boys', 'Christian Wolf', 'Super 32 Challenge', '113'], ['boys', 'Aiden Gonzalez', 'NHSCA High School Nationals', '120'],
  ['boys', 'Angel Mendoza', 'War at the Shore (HS Open)', '115'], ['boys', 'Chase Colon', 'War at the Shore (HS Open)', '122'],
  ['boys', 'Miguel Cruz', 'War at the Shore (HS Open)', '122'], ['boys', 'Sebastian Santos', 'War at the Shore (HS Open)', '154'],
  ['boys', 'Max Garcia', 'Journeymen Fall Classic', '90'], ['boys', 'Anthony Messina', 'Journeymen Fall Classic', '100'],
  ['boys', 'Anthony Messina', 'USAW-NJ Freestyle & Greco State Championships', '88'], ['boys', 'Brody Brown', 'USAW Northeast Regional Championships', '120'],
  ['boys', 'Edward Lee', 'USAW Northeast Regional Championships', '80'], ['girls', 'Angelica Garcia', 'USAW Northeast Regional Championships', '105'],
  ['boys', 'Noah Hernandez', 'Super 32 NJ Early Qualifier', '132'],
]
const backup: any[] = [], moves: { g: string; ids: number[]; name: string; club: string | null }[] = []
for (const [g, who, tName, weight] of WRONG) {
  const { data: t } = await db.from(`${g}_hub_tournaments`).select('id').eq('name', tName).single()
  const { data: evs } = await db.from(`${g}_hub_events`).select('id').eq('tournament_id', t!.id)
  const [first, ...rest] = who.split(' ')
  const { data: ws } = await db.from('wrestlers').select('id').eq('first_name', first).eq('last_name', rest.join(' ')).eq('gender', g === 'boys' ? 'M' : 'F')
  const { data: ps } = await db.from(`${g}_prospects`).select('*').in('wrestler_id', (ws ?? []).map(w => w.id))
  const { data: pl } = await db.from(`${g}_hub_placements`).select('*').in('event_id', (evs ?? []).map(e => e.id)).in('prospect_id', (ps ?? []).map(p => p.id)).eq('weight', weight)
  if (pl?.length !== 1) throw new Error(`${who} ${tName} ${weight}: found ${pl?.length}`)
  backup.push({ pool: g, wrestler: who, prospect: ps!.find(p => p.id === pl[0].prospect_id), placement: pl[0] })
  const key = `${pl[0].name_listed}|${pl[0].club_listed ?? ''}`
  const m = moves.find(x => x.g === g && `${x.name}|${x.club ?? ''}` === key)
  if (m) m.ids.push(pl[0].id); else moves.push({ g, ids: [pl[0].id], name: pl[0].name_listed, club: pl[0].club_listed })
  console.log(`${who}: ${tName} ${pl[0].division} ${weight} #${pl[0].place} [${pl[0].club_listed ?? ''}] → new prospect "${pl[0].name_listed}"`)
}
const { count: bouts } = await db.from('boys_hub_bouts').select('*', { count: 'exact', head: true }).in('winner_prospect_id', backup.map(b => b.prospect.id))
console.log('bouts on those prospects (boys):', bouts)
writeFileSync('docs/migrations/backups/20261113_unlinked_results.json', JSON.stringify(backup, null, 1))
if (process.argv[2] === 'go') {
  for (const m of moves) {
    const { data, error } = await db.from(`${m.g}_prospects`).insert({ ...splitName(m.name), state: null, club_listed: m.club, notes: 'Split off 2026-11-13: results first linked by name to a different wrestler' }).select('id').single()
    if (error) throw error
    const { error: e2 } = await db.from(`${m.g}_hub_placements`).update({ prospect_id: data.id }).in('id', m.ids)
    if (e2) throw e2
  }
  console.log('moved', backup.length, 'results to', moves.length, 'new prospects')
}
