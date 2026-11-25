import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const t = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2025).eq('name', 'Boy_s Districts District 32')).data![0].id
console.log(JSON.stringify((await db.from('matches').select('*').eq('tournament_id', t).eq('weight_class_id', 54).eq('round', 'R2')).data))
