import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function main() {
  // Check point values for Jayden's two tournaments
  const { data: tours } = await db
    .from('in_season_tournaments')
    .select('id, name, point_value, start_date')
    .in('id', ['bb71400d-6a29-42e2-aa14-f6b83650bec0', '34cac166-64d8-4b27-995e-193d3340d44b'])
  console.log('Jayden tournament point values:', JSON.stringify(tours, null, 2))

  // How many tournaments have point_value set?
  const { count: withPV } = await db
    .from('in_season_tournaments')
    .select('id', { count: 'exact', head: true })
    .eq('season', '2025-26')
    .not('point_value', 'is', null)
  console.log('\nTotal in_season_tournaments with point_value set:', withPV)

  // Check Jayden's Finals bout placements
  const { data: finals } = await db
    .from('tournament_bouts')
    .select('round, winner, wrestler1_id, wrestler2_id, in_season_tournament_id')
    .in('in_season_tournament_id', ['bb71400d-6a29-42e2-aa14-f6b83650bec0', '34cac166-64d8-4b27-995e-193d3340d44b'])
    .eq('round', 'Finals')
  console.log('\nFinals bouts for Jayden tournaments:', JSON.stringify(finals, null, 2))

  // Spot check: what round values exist in tournament_bouts for those tournaments?
  const { data: rounds } = await db
    .from('tournament_bouts')
    .select('round')
    .in('in_season_tournament_id', ['bb71400d-6a29-42e2-aa14-f6b83650bec0', '34cac166-64d8-4b27-995e-193d3340d44b'])
    .limit(200)
  const distinct = [...new Set(rounds?.map(r => r.round))]
  console.log('\nDistinct round values in these tournaments:', distinct)
}

main().catch(console.error)
