import { redirect } from 'next/navigation'
import { getActiveSeason } from '@/lib/get-season'
import { supabase } from '@/lib/supabase'

export default async function RootPage() {
  const season = await getActiveSeason()

  // Find which boys tournament types have data for the active season
  const { data } = await supabase
    .from('tournaments')
    .select('tournament_type')
    .eq('season_id', season)
    .eq('gender', 'M')

  const types = new Set((data ?? []).map((t: { tournament_type: string }) => t.tournament_type))

  // Redirect to the most recent tournament that has data
  if (types.has('boys_state')) redirect('/boys/state')
  if (types.has('regions'))    redirect('/boys/regions')
  if (types.has('districts'))  redirect('/boys/districts')
  redirect('/boys')
}
