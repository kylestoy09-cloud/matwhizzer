import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const id of [4, 18, 24, 76]) console.log(id, JSON.stringify((await db.from('schools').select('athletic_conference, section, classification').eq('id', id)).data))
console.log(JSON.stringify((await db.from('conference_standings').select('conference_slug, school_id').eq('gender', 'F').eq('season_id', 2026).in("school_id", [4, 18, 24, 76])).data))
