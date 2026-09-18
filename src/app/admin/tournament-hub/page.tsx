import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { HubShell } from '../dashboards/HubShell'
import { TournamentHubHeader } from './TournamentHubHeader'
import { TournamentHubClient } from './TournamentHubClient'

export const dynamic = 'force-dynamic'

export default async function TournamentHubPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()

  const [seasonsRes, statesRes, registryRes] = await Promise.all([
    db.from('seasons').select('id, year_label').order('id', { ascending: false }),
    db.from('season_gender_state').select('season_id, gender, is_public_default'),
    db.from('tournament_registry').select('season, gender, imported, in_season_tournament_id'),
  ])

  const seasons  = seasonsRes.data ?? []
  const states   = statesRes.data ?? []
  const registry = registryRes.data ?? []

  function liveSeason(gender: 'M' | 'F'): string {
    const liveId = states.find(s => s.gender === gender && s.is_public_default)?.season_id
    const match  = liveId ? seasons.find(s => s.id === liveId) : null
    return match?.year_label ?? seasons[0]?.year_label ?? '2025-26'
  }

  const seasonM = liveSeason('M')
  const seasonF = liveSeason('F')

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
