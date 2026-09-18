import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { HubShell } from '../dashboards/HubShell'
import { DistrictHubClient } from './DistrictHubClient'

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

export default async function DistrictsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()

  // Get the active season from season_gender_state
  const { data: stateRows } = await db
    .from('season_gender_state')
    .select('season_id, gender, is_public_default')

  const activeSeason = stateRows?.find(s => s.is_public_default)?.season_id ?? 2

  // Count district tournaments with results for both genders
  const [boysRes, girlsRes] = await Promise.all([
    db.from('tournaments').select('id').eq('tournament_type', 'districts').eq('season_id', activeSeason).eq('gender', 'M'),
    db.from('tournaments').select('id').eq('tournament_type', 'districts').eq('season_id', activeSeason).eq('gender', 'F'),
  ])

  const boysTournIds  = (boysRes.data ?? []).map(t => String(t.id))
  const girlsTournIds = (girlsRes.data ?? []).map(t => String(t.id))
  const allTournIds   = [...boysTournIds, ...girlsTournIds]

  const { data: placRows } = allTournIds.length > 0
    ? await db.from('tournament_placements').select('tournament_id').in('tournament_id', allTournIds)
    : { data: [] }

  const withPlacementsSet = new Set(placRows?.map(p => String(p.tournament_id)) ?? [])
  const boysComplete  = boysTournIds.filter(id => withPlacementsSet.has(id)).length
  const girlsComplete = girlsTournIds.filter(id => withPlacementsSet.has(id)).length
  const totalComplete = boysComplete + girlsComplete
  const totalDistricts = 32 + 12 // boys + girls
  const pct = Math.round(totalComplete / totalDistricts * 100)

  const header = (
    <div className="p-4">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-base font-bold text-slate-800">Districts</p>
        <p className="text-sm text-slate-500 font-medium">Postseason District Tournaments</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill label="Total"           value={totalDistricts} />
        <Pill label="Complete"        value={`${pct}%`} pct={pct} />
        <Pill label="Boys Total"      value={32} />
        <Pill label="Boys Complete"   value={boysComplete} />
        <Pill label="Girls Total"     value={12} />
        <Pill label="Girls Complete"  value={girlsComplete} />
        <Pill label="Pending"         value={totalDistricts - totalComplete} />
      </div>
    </div>
  )

  return (
    <HubShell header={header}>
      <DistrictHubClient season={activeSeason} />
    </HubShell>
  )
}
