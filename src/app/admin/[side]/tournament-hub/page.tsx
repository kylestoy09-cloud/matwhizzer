import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getWorkingSeason } from '@/lib/season-context'
import { HubShell } from '../dashboards/HubShell'
import { TournamentHubHeader } from './TournamentHubHeader'
import { TournamentHubClient } from './TournamentHubClient'

export const dynamic = 'force-dynamic'

export default async function TournamentHubPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()

  // Season in progress per gender — the same season the tournament importers write to
  const [boysSeason, girlsSeason, registryRes] = await Promise.all([
    getWorkingSeason('M'),
    getWorkingSeason('F'),
    db.from('tournament_registry').select('season, gender, imported, in_season_tournament_id'),
  ])

  const registry = registryRes.data ?? []
  const seasonM  = boysSeason.label
  const seasonF  = girlsSeason.label

  function countFor(season: string, gender: 'M' | 'F') {
    const rows = registry.filter(r =>
      r.season === season && (r.gender === gender || r.gender === 'both')
    )
    const total    = rows.length
    const imported = rows.filter(r => r.imported || !!r.in_season_tournament_id).length
    return { total, imported }
  }

  const M = countFor(seasonM, 'M')
  const F = countFor(seasonF, 'F')

  const seasonLabel = seasonM === seasonF ? seasonM : `${seasonM} / ${seasonF}`

  return (
    <HubShell
      header={
        <TournamentHubHeader
          seasonLabel={seasonLabel}
          totalM={M.total}      importedM={M.imported}
          totalF={F.total}      importedF={F.imported}
        />
      }
    >
      <TournamentHubClient seasonM={seasonM} seasonF={seasonF} />
    </HubShell>
  )
}
