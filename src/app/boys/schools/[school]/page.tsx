import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { FollowSchoolButton } from '@/components/FollowSchoolButton'

// ── Types ─────────────────────────────────────────────────────────────────────

type BreakdownRow = {
  tournament_type: string
  total_points: number
  win_count: number
}

type WrestlerRow = {
  wrestler_id: string
  wrestler_name: string
  primary_weight: number
  districts_placement: string | null
  districts_short: string | null
  regions_placement: string | null
  regions_short: string | null
  state_placement: string | null
}

type LeaderRow = {
  wrestler_id: string
  wrestler_name: string
  primary_weight: number
  win_count: number
  fall_count: number
  fastest_fall_sec: number | null
  bonus_pct: number
  district_points: number
  region_points: number
  state_points: number
  total_points: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const TOURNEY_LABEL: Record<string, string> = {
  districts:  'Districts',
  regions:    'Regions',
  boys_state: 'State',
}

function placeBadgeClass(p: string | null): string {
  switch (p) {
    case '1st': return 'bg-amber-100 text-amber-800'
    case '2nd': return 'bg-slate-200 text-slate-700'
    case '3rd': return 'bg-orange-100 text-orange-800'
    case '4th':
    case '5th':
    case '6th': return 'bg-emerald-50 text-emerald-700'
    default:    return 'bg-slate-50 text-slate-500'
  }
}

function PlaceBadge({
  placement,
  short,
}: {
  placement: string | null
  short?: string | null
}) {
  if (!placement) return <span className="text-slate-300 text-xs">—</span>
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${placeBadgeClass(placement)}`}>
        {placement}
      </span>
      {short && <span className="text-slate-400 text-xs">{short}</span>}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SchoolProfilePage({
  params,
}: {
  params: Promise<{ school: string }>
}) {
  const { school: schoolParam } = await params
  const schoolId = parseInt(schoolParam, 10)
  if (!schoolId) notFound()

  const season = await getActiveSeason()

  const { data: schoolRow } = await supabase
    .from('schools')
    .select('display_name')
    .eq('id', schoolId)
    .maybeSingle()

  const schoolName = (schoolRow as { display_name: string } | null)?.display_name
  if (!schoolName) notFound()

  const [{ data: breakdown }, { data: wrestlers }, { data: leaders }] = await Promise.all([
    supabase.rpc('school_points_breakdown', { p_school_id: schoolId, p_gender: 'M', p_season: season }),
    supabase.rpc('school_wrestlers',        { p_school_id: schoolId, p_gender: 'M', p_season: season }),
    supabase.rpc('school_leaderboard',      { p_school_id: schoolId, p_gender: 'M', p_season: season }),
  ])

  const rows       = (wrestlers ?? []) as WrestlerRow[]
  const bdRows     = (breakdown ?? []) as BreakdownRow[]
  const leaderRows = (leaders   ?? []) as LeaderRow[]

  if (rows.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/boys/schools" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          ← School Directory
        </Link>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">{schoolName}</h2>
        </div>
        <div className="border border-slate-200 rounded-none bg-white px-6 py-12 text-center">
          <p className="text-slate-500 text-sm">No boys wrestling program at this school.</p>
          <Link href={`/girls/schools/${schoolParam}`} className="mt-4 inline-block text-sm text-slate-600 underline hover:text-slate-900">
            View girls program →
          </Link>
        </div>
      </div>
    )
  }

  const totalPts = bdRows.reduce((sum, r) => sum + Number(r.total_points), 0)
  const totalWins = bdRows.reduce((sum, r) => sum + Number(r.win_count), 0)

  // Collect unique district/region identifiers — "D5" → "District 5", "R2" → "Region 2"
  const districtSet = new Set(rows.map(r => r.districts_short).filter(Boolean))
  const regionSet   = new Set(rows.map(r => r.regions_short).filter(Boolean))
  const districtLabels = [...districtSet].sort().map(d => `District ${(d as string).slice(1)}`)
  const regionLabels   = [...regionSet].sort().map(r => `Region ${(r as string).slice(1)}`)

  // Group wrestlers by weight class for display
  const byWeight = new Map<number, WrestlerRow[]>()
  for (const w of rows) {
    const wt = w.primary_weight ?? 0
    if (!byWeight.has(wt)) byWeight.set(wt, [])
    byWeight.get(wt)!.push(w)
  }
  const weights = [...byWeight.keys()].sort((a, b) => a - b)

  // Champions — 1st-place finishers, grouped by tournament, most recent first
  type ChampSection = { label: string; wrestlers: WrestlerRow[] }
  const champSections: ChampSection[] = []

  const stateChamps = rows
    .filter(r => r.state_placement === '1st')
    .sort((a, b) => a.primary_weight - b.primary_weight)
  if (stateChamps.length > 0) champSections.push({ label: 'State', wrestlers: stateChamps })

  const regionChampGroups = new Map<string, WrestlerRow[]>()
  for (const w of rows.filter(r => r.regions_placement === '1st').sort((a, b) => a.primary_weight - b.primary_weight)) {
    const key = w.regions_short ?? ''
    if (!regionChampGroups.has(key)) regionChampGroups.set(key, [])
    regionChampGroups.get(key)!.push(w)
  }
  for (const [key, wrestlers] of [...regionChampGroups.entries()].sort())
    champSections.push({ label: `Region ${key.slice(1)}`, wrestlers })

  const districtChampGroups = new Map<string, WrestlerRow[]>()
  for (const w of rows.filter(r => r.districts_placement === '1st').sort((a, b) => a.primary_weight - b.primary_weight)) {
    const key = w.districts_short ?? ''
    if (!districtChampGroups.has(key)) districtChampGroups.set(key, [])
    districtChampGroups.get(key)!.push(w)
  }
  for (const [key, wrestlers] of [...districtChampGroups.entries()].sort())
    champSections.push({ label: `District ${key.slice(1)}`, wrestlers })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link
        href="/boys/schools"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← School Directory
      </Link>

      {/* School header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900">{schoolName}</h2>
          <FollowSchoolButton schoolId={schoolId} />
        </div>
        <div className="flex flex-wrap items-center gap-1 text-slate-500 text-sm mt-1">
          {(districtLabels.length > 0 || regionLabels.length > 0) && (
            <span>{[...districtLabels, ...regionLabels].join(' · ')} ·</span>
          )}
          <span>Boys postseason · NJSIAA</span>
          <InlineSeasonPicker activeSeason={season} />
          <span>· {rows.length} wrestler{rows.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Team points breakdown */}
      {bdRows.length > 0 && (
        <section className="mb-10">
          <h3 className="text-base font-semibold text-slate-800 mb-3">Team Points</h3>
          <div className="inline-block border border-black rounded-none overflow-x-auto shadow-none bg-white">
            <table className="text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium text-slate-500 w-36">Tournament</th>
                  <th className="text-right px-5 py-2.5 font-medium text-slate-500 w-24">Points</th>
                  <th className="text-right px-5 py-2.5 font-medium text-slate-500 w-20">Wins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bdRows.map(r => (
                  <tr key={r.tournament_type} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 text-slate-700 font-medium">
                      {TOURNEY_LABEL[r.tournament_type] ?? r.tournament_type}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-slate-800">
                      {r.total_points}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-slate-500">
                      {r.win_count}
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-5 py-2.5 font-bold text-slate-800">Total</td>
                  <td className="px-5 py-2.5 text-right tabular-nums font-bold text-slate-900">
                    {Math.round(totalPts * 10) / 10}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-slate-600">
                    {totalWins}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Champions */}
      {champSections.length > 0 && (
        <section className="mb-10">
          <h3 className="text-base font-semibold text-slate-800 mb-3">Champions</h3>
          <div className="border border-black rounded-none overflow-x-auto shadow-none bg-white">
            {champSections.map((sec, i) => (
              <div key={sec.label} className={i > 0 ? 'border-t border-slate-200' : ''}>
                <div className="px-4 py-1.5 bg-amber-50 text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  {sec.label}
                </div>
                <ul>
                  {sec.wrestlers.map(w => (
                    <li key={w.wrestler_id} className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-50 first:border-0">
                      <span className="text-xs tabular-nums text-slate-400 font-mono w-12 text-right shrink-0">{w.primary_weight} lb</span>
                      <Link href={`/wrestler/${w.wrestler_id}`} className="font-medium text-slate-800 hover:text-slate-600 hover:underline">
                        {w.wrestler_name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Team leaderboard */}
      {leaderRows.length > 0 && (
        <section className="mb-10">
          <h3 className="text-base font-semibold text-slate-800 mb-3">Team Leaderboard</h3>
          <div className="border border-black rounded-none overflow-x-auto shadow-none bg-white">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-500 w-14">Wt</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-500">Wrestler</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-500 w-14">Wins</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-500 w-14">Falls</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-500 w-20">Fast Pin</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-500 w-16">Bonus%</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-500 w-14">Districts</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-500 w-14">Regions</th>
                  <th className="text-right px-3 py-2.5 font-medium text-slate-500 w-14">States</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-500 w-14">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaderRows.map((r, i) => {
                  const fastPin = r.fastest_fall_sec != null
                    ? `${Math.floor(r.fastest_fall_sec / 60)}:${String(r.fastest_fall_sec % 60).padStart(2, '0')}`
                    : '—'
                  return (
                    <tr key={r.wrestler_id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-400 text-xs font-mono">{r.primary_weight}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-300 w-4 text-right shrink-0">{i + 1}</span>
                          <Link
                            href={`/wrestler/${r.wrestler_id}`}
                            className="font-medium text-slate-800 hover:text-slate-600 hover:underline truncate"
                          >
                            {r.wrestler_name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{r.win_count}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{r.fall_count}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{fastPin}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{r.bonus_pct}%</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{r.district_points ? r.district_points : '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{r.region_points ? r.region_points : '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{r.state_points ? r.state_points : '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-800">{r.total_points}</td>
                    </tr>
                  )
                })}
                {/* Total row */}
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-4 py-2.5" colSpan={6}></td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-800">
                    {leaderRows.reduce((s, r) => s + Number(r.district_points), 0) || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-800">
                    {leaderRows.reduce((s, r) => s + Number(r.region_points), 0) || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-800">
                    {leaderRows.reduce((s, r) => s + Number(r.state_points), 0) || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-900">
                    {leaderRows.reduce((s, r) => s + Number(r.total_points), 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Wrestler results */}
      <section>
        <h3 className="text-base font-semibold text-slate-800 mb-3">Wrestlers</h3>
        <div className="border border-black rounded-none overflow-x-auto shadow-none bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-right px-4 py-2.5 font-medium text-slate-500 w-16">Wt</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">Wrestler</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500 hidden sm:table-cell">Districts</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500 hidden sm:table-cell">Regions</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {weights.map(wt => (
                byWeight.get(wt)!.map((w, i) => (
                  <tr key={w.wrestler_id} className="hover:bg-slate-50">
                    {/* Weight cell: only show on first row for this weight */}
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 font-mono text-xs">
                      {i === 0 ? `${wt} lb` : ''}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/wrestler/${w.wrestler_id}`}
                        className="font-medium text-slate-800 hover:text-slate-600 hover:underline"
                      >
                        {w.wrestler_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <PlaceBadge placement={w.districts_placement} short={w.districts_short} />
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <PlaceBadge placement={w.regions_placement} short={w.regions_short} />
                    </td>
                    <td className="px-4 py-2.5">
                      <PlaceBadge placement={w.state_placement} />
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
