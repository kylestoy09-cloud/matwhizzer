import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
for (const q of ['and(first_name.ilike.lily,last_name.ilike.oh)', 'last_name.ilike.%mejia%']) {
  const ws = (await db.from('wrestlers').select('id, first_name, last_name, gender, grade, main_weight, created_at').eq('gender', 'F').or(q)).data!
  for (const w of ws) {
    const al = (await db.from('wrestler_name_aliases').select('raw_name, school_id, created_at').eq('wrestler_id', w.id)).data ?? []
    const d = (await db.from('dual_meet_matches_girls').select('id, dual_meet_id, school_a_id, school_b_id, wrestler_a_id, wrestler_a_name_raw, wrestler_b_name_raw, created_at, dual_meets_girls(meet_date, team1_school_id, team2_school_id)').or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)).data ?? []
    const t = (await db.from('tournament_bouts_girls').select('in_season_tournament_id, wrestler1_id, wrestler1_school_id, wrestler1_school_raw, wrestler2_school_id, wrestler2_school_raw, wrestler1_name_raw, wrestler2_name_raw, created_at').or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)).data ?? []
    const e = (await db.from('tournament_entries').select('school_id, school_context_raw, tournament_id').eq('wrestler_id', w.id)).data ?? []
    const r = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, school_id, grade, status').eq('wrestler_id', w.id)).data ?? []
    const dSchools = d.map((x: any) => x.wrestler_a_id === w.id ? x.school_a_id : x.school_b_id)
    const tSchools = t.map((x: any) => x.wrestler1_id === w.id ? `${x.wrestler1_school_id}:${x.wrestler1_school_raw}` : `${x.wrestler2_school_id}:${x.wrestler2_school_raw}`)
    console.log(`\n${w.id} "${w.first_name} | ${w.last_name}" ${w.grade ?? '-'} wt ${w.main_weight} created ${w.created_at.slice(0, 10)}`)
    console.log('  aliases', al.map((a: any) => `${a.raw_name}@${names.get(a.school_id)} (${a.created_at.slice(0, 10)})`).join(', '))
    console.log('  dual schools', JSON.stringify(Object.entries(dSchools.reduce((m: any, s: any) => (m[names.get(s) ?? s] = (m[names.get(s) ?? s] ?? 0) + 1, m), {}))), 'raw names', [...new Set(d.map((x: any) => x.wrestler_a_id === w.id ? x.wrestler_a_name_raw : x.wrestler_b_name_raw))])
    console.log('  tourn schools', JSON.stringify(Object.entries(tSchools.reduce((m: any, s: any) => (m[s] = (m[s] ?? 0) + 1, m), {}))), 'raw names', [...new Set(t.map((x: any) => x.wrestler1_id === w.id ? x.wrestler1_name_raw : x.wrestler2_name_raw))])
    console.log('  entries', JSON.stringify(e.map((x: any) => `${names.get(x.school_id)}|${x.school_context_raw}`)), '| roster', JSON.stringify(r.map((x: any) => `${x.first_name_raw} ${x.last_name_raw}@${names.get(x.school_id)} ${x.grade} ${x.status}`)))
  }
}
