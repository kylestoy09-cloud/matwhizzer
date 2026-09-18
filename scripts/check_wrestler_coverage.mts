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

// Use RPC to run raw SQL for accurate counts
const { data, error } = await supabase.rpc('exec_sql', { sql: `
  WITH
  has_entry AS (
    SELECT DISTINCT wrestler_id FROM tournament_entries
  ),
  has_bout_school AS (
    SELECT DISTINCT wrestler1_id AS wrestler_id FROM tournament_bouts WHERE wrestler1_school_id IS NOT NULL
    UNION
    SELECT DISTINCT wrestler2_id FROM tournament_bouts WHERE wrestler2_school_id IS NOT NULL
  ),
  has_dual_school AS (
    SELECT DISTINCT dmm.wrestler_a_id AS wrestler_id
    FROM dual_meet_matches dmm
    JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
    WHERE dm.team1_school_id IS NOT NULL
    UNION
    SELECT DISTINCT dmm.wrestler_b_id
    FROM dual_meet_matches dmm
    JOIN dual_meets dm ON dm.id = dmm.dual_meet_id
    WHERE dm.team2_school_id IS NOT NULL
  )
  SELECT
    COUNT(*) FILTER (WHERE TRUE) AS total_wrestlers,
    COUNT(*) FILTER (WHERE w.id IN (SELECT wrestler_id FROM has_entry)) AS has_postseason_entry,
    COUNT(*) FILTER (WHERE w.id NOT IN (SELECT wrestler_id FROM has_entry)
                     AND (w.id IN (SELECT wrestler_id FROM has_bout_school)
                          OR w.id IN (SELECT wrestler_id FROM has_dual_school))) AS dual_only_resolvable,
    COUNT(*) FILTER (WHERE w.id NOT IN (SELECT wrestler_id FROM has_entry)
                     AND w.id NOT IN (SELECT wrestler_id FROM has_bout_school)
                     AND w.id NOT IN (SELECT wrestler_id FROM has_dual_school)) AS no_school_data
  FROM wrestlers w
` })

if (error) {
  console.log('RPC not available, trying alternate approach...')
  console.log(error.message)
} else {
  console.log('Coverage summary:', data)
}
