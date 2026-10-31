import { redirect } from 'next/navigation'
import { getSeasons } from '@/lib/seasons-server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { HubShell } from '../dashboards/HubShell'
import { RegionHubClient } from './RegionHubClient'

export const dynamic = 'force-dynamic'

function Pill({ label, value, pct }: { label: string; value: string | number; pct?: number }) {
  const color = pct === undefined ? 'text-slate-800'
    : pct >= 80 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-slate-500'
  const bar = pct === undefined ? null
    : pct >= 80 ? 'bg-green-400' : pct >= 40 ? 'bg-amber-400' : 'bg-slate-300'

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3 border border-slate-100 rounded-lg bg-slate-50 min-w-[110px]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-2xl font-bold tabular-nums leading-none ${color}`}>{value}</p>
      {bar && (
        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(pct!, 100)}%` }} />
        </div>
      )}
    </div>
  )
}

export default async function RegionSeedsPage({ params }: { params: Promise<{ side: string }> }) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()

  const { data: stateRows } = await db
    .from('season_gender_state')
    .select('season_id, gender, is_public_default')

  // This side's public season and its region tournaments only
  const gender = (await params).side === 'girls' ? 'F' : 'M'
  const activeSeason = stateRows?.find(s => s.is_public_default && s.gender === gender)?.season_id ?? (await getSeasons())[0]?.id

  const { data: tournRows } = await db.from('tournaments').select('id').eq('tournament_type', 'regions').eq('season_id', activeSeason).eq('gender', gender)
  const tournIds = (tournRows ?? []).map(t => String(t.id))

  const { data: placRows } = tournIds.length > 0
    ? await db.from('tournament_placements').select('tournament_id').in('tournament_id', tournIds)
    : { data: [] }

  const withPlacementsSet = new Set(placRows?.map(p => String(p.tournament_id)) ?? [])
  const complete = tournIds.filter(id => withPlacementsSet.has(id)).length
  const total    = gender === 'F' ? 4 : 8
  const pct = Math.round(complete / total * 100)

  const header = (
    <div className="p-4">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-base font-bold text-slate-800">Regions — {gender === 'F' ? 'Girls' : 'Boys'}</p>
        <p className="text-sm text-slate-500 font-medium">Postseason Region Tournaments</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill label="Total"    value={total} />
        <Pill label="Complete" value={`${pct}%`} pct={pct} />
        <Pill label="Done"     value={complete} />
        <Pill label="Pending"  value={total - complete} />
      </div>
    </div>
  )

  return (
    <HubShell header={header}>
      <RegionHubClient season={activeSeason} />
    </HubShell>
  )
}
