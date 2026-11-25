// same name + same school, two or more profiles: how far apart are their seasons?
import { createClient } from '@supabase/supabase-js'
import { normName } from '../../src/lib/playoffHistory/people'
import { window4 } from '../../src/lib/playoffHistory/identity'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const all = async (t: string, sel: string, f: (q: any) => any = q => q) => { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await f(db.from(t).select(sel)).order('id').range(i, i + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
for (const g of ['M', 'F']) {
  const ws = new Map((await all('wrestlers', 'id, first_name, last_name, graduation_year', q => q.eq('gender', g))).map(w => [w.id, w]))
  const tours = new Map((await all('tournaments', 'id, season_id', q => q.eq('gender', g))).map(t => [t.id, t.season_id]))
  const seasons = new Map<string, Set<number>>(), at = new Map<string, Set<string>>()
  for (const e of await all('tournament_entries', 'id, wrestler_id, school_id, tournament_id')) {
    if (!ws.has(e.wrestler_id) || !tours.has(e.tournament_id) || e.school_id == null) continue
    const w = ws.get(e.wrestler_id)!; const k = `${normName(`${w.first_name} ${w.last_name}`)}|${e.school_id}`
    ;(at.get(k) ?? at.set(k, new Set()).get(k)!).add(e.wrestler_id)
    ;(seasons.get(e.wrestler_id) ?? seasons.set(e.wrestler_id, new Set()).get(e.wrestler_id)!).add(tours.get(e.tournament_id)!)
  }
  let fit = 0, apart = 0, overlap = 0; const ex: string[] = []
  for (const [k, ids] of at) {
    if (ids.size < 2) continue
    const list = [...ids]
    const ys = list.flatMap(i => [...(seasons.get(i) ?? [])])
    const sets = list.map(i => [...(seasons.get(i) ?? [])])
    const clash = sets.some((a, i) => sets.some((b, j) => j > i && a.some(y => b.includes(y))))
    if (clash) overlap++
    else if (window4(ys, null).ok) { fit++; if (ex.length < 8) ex.push(`${k.split('|')[0]}: ${list.map(i => `[${[...(seasons.get(i) ?? [])].sort().join(',')}]`).join(' + ')}`) }
    else apart++
  }
  console.log(g, `| same name+school with 2+ profiles: fit one 4-season window ${fit} (likely one wrestler with a gap) | too far apart ${apart} (different wrestlers) | same season ${overlap} (different wrestlers)`)
  for (const e of ex) console.log('   ', e)
}
