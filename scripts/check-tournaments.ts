import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  // Sample rows from tournaments
  const { data: sample } = await db
    .from('tournaments')
    .select('id, tournament_type, season_id, gender')
    .limit(5)
  console.log('Sample rows:', JSON.stringify(sample, null, 2))

  // With season_id=1, gender=M filters
  const { data: filtered, error: fe } = await db
    .from('tournaments')
    .select('id, tournament_type, season_id, gender')
    .eq('season_id', 1)
    .eq('gender', 'M')
    .limit(5)
  console.log('\nseson_id=1 + gender=M error:', fe?.message)
  console.log('Filtered rows:', JSON.stringify(filtered, null, 2))

  // All distinct combos
  const { data: all } = await db
    .from('tournaments')
    .select('tournament_type, season_id, gender')
    .limit(200)
  const combos = new Set(all?.map(r => `gender=${r.gender} season_id=${r.season_id} type=${r.tournament_type}`))
  console.log('\nDistinct combos:', [...combos].sort())
}

main().catch(console.error)
