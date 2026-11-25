// Kyle 2026-11-13 ("1 - ok"): the Journeymen brackets whose places differ from Flo's placements take Flo's places.
// Per bracket: back up, remove the loaded places through Flo's deepest listed place (and any kid Flo places), keep
// deeper places Flo doesn't list; load_more.mts "Journeymen Flo" with ONLY=… then loads Flo's. Usage: [go]
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { load, rowsOf } from './build_podiums.mts'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const flo = rowsOf(await load(['2026 Journeymen Fall Classic.rtfd']))
const loaded: any[] = []
for (const [g, name] of [['boys', 'Journeymen Fall Classic'], ['girls', 'Journeymen Fall Classic'], ['mixed', 'Journeymen Fall Classic (Overflo MS Division)']]) {
  const { data: t } = await db.from(`${g}_hub_tournaments`).select('id').eq('name', name).single()
  const { data: evs } = await db.from(`${g}_hub_events`).select('id').eq('tournament_id', t!.id)
  for (const e of evs ?? []) { const { data } = await db.from(`${g}_hub_placements`).select('*').eq('event_id', e.id); loaded.push(...(data ?? []).map(r => ({ ...r, _g: g }))) }
}
const bk = (d: string, w: string) => `${d}|${w.replace(/ Pool [A-Z]$/, '')}`
const remove: any[] = [], only: string[] = []
for (const b of [...new Set(flo.map(r => bk(r.division, r.weight)))]) {
  const f = flo.filter(r => bk(r.division, r.weight) === b), l = loaded.filter(r => bk(r.division, r.weight) === b)
  if (!l.length) continue
  const ok = f.every(x => l.some(y => y.name_listed.toLowerCase() === x.name.toLowerCase() && (y.place === x.place || (y.place_to && x.place >= y.place && x.place <= y.place_to))))
  if (ok) continue
  const deepest = Math.max(...f.map(x => x.place)), names = new Set(f.map(x => x.name.toLowerCase()))
  const gone = l.filter(r => r.place <= deepest || names.has(r.name_listed.toLowerCase()))
  remove.push(...gone); only.push(b)
  console.log(`${b}: remove ${gone.length} of ${l.length} loaded, Flo lists ${f.length} (through ${deepest})`)
}
writeFileSync('docs/migrations/backups/20261113_journeymen_17_brackets.json', JSON.stringify(remove, null, 1))
console.log(`brackets ${only.length}, rows to remove ${remove.length}\nONLY=${only.join(',')}`)
if (process.argv[2] === 'go') {
  for (const g of ['boys', 'girls', 'mixed']) {
    const ids = remove.filter(r => r._g === g).map(r => r.id)
    if (ids.length) { const { error } = await db.from(`${g}_hub_placements`).delete().in('id', ids); if (error) throw error }
  }
  console.log('removed')
}
