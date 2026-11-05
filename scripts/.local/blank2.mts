import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const tours = new Map((await db.from('tournaments').select('id, season_id, name').eq('gender', 'M')).data!.map((t: any) => [t.id, t]))
const ist = new Map((await db.from('in_season_tournaments').select('id, season, name')).data!.map((t: any) => [t.id, t]))
for (const id of [248, 99, 206, 219, 269]) {
  const out = new Map<string, Set<string>>()
  const add = (w: string | null, src: string) => { if (!w) return; (out.get(w) ?? out.set(w, new Set()).get(w)!).add(src) }
  for (const x of (await db.from('tournament_entries').select('wrestler_id, tournament_id').eq('school_id', id)).data ?? []) { const t = tours.get(x.tournament_id); if (t) add(x.wrestler_id, `post ${t.season_id}`) }
  for (const b of (await db.from('tournament_bouts').select('in_season_tournament_id, wrestler1_id, wrestler2_id, wrestler1_school_id').or(`wrestler1_school_id.eq.${id},wrestler2_school_id.eq.${id}`)).data ?? []) add(b.wrestler1_school_id === id ? b.wrestler1_id : b.wrestler2_id, `tourn ${ist.get(b.in_season_tournament_id)?.season}`)
  for (const b of (await db.from('dual_meet_matches').select('wrestler_a_id, wrestler_b_id, school_a_id, dual_meets(season_id, gender)').or(`school_a_id.eq.${id},school_b_id.eq.${id}`)).data ?? []) add(b.school_a_id === id ? b.wrestler_a_id : b.wrestler_b_id, `dual ${(b as any).dual_meets?.season_id}${(b as any).dual_meets?.gender}`)
  const ws = out.size ? (await db.from('wrestlers').select('id, first_name, last_name, grade, graduation_year, is_active, gender').in('id', [...out.keys()])).data ?? [] : []
  const name = (await db.from('schools').select('display_name').eq('id', id)).data![0].display_name
  console.log(`\n${id} ${name}`)
  for (const w of ws) console.log(`   ${w.first_name} ${w.last_name} ${w.gender} grade ${w.grade ?? '-'} active ${w.is_active} | ${[...out.get(w.id)!].join(', ')}`)
  const dm = (await db.from('dual_meets').select('meet_date, season_id, gender, team1_school_id, team2_school_id').or(`team1_school_id.eq.${id},team2_school_id.eq.${id}`)).data ?? []
  if (dm.length) console.log('   duals:', JSON.stringify(Object.entries(dm.reduce((m: any, d: any) => { const k = `${d.season_id}${d.gender}`; m[k] = (m[k] ?? 0) + 1; return m }, {}))))
}
