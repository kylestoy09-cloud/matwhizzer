import { createSupabaseServer } from '@/lib/supabase/server'
import { BracketEditor } from './BracketEditor'
import { AdminBackButton } from '../AdminBackButton'

export const dynamic = 'force-dynamic'

export default async function BracketPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; tid?: string; boutId?: string }>
}) {
  const { mode, tid, boutId } = await searchParams
  const supabase = await createSupabaseServer()

  const [tournamentsRes, weightClassesRes, inSeasonRes] = await Promise.all([
    supabase
      .from('tournaments')
      .select('id, name, tournament_type, gender, season_id')
      .in('tournament_type', ['boys_state', 'girls_state'])
      .order('season_id', { ascending: false })
      .order('name'),
    supabase
      .from('weight_classes')
      .select('id, weight, gender')
      .order('weight'),
    supabase
      .from('in_season_tournaments')
      .select('id, name, season, start_date')
      .order('start_date', { ascending: false }),
  ])

  const inSeasonTournaments = (inSeasonRes.data ?? []).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <AdminBackButton />
      </div>
      <BracketEditor
        tournaments={tournamentsRes.data ?? []}
        weightClasses={weightClassesRes.data ?? []}
        inSeasonTournaments={inSeasonTournaments}
        defaultMode={mode === 'in-season' ? 'in-season' : 'postseason'}
        defaultTid={tid}
        defaultBoutId={boutId}
      />
    </>
  )
}
