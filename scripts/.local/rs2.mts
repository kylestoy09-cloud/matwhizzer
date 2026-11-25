import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const t = (await db.from('tournaments').select('id').eq('gender','M').eq('season_id',2026).eq('name','Boy_s Districts District 32')).data![0].id
const es = (await db.from('tournament_entries').select('id, seed, school_id, wrestlers(first_name,last_name)').eq('tournament_id', t).eq('weight_class_id', 60)).data as any[]
console.log('D32 150 now:', JSON.stringify(es.map(e => `${e.seed} ${e.wrestlers.first_name} ${e.wrestlers.last_name} ${names.get(e.school_id)}`)))
const ws = (await db.from('wrestlers').select('id, grade, is_active, created_at').eq('first_name','Anthony').eq('last_name','Russo').eq('gender','M')).data!
for (const w of ws) { const e = (await db.from('tournament_entries').select('school_id, weight_class_id, tournaments(name, season_id)').eq('wrestler_id', w.id)).data as any[]; const al = (await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', w.id)).data as any[]; const d = (await db.from('dual_meet_matches').select('id', { count: 'exact', head: true }).or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)).count
  console.log(w.id.slice(0,8), w.grade, w.is_active, w.created_at.slice(0,10), 'entries', JSON.stringify(e.map(x => `${x.tournaments.season_id} ${x.tournaments.name} ${names.get(x.school_id)}`)), 'links', JSON.stringify(al.map(a => names.get(a.school_id))), 'duals', d) }
