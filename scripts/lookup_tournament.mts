import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

const { data: t } = await supabase
  .from('in_season_tournaments')
  .select('id, name, start_date, end_date')
  .ilike('name', '%tim groves%')

console.log('Tournament:', t)

if (t?.[0]?.id) {
  // Check what columns exist for team scores
  const { data: scores, error } = await supabase
    .from('in_season_tournament_team_scores')
    .select('*')
    .eq('tournament_id', t[0].id)
    .limit(3)

  console.log('Existing team scores:', scores, error)
}
