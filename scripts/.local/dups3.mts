import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [n, id, re] of [['Hightstown', 232, /quis|guzman|jazmin/i], ['Hillsborough', 188, /abdalate/i], ['Lenape Valley-Hopatcong', 62, /jaylen|vaz|vas/i], ['Linden', 152, /andrea|carire|cruz/i]] as const) {
  const al = (await db.from('wrestler_name_aliases').select('wrestler_id, raw_name').eq('school_id', id)).data ?? []
  const ids = [...new Set(al.map((a: any) => a.wrestler_id))]
  const ws = (await db.from('wrestlers').select('id, first_name, last_name, grade, main_weight, is_active, created_at').eq('gender', 'F').eq('is_active', true).eq('is_oos', false).in('id', ids)).data ?? []
  for (const w of ws.filter((w: any) => re.test(`${w.first_name} ${w.last_name}`))) {
    const da = (await db.from('dual_meet_matches_girls').select('id', { count: 'exact', head: true }).or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)).count
    const tb = (await db.from('tournament_bouts_girls').select('id', { count: 'exact', head: true }).or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)).count
    const raws = al.filter((a: any) => a.wrestler_id === w.id).map((a: any) => a.raw_name)
    console.log(`${n}: "${w.first_name} | ${w.last_name}" ${w.id.slice(0, 8)} grade ${w.grade} wt ${w.main_weight} created ${w.created_at.slice(0, 10)} | duals ${da} tourn ${tb} | aliases ${JSON.stringify(raws)}`)
  }
}
