// How middle school state placers did in their freshman postseason (Kyle 2026-11-13). Cohorts: the 2024 USAW-NJ
// Kids Scholastic States (8th graders → freshmen 2024-25, class of 2028) and 2025 (→ 2025-26, class of 2029).
// A placer is matched to one of our wrestlers by name AND class year (2024's file has no roster, so no grades or
// divisions; the class year is what ties the kid to a freshman). Freshman postseason: district / region / state
// entries and places in MatWhizzer. Writes a CSV.
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { parseBoutExport, bracketsFrom, contested, podiumsFromBouts, parseRoster, rosterIndex, rtfToText, placesFrom } from '../src/lib/hubFiles'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const MS = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/Middle School Championships`
async function all<T>(f: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: unknown }>) { const out: T[] = []; for (let a = 0; ; a += 1000) { const { data, error } = await f(a, a + 999); if (error) throw error; out.push(...(data ?? [])); if ((data ?? []).length < 1000) return out } }
const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()

type Placer = { year: number; division: string; weight: string; place: number; name: string; team: string }
const placers: Placer[] = []
{ // 2024: no roster
  for (const b of bracketsFrom(parseBoutExport(readFileSync(`${MS}/2024 Middle School Boys.csv`, 'utf8'))).filter(contested))
    for (const p of placesFrom(b)) if (!p.place_to && p.place <= 8) placers.push({ year: 2024, division: '(no roster)', weight: b.weight, place: p.place, name: p.person.name, team: p.person.team })
}
{ // 2025: roster names the divisions
  const idx = rosterIndex(parseRoster(rtfToText(readFileSync(`${MS}/2025 New Jersey Scholastic State Championship.rtf`, 'utf8'))))
  for (const r of podiumsFromBouts(readFileSync(`${MS}/2025 Middle School Boys.csv`, 'utf8'), idx).rows)
    if (!r.place_to && r.place <= 8) placers.push({ year: 2025, division: r.division, weight: r.weight, place: r.place, name: r.name, team: r.team })
}

const wrestlers = await all<{ id: string; first_name: string; last_name: string; graduation_year: number | null; gender: string }>((a, b) => db.from('wrestlers').select('id, first_name, last_name, graduation_year, gender').in('graduation_year', [2028, 2029]).order('id').range(a, b))
const byName = new Map<string, typeof wrestlers>()
for (const w of wrestlers) { const k = `${norm(`${w.first_name} ${w.last_name}`)}|${w.graduation_year}`; byName.set(k, [...(byName.get(k) ?? []), w]) }

// freshman postseason
const ts = await all<{ id: number; season_id: number; tournament_type: string; name: string }>((a, b) => db.from('tournaments').select('id, season_id, tournament_type, name').in('season_id', [2025, 2026]).order('id').range(a, b))
const level = (t: string) => (/state/.test(t) ? 'State' : /region/.test(t) ? 'Region' : 'District')
const tMap = new Map(ts.map(t => [t.id, t]))
const ids = [...new Set(wrestlers.map(w => w.id))]
const entries: { id: number; wrestler_id: string; tournament_id: number; school_id: number | null }[] = []
for (let i = 0; i < ids.length; i += 200) entries.push(...(await all<{ id: number; wrestler_id: string; tournament_id: number; school_id: number | null }>((a, b) => db.from('tournament_entries').select('id, wrestler_id, tournament_id, school_id').in('wrestler_id', ids.slice(i, i + 200)).in('tournament_id', ts.map(t => t.id)).order('id').range(a, b))))
const placeOf = new Map<number, number>()
const eIds = entries.map(e => e.id)
for (let i = 0; i < eIds.length; i += 300) { const { data } = await db.from('placements').select('entry_id, place').in('entry_id', eIds.slice(i, i + 300)); for (const p of data ?? []) placeOf.set(p.entry_id, p.place) }
const sIds = [...new Set(entries.map(e => e.school_id).filter(Boolean))] as number[]
const school = new Map<number, string>()
for (let i = 0; i < sIds.length; i += 300) { const { data } = await db.from('schools').select('id, display_name').in('id', sIds.slice(i, i + 300)); for (const s of data ?? []) school.set(s.id, s.display_name) }

const RANK = { State: 3, Region: 2, District: 1 } as const
const rows: string[] = ['ms_year,ms_division,ms_weight,ms_place,name,ms_team,matched,hs_school,freshman_season,furthest,best_finish,district,region,state']
const summary = new Map<string, number>()
let matched = 0, ambiguous = 0
for (const p of placers) {
  const season = p.year + 1, grad = p.year + 4          // 2024 MS (8th grade) → 2024-25 freshman (season 2025), class of 2028
  const ws = byName.get(`${norm(p.name)}|${grad}`) ?? []
  if (ws.length !== 1) {
    if (ws.length > 1) ambiguous++
    rows.push([p.year, p.division, p.weight, p.place, p.name, p.team, ws.length > 1 ? 'two possible' : 'not found', '', '', '', '', '', '', ''].map(x => `"${String(x).replace(/"/g, '""')}"`).join(','))
    continue
  }
  matched++
  const w = ws[0]
  const mine = entries.filter(e => e.wrestler_id === w.id && tMap.get(e.tournament_id)?.season_id === season)
  const at = (lv: string) => mine.filter(e => level(tMap.get(e.tournament_id)!.tournament_type) === lv)
  const fmt = (lv: string) => { const es = at(lv); if (!es.length) return ''; const pl = es.map(e => placeOf.get(e.id)).filter((x): x is number => !!x); return pl.length ? `${Math.min(...pl)}` : 'entered' }
  const furthest = (['State', 'Region', 'District'] as const).find(lv => at(lv).length) ?? 'No postseason'
  const best = furthest === 'No postseason' ? '' : fmt(furthest)
  const outcome = furthest === 'State' ? (Number(best) && Number(best) <= 8 ? 'State placer' : 'State qualifier') : furthest === 'Region' ? 'Region (no state)' : furthest === 'District' ? 'District only' : 'No postseason entry'
  const band = p.place === 1 ? 'MS champion' : p.place <= 2 ? 'MS finalist' : p.place <= 4 ? 'MS 3rd–4th' : 'MS 5th–8th'
  summary.set(`${w.gender}|${band}|${outcome}`, (summary.get(`${w.gender}|${band}|${outcome}`) ?? 0) + 1)
  const sch = mine.map(e => school.get(e.school_id ?? 0)).find(Boolean) ?? ''
  rows.push([p.year, p.division, p.weight, p.place, p.name, p.team, 'yes', sch, `${season - 1}-${String(season).slice(2)}`, furthest, best, fmt('District'), fmt('Region'), fmt('State')].map(x => `"${String(x).replace(/"/g, '""')}"`).join(','))
}
const file = `${process.env.HOME}/Desktop/wrestling_brackets/Notes & Reports/ms_states_to_freshman_postseason_20261113.csv`
writeFileSync(file, rows.join('\n'))
console.log(`placers 1st-8th: ${placers.length} (2024 ${placers.filter(p => p.year === 2024).length}, 2025 ${placers.filter(p => p.year === 2025).length}) | matched to a freshman ${matched} | two possible ${ambiguous}`)
const bands = ['MS champion', 'MS finalist', 'MS 3rd–4th', 'MS 5th–8th'], outs = ['State placer', 'State qualifier', 'Region (no state)', 'District only', 'No postseason entry']
for (const g of ['M', 'F']) {
  console.log(`\n${g === 'M' ? 'BOYS' : 'GIRLS'}: ${['band', ...outs].join(' | ')}`)
  for (const b of bands) console.log([b, ...outs.map(o => summary.get(`${g}|${b}|${o}`) ?? 0)].join(' | '))
}
console.log('file', file)
