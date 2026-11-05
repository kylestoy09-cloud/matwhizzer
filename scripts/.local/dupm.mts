import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const ws = (await db.from('wrestlers').select('id, first_name, last_name, grade, main_weight, created_at').eq('gender', 'F').or('first_name.ilike.%lizz%,last_name.ilike.%cordero%,first_name.ilike.%chelsea%,last_name.ilike.%garay%,last_name.ilike.%jim%nez%')).data!
for (const w of ws.filter((w: any) => /lizz|cordero|chelsea|garay/i.test(w.first_name + ' ' + w.last_name))) {
  const al = (await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', w.id)).data ?? []
  const d = (await db.from('dual_meet_matches_girls').select('dual_meet_id, weight_class').or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)).data ?? []
  const t = (await db.from('tournament_bouts_girls').select('in_season_tournament_id, weight_class').or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)).data ?? []
  const e = (await db.from('tournament_entries').select('tournament_id').eq('wrestler_id', w.id)).data ?? []
  const r = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, status').eq('wrestler_id', w.id)).data ?? []
  console.log(`${w.id} "${w.first_name} | ${w.last_name}" ${w.grade} wt ${w.main_weight} created ${w.created_at.slice(0, 10)}\n   aliases ${al.map((a: any) => `${a.raw_name}@${names.get(a.school_id)}`).join(', ')} | duals ${d.length} (${[...new Set(d.map((x: any) => x.weight_class))]}) tourn ${t.length} (${[...new Set(t.map((x: any) => x.weight_class))]}) entries ${e.length} roster ${JSON.stringify(r)}\n   events ${JSON.stringify([...new Set([...d.map((x: any) => 'D' + x.dual_meet_id), ...t.map((x: any) => 'T' + x.in_season_tournament_id), ...e.map((x: any) => 'E' + x.tournament_id)])])}`)
}
