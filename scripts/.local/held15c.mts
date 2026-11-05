import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name, is_nj')).data!.map((r: any) => [r.id, r]))
const sid = (n: string) => [...names].find(([, s]: any) => s.display_name === n)![0]
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '')
console.log('== Track roster rows by name at the 2025-26 school')
for (const [f, l, s] of [['Sean', "O'Neill", 'Ramapo'], ['Anthony', 'Morales', 'Raritan'], ['Alexander', 'Perez', 'Lakewood'], ['Antonio', 'Cruz', 'Newark East Side'], ['Derek', 'Rodriguez', 'Bloomfield']]) {
  const rows = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, weight_class, status, wrestler_id, season_id').eq('school_id', sid(s)).eq('gender', 'M')).data!.filter((r: any) => key(r.first_name_raw + r.last_name_raw) === key(f + l))
  console.log(`  ${f} ${l} @ ${s}:`, JSON.stringify(rows))
}
console.log('== the 2025-26 records on the graduated profiles')
const all = (await db.from('wrestlers').select('id, first_name, last_name').eq('gender', 'M').limit(20000)).data!
for (const p of ['347ed397', 'ac5b80ce', 'fad47eaa', '78adb9e0', '562f1d5d']) {
  const w = all.find((x: any) => x.id.startsWith(p))!
  console.log(`  ${w.first_name} ${w.last_name} (${p})`)
  const t = (await db.from('tournament_bouts').select('in_season_tournament_id, weight_class, round, wrestler1_id, wrestler1_name_raw, wrestler1_school_raw, wrestler2_name_raw, wrestler2_school_raw, result_type, created_at, source_format').or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)).data ?? []
  for (const b of t as any[]) { const ist = (await db.from('in_season_tournaments').select('name, start_date, season').eq('id', b.in_season_tournament_id)).data![0]; const me = b.wrestler1_id === w.id ? 1 : 2; console.log(`     tourn ${ist.season} "${ist.name}" ${ist.start_date} ${b.weight_class} ${b.round}: sheet "${me === 1 ? b.wrestler1_name_raw : b.wrestler2_name_raw}" (${me === 1 ? b.wrestler1_school_raw : b.wrestler2_school_raw}) vs ${me === 1 ? b.wrestler2_name_raw : b.wrestler1_name_raw} (${me === 1 ? b.wrestler2_school_raw : b.wrestler1_school_raw}) ${b.result_type} [imported ${b.created_at.slice(0, 10)} ${b.source_format}]`) }
  const d = (await db.from('dual_meet_matches').select('dual_meet_id, weight_class, wrestler_a_id, wrestler_a_name_raw, wrestler_b_name_raw, school_a_id, school_b_id, result_type, created_at, dual_meets(meet_date, season_id, gender, team1_school_name_raw, team2_school_name_raw)').or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)).data ?? []
  for (const b of d as any[]) { const me = b.wrestler_a_id === w.id ? 'a' : 'b'; console.log(`     dual ${b.dual_meets?.meet_date} season ${b.dual_meets?.season_id}: ${b.dual_meets?.team1_school_name_raw} vs ${b.dual_meets?.team2_school_name_raw} ${b.weight_class}: sheet "${me === 'a' ? b.wrestler_a_name_raw : b.wrestler_b_name_raw}" for ${names.get(me === 'a' ? b.school_a_id : b.school_b_id)?.display_name} (nj ${names.get(me === 'a' ? b.school_a_id : b.school_b_id)?.is_nj}) vs "${me === 'a' ? b.wrestler_b_name_raw : b.wrestler_a_name_raw}" ${b.result_type} [imported ${b.created_at.slice(0, 10)}]`) }
}
