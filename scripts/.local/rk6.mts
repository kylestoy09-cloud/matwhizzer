import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const ids = (await db.from('wrestlers').select('id').eq('first_name', 'Ryan').eq('last_name', 'Kim').eq('gender', 'M')).data!.map((w: any) => w.id)
for (const id of ids) {
  const d = (await db.from('dual_meet_matches').select('school_a_id, school_b_id, wrestler_a_id, dual_meets(meet_date, season_id)').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`)).data ?? []
  const tb = (await db.from('tournament_bouts').select('wrestler1_id, wrestler1_school_id, wrestler2_school_id, in_season_tournaments(name, season)').or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`)).data ?? []
  const al = (await db.from('wrestler_name_aliases').select('raw_name, school_id, created_at').eq('wrestler_id', id)).data ?? []
  const by: Record<string, number> = {}
  for (const x of d as any[]) { const k = `dual ${x.dual_meets?.season_id} @${names.get(x.wrestler_a_id === id ? x.school_a_id : x.school_b_id)}`; by[k] = (by[k] ?? 0) + 1 }
  for (const x of tb as any[]) { const k = `tourn ${x.in_season_tournaments?.season} @${names.get(x.wrestler1_id === id ? x.wrestler1_school_id : x.wrestler2_school_id)}`; by[k] = (by[k] ?? 0) + 1 }
  console.log(id.slice(0, 8), JSON.stringify(by), 'links', JSON.stringify(al.map((a: any) => `${a.raw_name}@${names.get(a.school_id)} ${a.created_at?.slice(0, 10)}`)))
  const log = (await db.from('admin_activity_log').select('created_at, action, admin_email, details').eq('entity_id', id)).data ?? []
  const log2 = (await db.from('admin_activity_log').select('created_at, action, details').ilike('details::text' as any, `%${id}%`)).data ?? []
  console.log('   log by entity:', JSON.stringify(log).slice(0, 600), '| log mentioning id:', log2.length)
}
