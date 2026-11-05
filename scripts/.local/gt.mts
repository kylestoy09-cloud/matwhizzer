import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: t } = await db.from('in_season_tournaments_girls').select('id')
const { data: w } = await db.from('in_season_tournament_team_scores').select('tournament_id, school_id').eq('place', 1).in('tournament_id', t!.map(x => x.id))
console.log('girls tournaments', t!.length, 'with a 1st-place team on file', new Set(w!.map(x => x.tournament_id)).size)
