import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const id = 269
const meets = (await db.from('dual_meets').select('id').eq('season_id', 2026).eq('gender', 'M').or(`team1_school_id.eq.${id},team2_school_id.eq.${id}`)).data!.map((m: any) => m.id)
const b = (await db.from('dual_meet_matches').select('wrestler_a_id, wrestler_b_id, school_a_id, school_b_id, winner_id, wrestler_a_name_raw, wrestler_b_name_raw, weight_class').in('dual_meet_id', meets)).data!
const per = new Map<string, { n: number; w: number; raw: Set<string> }>()
for (const x of b as any[]) {
  const mine = x.school_a_id === id ? 'a' : x.school_b_id === id ? 'b' : null; if (!mine) continue
  const wid = mine === 'a' ? x.wrestler_a_id : x.wrestler_b_id, raw = mine === 'a' ? x.wrestler_a_name_raw : x.wrestler_b_name_raw
  const k = wid ?? '(no profile)'; const e = per.get(k) ?? { n: 0, w: 0, raw: new Set() }; e.n++; if (wid && x.winner_id === wid) e.w++; e.raw.add(raw ?? ''); per.set(k, e)
}
for (const [k, e] of per) {
  const w = k.startsWith('(') ? null : (await db.from('wrestlers').select('first_name, last_name, is_active, grade').eq('id', k)).data![0]
  const al = k.startsWith('(') ? [] : (await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', k)).data ?? []
  console.log(`${w ? `${w.first_name} ${w.last_name} (active ${w.is_active}, grade ${w.grade})` : k}: ${e.n} bouts, ${e.w} wins | names on the sheets: ${[...e.raw].join(', ')} | name links: ${al.map((a: any) => `${a.raw_name}@${a.school_id}`).join(', ') || 'none'}`)
}
console.log('meets', meets.length, 'Gloucester Catholic bout sides', [...per.values()].reduce((n, e) => n + e.n, 0))
