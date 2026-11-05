import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const id = '993438ab-aea0-45ae-acaa-4ea0480ca551'
const b = (await db.from('tournament_bouts_girls').select('*').eq('wrestler2_id', id)).data!
console.log(JSON.stringify(b))
console.log(JSON.stringify((await db.from('in_season_tournaments_girls').select('name, start_date').eq('id', b[0].in_season_tournament_id)).data))
console.log(JSON.stringify((await db.from('wrestler_name_aliases').select('*').eq('wrestler_id', id)).data))
