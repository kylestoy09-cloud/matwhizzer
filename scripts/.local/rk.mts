import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const wc = new Map((await db.from('weight_classes').select('id, weight')).data!.map((r: any) => [r.id, r.weight]))
const e = (await db.from('tournament_entries').select('id, tournament_id, school_id, weight_class_id, grade_label, tournaments(name, season_id)').like('wrestler_id', 'b2731464%')).data
const id = (await db.from('wrestlers').select('id').eq('first_name', 'Ryan').eq('last_name', 'Kim').eq('gender', 'M')).data!.map((w: any) => w.id).find((x: string) => x.startsWith('b2731464'))
const e2 = (await db.from('tournament_entries').select('id, school_id, weight_class_id, grade_label, tournaments(name, season_id)').eq('wrestler_id', id)).data
console.log(JSON.stringify(e2?.map((x: any) => `${x.tournaments.season_id} ${x.tournaments.name} school ${x.school_id} ${wc.get(x.weight_class_id)}lb ${x.grade_label}`)))
void e
