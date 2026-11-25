import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getWorkingSeason } from '@/lib/season-context'
import { HubShell } from '../dashboards/HubShell'
import { TournamentHubHeader } from './TournamentHubHeader'
import { TournamentHubClient } from './TournamentHubClient'
import { HistoryTab } from './HistoryTab'
import Link from 'next/link'
import { genderOfSide, type AdminSide } from '@/lib/admin-side'

export const dynamic = 'force-dynamic'

// Two tabs (Kyle 2026-11-20): Tournaments (this season) and History (every year we're loading, ?tab=history)
export default async function TournamentHubPage({ params, searchParams }: { params: Promise<{ side: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { side } = await params
  const history = (await searchParams).tab === 'history'
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
      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {[['Tournaments', ''], ['History', '?tab=history']].map(([t, q]) => (
          <Link key={t} href={`/admin/${side}/tournament-hub${q}`}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${(t === 'History') === history ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t}</Link>
        ))}
      </div>
      {history ? <HistoryTab key={side} gender={genderOfSide(side as AdminSide)} /> : <TournamentHubClient seasonM={seasonM} seasonF={seasonF} />}
    </HubShell>
  )
}
