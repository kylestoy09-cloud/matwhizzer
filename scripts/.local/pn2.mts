import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const blank = (await db.from('wrestlers').select('id, first_name').eq('last_name', '').neq('first_name', 'Unknown')).data
const paren = (await db.from('wrestlers').select('first_name, last_name').or('first_name.like.*(*,last_name.like.*(*')).data
console.log('blank last names left:', JSON.stringify(blank), '| names with "(":', JSON.stringify(paren))
for (const p of ['8eb02bca', '12690e41']) { const w = (await db.from('wrestlers').select('id, first_name, last_name, grade').or('first_name.eq.Charles,first_name.eq.Terrance')).data!.find((x: any) => x.id.startsWith(p))!; const e = (await db.from('tournament_entries').select('tournaments(name, season_id)').eq('wrestler_id', w.id)).data as any[]; console.log(w.first_name, w.last_name, w.grade, JSON.stringify(e.map(x => `${x.tournaments.season_id} ${x.tournaments.name}`))) }
