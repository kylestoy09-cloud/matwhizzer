// Per bracket: does what's loaded (from the bout file) agree with Flo's placements for every kid Flo lists?
import { createClient } from '@supabase/supabase-js'
import { load, rowsOf } from './build_podiums.mts'
import * as H from '../../src/lib/hubFiles'
import { readFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
const sets: [string, string, [string, string][]][] = ([
  ['Journeymen', '2026 Journeymen Fall Classic.rtfd', [['boys', 'Journeymen Fall Classic'], ['girls', 'Journeymen Fall Classic'], ['mixed', 'Journeymen Fall Classic (Overflo MS Division)']]],
  ['NJ FS', '2026 New Jersey Freestyle & Greco State Championship Placements.rtfd', [['boys', 'USAW-NJ Freestyle & Greco State Championships'], ['girls', 'USAW-NJ Freestyle & Greco State Championships'], ['mixed', 'USAW-NJ Freestyle & Greco State Championships (Youth / 14U)']]],
] as [string, string, [string, string][]][]).filter(x => !process.argv[2] || x[0] === process.argv[2])
const norm = (d: string) => d.replace(/\s/g, '').toLowerCase()
for (const [label, file, where] of sets) {
  const flo = rowsOf(await load([file]))
  const loaded: any[] = []
  for (const [g, name] of where) {
    const { data: t } = await db.from(`${g}_hub_tournaments`).select('id').eq('name', name).single()
    const { data: evs } = await db.from(`${g}_hub_events`).select('id').eq('tournament_id', t!.id)
    for (const e of evs ?? []) { const { data } = await db.from(`${g}_hub_placements`).select('id, division, weight, place, place_to, name_listed').eq('event_id', e.id); loaded.push(...(data ?? []).map(r => ({ ...r, g, event_id: e.id }))) }
  }
  const bk = (d: string, w: string) => `${norm(d)}|${w.replace(/ Pool [A-Z]$/, '')}`
  const brackets = [...new Set(flo.map(r => bk(r.division, r.weight)))]
  let agree = 0, differ = 0, missing = 0, agreeRows = 0
  const diffList: string[] = [], missList: string[] = []
  for (const b of brackets) {
    const f = flo.filter(r => bk(r.division, r.weight) === b)
    const l = loaded.filter(r => bk(r.division, r.weight) === b)
    if (!l.length) { missing++; missList.push(`${b} (${f.length})`); continue }
    const ok = f.every(x => l.some(y => y.name_listed.toLowerCase() === x.name.toLowerCase() && (y.place === x.place || (y.place_to && x.place >= y.place && x.place <= y.place_to))))
    if (ok) { agree++; agreeRows += l.length } else { differ++; diffList.push(`${b} (loaded ${l.length}, Flo ${f.length})`) }
  }
  console.log(`\n${label}: Flo brackets ${brackets.length} — agree ${agree}, differ ${differ}, not loaded ${missing}`)
  console.log('  differ:', diffList.join(', '))
  console.log('  not loaded:', missList.join(', '))
}
// Over on the roster
const ros = H.parseRoster(H.rtfToText(readFileSync(`${B}/Journeymen Fall Classic.rtf`, 'utf8')))
console.log('\nJourneymen roster entries in Over:', ros.filter(r => r.division === 'Over').length)
