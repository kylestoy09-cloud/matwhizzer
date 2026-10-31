import { createSupabaseServer } from '@/lib/supabase/server'
import { BracketEditor } from './BracketEditor'
import { AdminBackButton } from '@/app/admin/AdminBackButton'

export const dynamic = 'force-dynamic'

export default async function BracketPage({
  params,
  searchParams,
}: {
  params: Promise<{ side: string }>
  searchParams: Promise<{ mode?: string; tid?: string; boutId?: string }>
}) {
  const { mode, tid, boutId } = await searchParams
  // This side's state brackets and in-season tournaments only
  const gender: 'M' | 'F' = (await params).side === 'girls' ? 'F' : 'M'
  const supabase = await createSupabaseServer()

  const [tournamentsRes, weightClassesRes, inSeasonRes] = await Promise.all([
    supabase
      .from('tournaments')
      .select('id, name, tournament_type, gender, season_id')
      .eq('tournament_type', gender === 'F' ? 'girls_state' : 'boys_state')
      .order('season_id', { ascending: false })
      .order('name'),
    supabase
      .from('weight_classes')
      .select('id, weight, gender')
      .eq('gender', gender)
      .order('weight'),
    supabase
      .from(gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments')
      .select('id, name, season, start_date')
      .order('start_date', { ascending: false }),
  ])

  const inSeasonTournaments = ((inSeasonRes.data ?? []) as { id: string; name: string; season: string; start_date: string }[])
    .map(t => ({ ...t, gender }))
    .sort((a, b) => a.name.localeCompare(b.name))

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
