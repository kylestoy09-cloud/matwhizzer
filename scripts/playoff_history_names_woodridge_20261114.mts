// Kyle 2026-11-14: (1) schools that are a co-op today but wrestled on their own in a history season show that
// season's solo name ("Lodi" in 2014-15, "Lenape Valley" before Hopatcong joined); (2) Wood-Ridge was its own team in
// boys 2015-16 to 2019-20 (printed "Wood Ridge" / "Wood-Ridge", Becton separately as "Becton"): those entries move
// from Becton-Wood-Ridge (#321) to Wood Ridge (#1223), and those seasons' team scores are recalculated.
//   npx tsx --tsconfig tsconfig.json scripts/playoff_history_names_woodridge_20261114.mts [--apply]
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { calcTeamScores } from '../src/lib/playoffHistory/load'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = <T,>(r: { data: T | null; error: { message: string } | null }, w: string): T => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as T }
const all = async (t: string, sel: string, f: (q: any) => any = q => q, key = 'id') => { const out: any[] = []; for (let i = 0; ; i += 1000) { const r = await f(db.from(t).select(sel)).order(key).range(i, i + 999); if (r.error) throw r.error; out.push(...r.data); if (r.data.length < 1000) return out } }
const BECTON = 321, WOODRIDGE = 1223
const backup: Record<string, unknown> = {}
// (2) Wood-Ridge
const wrNames = ['Wood-Ridge', 'Wood Ridge']
const wrTours = (await all('tournaments', 'id, season_id', q => q.eq('gender', 'M').in('season_id', [2016, 2017, 2018, 2019, 2020]))).map(t => t.id)
const wrEntries: any[] = []
for (let i = 0; i < wrTours.length; i += 40) wrEntries.push(...chk(await db.from('tournament_entries').select('id, school_id, school_context_raw, tournament_id').in('tournament_id', wrTours.slice(i, i + 40)).eq('school_id', BECTON).in('school_context_raw', wrNames), 'wr'))
console.log('Wood-Ridge entries to move', wrEntries.length)
backup.woodridge_entries = wrEntries
// (1) solo names
const SOLO: Record<string, string> = { 'Bordentown Regional/Florence': 'Bordentown Regional', 'Lenape Valley-Hopatcong': 'Lenape Valley', 'Leonia-Palisades': 'Leonia', 'Lodi/Saddle Brook': 'Lodi', 'Middlesex-Dunellen': 'Middlesex', 'Clayton/Glassboro': 'Clayton', 'Lyndhurst-North Arlington': 'Lyndhurst', 'Becton-Wood-Ridge': 'Becton' }
const schools = new Map((await all('schools', 'id, display_name')).map(s => [s.id, s.display_name]))
const have = new Set((await all('school_season_names', 'school_id, season_id, gender', q => q, 'school_id')).map(r => `${r.school_id}|${r.season_id}|${r.gender}`))
const rows: { school_id: number; season_id: number; gender: string; display_name: string }[] = []
for (const g of ['M', 'F']) {
  const map = new Map((await all('playoff_history_schools', 'raw_name, school_id', q => q.eq('gender', g), 'raw_name')).map(r => [r.raw_name, r.school_id]))
  const used = new Map<string, Map<string, number>>()
  for (const e of await all('playoff_history_entrants', 'id, season_id, team', q => q.eq('gender', g))) {
    let id = map.get(e.team); if (id == null) continue
    if (g === 'M' && wrNames.includes(e.team)) id = WOODRIDGE
    const k = `${id}|${e.season_id}`; const m = used.get(k) ?? used.set(k, new Map()).get(k)!; m.set(e.team, (m.get(e.team) ?? 0) + 1)
  }
  for (const [k, teams] of used) {
    const [id, season] = k.split('|').map(Number)
    const now = schools.get(id) ?? ''
    if (have.has(`${id}|${season}|${g}`)) continue
    const printed = [...teams].sort((a, b) => b[1] - a[1])[0][0]
    let name = SOLO[now]
    if (now === 'Ridgefield Park/Bogota') name = /bogota/i.test(printed) && !/ridgefield/i.test(printed) ? 'Bogota' : /ridgefield/i.test(printed) && !/bogota/i.test(printed) ? 'Ridgefield Park' : undefined as unknown as string
    if (id === BECTON && /wallington/i.test(printed)) name = 'Becton/Wallington'
    if (!name || /\//.test(printed) && id !== BECTON) continue
    rows.push({ school_id: id, season_id: season, gender: g, display_name: name })
  }
}
console.log('season names to add', rows.length); for (const r of rows.slice(0, 60)) console.log(`   ${r.gender} ${r.season_id - 1}-${String(r.season_id).slice(2)} ${schools.get(r.school_id)} → ${r.display_name}`)
if (!APPLY) process.exit(0)
fs.writeFileSync('docs/migrations/backups/20261114_season_names_woodridge.json', JSON.stringify({ ...backup, season_names_added: rows }, null, 1))
for (const e of wrEntries) chk(await db.from('tournament_entries').update({ school_id: WOODRIDGE }).eq('id', e.id).select('id'), 'move')
chk(await db.from('playoff_history_schools').update({ school_id: WOODRIDGE, decision: 'kyle', note: 'Kyle 2026-11-14: Wood-Ridge its own team then' }).eq('gender', 'M').in('raw_name', wrNames).select('raw_name'), 'map')
chk(await db.from('school_season_names').insert(rows).select('school_id'), 'names')
for (const y of [2016, 2017, 2018, 2019, 2020]) console.log('team scores', y, JSON.stringify(await calcTeamScores(db as never, 'M', y)))
console.log('applied')
