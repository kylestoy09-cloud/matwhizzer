import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const tS = new Map((await db.from('tournaments').select('id, season_id, name')).data!.map((t: any) => [t.id, t]))
const ids = (await db.from('wrestlers').select('id').eq('gender', 'M').limit(20000)).data!.map((w: any) => w.id).filter((x: string) => x.startsWith('b6399f5c') || x.startsWith('a286ad17'))
const ev: Set<string>[] = []
for (const id of ids) {
  const w = (await db.from('wrestlers').select('first_name, last_name, grade, is_active, created_at').eq('id', id)).data![0]
  const e = (await db.from('tournament_entries').select('tournament_id, school_id, grade_label').eq('wrestler_id', id)).data ?? []
  const t = (await db.from('tournament_bouts').select('in_season_tournament_id, weight_class, wrestler1_id, wrestler1_school_id, wrestler2_school_id, wrestler1_name_raw, wrestler2_name_raw').or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`)).data ?? []
  const d = (await db.from('dual_meet_matches').select('dual_meet_id, weight_class, wrestler_a_id, school_a_id, school_b_id, wrestler_a_name_raw, wrestler_b_name_raw, dual_meets(meet_date, season_id)').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`)).data ?? []
  const ro = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, school_id').eq('wrestler_id', id)).data ?? []
  ev.push(new Set([...e.map((x: any) => 'E' + x.tournament_id), ...t.map((x: any) => 'T' + x.in_season_tournament_id), ...d.map((x: any) => 'D' + x.dual_meet_id)]))
  console.log(`${id.slice(0, 8)} "${w.first_name} ${w.last_name}" grade ${w.grade} active ${w.is_active}`)
  console.log(`   postseason: ${e.map((x: any) => `${tS.get(x.tournament_id)?.season_id} ${names.get(x.school_id)} ${x.grade_label}`).join('; ') || '-'}`)
  console.log(`   tournaments: ${t.length} ${JSON.stringify([...new Set(t.map((b: any) => `${names.get(b.wrestler1_id === id ? b.wrestler1_school_id : b.wrestler2_school_id)} ${b.weight_class} "${b.wrestler1_id === id ? b.wrestler1_name_raw : b.wrestler2_name_raw}"`))])}`)
  console.log(`   duals: ${d.length} ${JSON.stringify([...new Set(d.map((b: any) => `${b.dual_meets?.season_id} ${names.get(b.wrestler_a_id === id ? b.school_a_id : b.school_b_id)} ${b.weight_class} "${b.wrestler_a_id === id ? b.wrestler_a_name_raw : b.wrestler_b_name_raw}"`))])}`)
  console.log(`   Track: ${ro.map((r: any) => `${r.first_name_raw} ${r.last_name_raw} ${r.grade} @ ${names.get(r.school_id)}`).join(', ') || '-'}`)
}
console.log('shared events:', [...ev[0]].filter(x => ev[1].has(x)).length)
