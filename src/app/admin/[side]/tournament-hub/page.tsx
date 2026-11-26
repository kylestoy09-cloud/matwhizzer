import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getWorkingSeason } from '@/lib/season-context'
import { HubShell } from '../dashboards/HubShell'
import { TournamentHubHeader } from './TournamentHubHeader'
import { TournamentHubClient } from './TournamentHubClient'
import { HistoryTab } from './HistoryTab'
import { HubTabs, HUB_TABS, type HubTab } from './HubTabs'
import { DistrictsSection } from '../districts/DistrictsSection'
import { RegionsSection } from '../region-seeds/RegionsSection'
import { TeamPostseasonSection } from '../team-playoffs/TeamPostseasonSection'
import { StatesSection } from '../states-hub/StatesSection'
import { PlayoffHistoryClient } from '../playoff-history/PlayoffHistoryClient'
import { genderOfSide, type AdminSide } from '@/lib/admin-side'

export const dynamic = 'force-dynamic'

// Five tabs (Kyle 2026-11-26): In-season tournaments · Team postseason · District · Region · State — the separate
// postseason hubs live here now (their old URLs forward). ?tab=…&history=1 shows past seasons.
// Older links: ?tab=history (the old History tab) → In-season, History.
export default async function TournamentHubPage({ params, searchParams }: { params: Promise<{ side: string }>; searchParams: Promise<{ tab?: string; history?: string }> }) {
  const { side } = await params
  const sp = await searchParams
  const tab: HubTab = HUB_TABS.some(t => t.id === sp.tab) ? (sp.tab as HubTab) : 'inseason'
  const history = sp.history === '1' || sp.tab === 'history'
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const tabs = <HubTabs side={side} tab={tab} history={history} />
  if (tab === 'team') return <>{tabs}<TeamPostseasonSection params={params} /></>
  if (history && tab !== 'inseason') return <>{tabs}<div className="p-4"><PlayoffHistoryClient /></div></>
  if (tab === 'district') return <>{tabs}<DistrictsSection params={params} /></>
  if (tab === 'region') return <>{tabs}<RegionsSection params={params} /></>
  if (tab === 'state') return <>{tabs}<StatesSection params={params} /></>
  return <>{tabs}<InSeasonSection side={side} history={history} /></>
}

async function InSeasonSection({ side, history }: { side: string; history: boolean }) {
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
      {history ? <HistoryTab key={side} gender={genderOfSide(side as AdminSide)} /> : <TournamentHubClient seasonM={seasonM} seasonF={seasonF} />}
    </HubShell>
  )
}
