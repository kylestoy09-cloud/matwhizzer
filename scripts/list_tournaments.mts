import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
)

const { data } = await supabase
  .from('in_season_tournaments')
  .select('name, start_date, end_date')
  .order('start_date')

for (const t of data ?? []) {
  const dates = t.end_date && t.end_date !== t.start_date
    ? `${t.start_date} – ${t.end_date}`
    : t.start_date
  console.log(`${dates.padEnd(28)} ${t.name}`)
}
