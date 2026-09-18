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

const { data: before } = await supabase
  .from('in_season_tournaments')
  .select('id, name, start_date, end_date')
  .ilike('name', '%powerade%')

console.log('Before:', before)

const id = before?.[0]?.id
if (!id) { console.error('No Powerade tournament found'); process.exit(1) }

const { error } = await supabase
  .from('in_season_tournaments')
  .update({ start_date: '2025-12-29' })
  .eq('id', id)

if (error) { console.error('Update failed:', error); process.exit(1) }

const { data: after } = await supabase
  .from('in_season_tournaments')
  .select('id, name, start_date, end_date')
  .eq('id', id)

console.log('After:', after)
