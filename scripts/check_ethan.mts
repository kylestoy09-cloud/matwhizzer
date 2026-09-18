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

// Find Ethan Hale
const { data: wrestlers } = await supabase
  .from('wrestlers')
  .select('id, first_name, last_name, is_stub, created_at')
  .ilike('first_name', '%ethan%')
  .ilike('last_name', '%hale%')

console.log('Wrestlers named Ethan Hale:', JSON.stringify(wrestlers, null, 2))

for (const w of wrestlers ?? []) {
  // Check tournament_entries
  const { data: entries } = await supabase
    .from('tournament_entries')
    .select('id, school_id, school_context_raw')
    .eq('wrestler_id', w.id)

  console.log(`\nEntries for ${w.first_name} ${w.last_name} (${w.id}):`, entries)

  // Check dual_meet_matches
  const { data: dualMatches } = await supabase
    .from('dual_meet_matches')
    .select('id, wrestler_a_id, wrestler_b_id, meet:dual_meets(id, team1_score, team2_score)')
    .or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)
    .limit(3)

  console.log(`Dual meet matches:`, dualMatches)

  // Check tournament_bouts
  const { data: bouts } = await supabase
    .from('tournament_bouts')
    .select('id, wrestler1_id, wrestler2_id, wrestler1_school_raw, wrestler2_school_raw')
    .or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)
    .limit(3)

  console.log(`Tournament bouts:`, bouts)
}

// Broader scope: how many wrestlers have NO entries, NO bouts, NO dual matches?
const { count: totalWrestlers } = await supabase
  .from('wrestlers')
  .select('*', { count: 'exact', head: true })

const { data: stubWrestlers } = await supabase
  .from('wrestlers')
  .select('*', { count: 'exact', head: true })
  .eq('is_stub', true)

console.log('\nTotal wrestlers:', totalWrestlers)
console.log('Stub wrestlers:', (stubWrestlers as any)?.length ?? 'unknown')
