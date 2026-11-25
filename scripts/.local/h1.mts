import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log((await db.from('placements').select('*').limit(1)).data)
console.log((await db.from('precomputed_team_scores').select('*').limit(2)).data)
const { data } = await db.from('tournaments').select('name, tournament_type, gender').in('tournament_type', ['districts','regions','girls_regions','boys_state','girls_state'])
console.log([...new Set(data!.map(t => `${t.gender} ${t.tournament_type} ${t.name.replace(/\d+$/, 'N')}`))])
