// NJ Wrestling History's 2021 boys results, corrected from the TrackWrestling exports + FloWrestling bracket (Kyle
// 2026-11-13: "yes please fix those errors" / "make any fixes so that the 2021 results show correctly"):
//   * state 126, places 2-8: NJWH repeats the 120 placers; the real 126 placers come from the 2021 state export
//     (the Flo bracket agrees)
//   * regions: 2021's four COVID super regions are numbered 1/3/5/7 by NJWH; region_name gives each its name
//     (North 1, North 2, Central, South), so the history tabs read "Super Region South", not "Region 7"
// Backup first. --apply to write.
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { readYear } from '../src/lib/playoffHistory/readFiles'
import { buildBrackets } from '../src/lib/playoffHistory/brackets'
import { schoolMatcher } from '../src/lib/historySchools'
import { pickSchool } from '../src/lib/playoffHistory/schoolNames'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = <T,>(r: { data: T; error: { message: string } | null }, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data }
const APPLY = process.argv.includes('--apply')
const m = await schoolMatcher(db as never)
const st = buildBrackets(readYear(2021).events.find(e => e.kind === 'state')!).find(b => b.weight === 126)!
const teamOf = (name: string) => st.entrants.find(e => e.name === name)?.team ?? null
const schoolName = (team: string | null) => { if (!team) return null; const p = pickSchool(team, m); return p.school_id ? m.school.get(p.school_id)!.display_name : team }
const s126 = chk(await db.from('history_finishes').select('*').eq('gender', 'M').eq('year', 2021).eq('level', 'state').eq('weight', '126').order('place'), '126')
const regions = chk(await db.from('history_finishes').select('*').eq('gender', 'M').eq('year', 2021).eq('level', 'region'), 'regions')
const NAME: Record<number, string> = { 1: 'Super Region North 1', 3: 'Super Region North 2', 5: 'Super Region Central', 7: 'Super Region South' }
const upd126 = s126.filter(r => r.place >= 2).map(r => { const n = st.places.get(r.place)!; return { id: r.id, before: `${r.name} (${r.school})`, name: n, school: schoolName(teamOf(n)) } })
for (const u of upd126) console.log(`126 place ${s126.find(r => r.id === u.id)!.place}: ${u.before} → ${u.name} (${u.school})`)
console.log(`regions: ${regions.length} rows get region_name`, JSON.stringify(Object.fromEntries(Object.entries(NAME).map(([k, v]) => [k, `${v} (${regions.filter(r => r.region === Number(k)).length})`]))))
if (regions.some(r => !NAME[r.region])) throw new Error('a 2021 region number outside 1/3/5/7')
if (!APPLY) process.exit(0)
fs.writeFileSync('docs/migrations/backups/20261113_history_2021_fix.json', JSON.stringify({ state126: s126, regions }, null, 1))
for (const u of upd126) chk(await db.from('history_finishes').update({ name: u.name, school: u.school, note: 'corrected 2026-11-13 from the 2021 state export (NJWH repeated the 120 placers)' }).eq('id', u.id).select('id'), 'update 126')
for (const [k, v] of Object.entries(NAME)) chk(await db.from('history_finishes').update({ region_name: v }).eq('gender', 'M').eq('year', 2021).eq('level', 'region').eq('region', Number(k)).select('id'), 'update region')
console.log('applied')
