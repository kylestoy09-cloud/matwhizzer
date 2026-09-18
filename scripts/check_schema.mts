import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://vhffduvgcljvhtlyqgcd.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const { data, error } = await supabase
  .from('in_season_tournaments')
  .select('id, name, venue_name, venue_address, is_oos, banner_bg, banner_fg, location_school_id')
  .limit(1)
if (error) console.log('Schema not applied yet:', error.message)
else console.log('Schema OK — columns exist')

const { data: d2, error: e2 } = await supabase
  .from('in_season_tournament_team_scores')
  .select('id, tournament_id, place, school_name, school_id, score')
  .limit(1)
if (e2) console.log('Team scores table missing:', e2.message)
else console.log('Team scores table OK — exists')
