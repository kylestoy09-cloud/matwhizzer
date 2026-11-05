import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log(JSON.stringify((await db.from('in_season_tournaments_girls').select('name, venue_name, venue_address, created_at').ilike('name', '%beast of the east%')).data))
