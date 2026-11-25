import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const flo: any[] = JSON.parse(readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/jm.json', 'utf8'))
const loaded: any[] = []
for (const [g, name] of [['boys', 'Journeymen Fall Classic'], ['girls', 'Journeymen Fall Classic'], ['mixed', 'Journeymen Fall Classic (Overflo MS Division)']]) {
  const { data: t } = await db.from(`${g}_hub_tournaments`).select('id').eq('name', name).single()
  const { data: evs } = await db.from(`${g}_hub_events`).select('id').eq('tournament_id', t!.id)
  for (const e of evs ?? []) { const { data } = await db.from(`${g}_hub_placements`).select('division, weight, place, place_to, name_listed').eq('event_id', e.id); loaded.push(...(data ?? []).map(r => ({ ...r, g }))) }
}
const norm = (d: string) => d.replace(/\s/g, '').toLowerCase()
const key = (d: string, w: string, n: string) => `${norm(d)}|${w.replace(/ Pool [A-Z]$/, '')}|${n.toLowerCase()}`
const L = new Map(loaded.map(r => [key(r.division, r.weight, r.name_listed), r]))
let same = 0, diff: string[] = [], missing: string[] = []
for (const f of flo) {
  const r = L.get(key(f.div, f.weight, f.name))
  if (!r) { missing.push(`${f.div} ${f.weight} ${f.place} ${f.name}`); continue }
  if (r.place === f.place || (r.place_to && f.place >= r.place && f.place <= r.place_to)) same++
  else diff.push(`${f.div} ${f.weight} ${f.name}: Flo ${f.place}, ours ${r.place}${r.place_to ? '-' + r.place_to : ''}`)
}
console.log(`Flo places ${flo.length}: agree ${same}, differ ${diff.length}, not in what we loaded ${missing.length}`)
console.log('DIFFER', diff.slice(0, 25).join('\n  '))
const byW = new Map<string, number>(); for (const m of missing) { const k = m.split(' ').slice(0, 2).join(' '); byW.set(k, (byW.get(k) ?? 0) + 1) }
console.log('MISSING by weight', [...byW].map(([k, n]) => `${k}:${n}`).join(' '))
