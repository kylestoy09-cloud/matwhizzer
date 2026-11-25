// Compare what the fixed reader gets from each loaded file with what is in the hubs
import { createClient } from '@supabase/supabase-js'
import { load, rowsOf } from './build_podiums.mts'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(t: string, sel: string, f: (q: any) => any) { const out: any[] = []; for (let a = 0; ; a += 1000) { const { data, error } = await f(db.from(t).select(sel)).order('id').range(a, a + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
const sets: [string, string[], [string, string][]][] = [
  ['Early', ['super 32 early qualifier.rtf', '2026NJSuper32EarlyEntry.csv'], [['boys', 'Super 32 NJ Early Qualifier'], ['girls', 'Super 32 NJ Early Qualifier'], ['mixed', 'Super 32 NJ Early Qualifier (MS / Youth)']]],
  ['NHSCA', ['NHSCA High School Nationals.rtf', '2026NHSCAHighSchoolNationals.csv'], [['boys', 'NHSCA High School Nationals'], ['girls', 'NHSCA High School Nationals'], ['mixed', 'NHSCA Middle School Nationals']]],
  ['WAR', ['war at the shore.rtf', '2026WarattheShore.csv'], [['boys', 'War at the Shore (HS Open)'], ['girls', 'War at the Shore (HS Open)'], ['mixed', 'War at the Shore']]],
]
for (const [label, files, where] of sets) {
  const rows = rowsOf(await load(files))
  const key = (d: string, w: string, p: number, n: string) => `${d}|${w}|${p}|${n}`
  const fileKeys = new Set(rows.map(r => key(r.division, r.weight, r.place, r.name)))
  const dbKeys = new Set<string>(); const dbDivs = new Set<string>()
  for (const [g, name] of where) {
    const { data: t } = await db.from(`${g}_hub_tournaments`).select('id').eq('name', name).single()
    const { data: evs } = await db.from(`${g}_hub_events`).select('id').eq('tournament_id', t!.id)
    for (const e of evs ?? []) for (const r of await all(`${g}_hub_placements`, 'division, weight, place, name_listed', q => q.eq('event_id', e.id))) { dbKeys.add(key(r.division, r.weight, r.place, r.name_listed)); dbDivs.add(r.division) }
  }
  const inFileOnly = [...fileKeys].filter(k => !dbKeys.has(k) && dbDivs.has(k.split('|')[0]))
  const inDbOnly = [...dbKeys].filter(k => !fileKeys.has(k))
  console.log(`${label}: file ${fileKeys.size}, loaded ${dbKeys.size} | new in file (tracked divisions) ${inFileOnly.length} e.g. ${inFileOnly.slice(0, 4).join(' ; ')} | loaded but not in file now ${inDbOnly.length} e.g. ${inDbOnly.slice(0, 4).join(' ; ')}`)
}
