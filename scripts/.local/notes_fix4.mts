import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: t } = await db.from('boys_hub_tournaments').select('id').eq('name', 'Journeymen Fall Classic').single()
await db.from('boys_hub_events').update({ notes: "Places match Flo's placements copy for every weight (Over: Flo lists the top 4; deeper Over places are from the bout file)." }).eq('tournament_id', t!.id).eq('season', 2026)
