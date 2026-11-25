import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [f, l] of [['Anthony','Ashnault'],['Bryant','Clagon'],['Robert','Trombetta']]) { const { data } = await db.from('wrestlers').select('id').eq('first_name', f).eq('last_name', l).eq('gender','M'); console.log(f, l, data) }
const { data } = await db.from('season_gender_state').select('season_id, gender, history_public').eq('stage','history').eq('gender','M').order('season_id'); console.log(data)
