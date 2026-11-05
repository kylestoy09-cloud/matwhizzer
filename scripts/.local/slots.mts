import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const c = async (f: (q: any) => any) => (await f(db.from('tournament_bracket_slots').select('*', { count: 'exact', head: true }))).count
console.log('slots', await c(q => q), 'top named no id', await c(q => q.is('top_wrestler_id', null).not('top_name_raw', 'is', null).neq('top_name_raw', '')), 'bottom named no id', await c(q => q.is('bottom_wrestler_id', null).not('bottom_name_raw', 'is', null).neq('bottom_name_raw', '')))
const { data } = await db.from('tournament_bracket_slots').select('*').limit(1); console.log(Object.keys(data![0]).join(', '))
const { data: u } = await db.from('tournament_bracket_slots').select('top_name_raw, bottom_name_raw, top_wrestler_id, bottom_wrestler_id').or('and(top_wrestler_id.is.null,top_name_raw.neq.),and(bottom_wrestler_id.is.null,bottom_name_raw.neq.)').limit(12); console.log(u)
