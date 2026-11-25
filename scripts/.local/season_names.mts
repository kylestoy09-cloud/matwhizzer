// schools whose name today is a combination but which, in a history season, wrestled under another name with no
// co-op name set — candidates for a season name (Becton in 2013, not Becton-Wood-Ridge)
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const all = async (t: string, sel: string, f: (q: any) => any = q => q, key = 'id') => { const out: any[] = []; for (let i = 0; ; i += 1000) { const r = await f(db.from(t).select(sel)).order(key).range(i, i + 999); if (r.error) throw r.error; out.push(...r.data); if (r.data.length < 1000) return out } }
const schools = new Map((await all('schools', 'id, display_name')).map(s => [s.id, s.display_name]))
const ssn = new Set((await all('school_season_names', 'school_id, season_id, gender', q => q, 'school_id')).map(r => `${r.school_id}|${r.season_id}|${r.gender}`))
for (const g of ['M', 'F']) {
  const map = new Map((await all('playoff_history_schools', 'raw_name, school_id', q => q.eq('gender', g), 'raw_name')).map(r => [r.raw_name, r.school_id]))
  const used = new Map<string, Map<string, number>>()
  for (const e of await all('playoff_history_entrants', 'id, season_id, team', q => q.eq('gender', g))) {
    const id = map.get(e.team); if (id == null) continue
    const k = `${id}|${e.season_id}`; const m = used.get(k) ?? used.set(k, new Map()).get(k)!; m.set(e.team, (m.get(e.team) ?? 0) + 1)
  }
  const cands: string[] = []
  for (const [k, teams] of used) {
    const [id, season] = k.split('|').map(Number)
    const now = schools.get(id) ?? ''
    if (!/[\/-]/.test(now) || ssn.has(`${id}|${season}|${g}`)) continue
    const printed = [...teams].sort((a, b) => b[1] - a[1])[0][0]
    if (/[\/]/.test(printed)) continue   // printed as a co-op itself
    cands.push(`${season - 1}-${String(season).slice(2)} | ${now} | printed "${printed}"`)
  }
  const bySchool = new Map<string, string[]>(); for (const c of cands) { const [s, now, pr] = c.split(' | '); (bySchool.get(now) ?? bySchool.set(now, []).get(now)!).push(`${s} ${pr}`) }
  console.log(`${g}: ${cands.length} school-seasons, ${bySchool.size} schools`)
  for (const [now, v] of [...bySchool].sort()) console.log(`   ${now}: ${v.sort().join('; ').slice(0, 200)}`)
}
