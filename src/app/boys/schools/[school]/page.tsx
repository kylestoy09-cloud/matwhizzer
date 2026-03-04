import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getActiveSeason } from '@/lib/get-season'

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
  const { school: encoded } = await params
  const school = decodeURIComponent(encoded)

  const season = await getActiveSeason()

  const [{ data: breakdown }, { data: wrestlers }, { data: nameRow }] = await Promise.all([
    supabase.rpc('school_points_breakdown', { p_school: school, p_gender: 'M', p_season: season }),
    supabase.rpc('school_wrestlers',        { p_school: school, p_gender: 'M', p_season: season }),
    supabase.from('school_names').select('school_name').eq('abbreviation', school).maybeSingle(),
  ])

  const rows     = (wrestlers  ?? []) as WrestlerRow[]
  const bdRows   = (breakdown  ?? []) as BreakdownRow[]

  if (rows.length === 0) notFound()

  const schoolName = (nameRow as { school_name: string } | null)?.school_name ?? school

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
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold text-slate-900">{schoolName}</h2>
          <span className="text-slate-400 text-sm">{school}</span>
        </div>
        <p className="text-slate-500 text-sm mt-1">
          {[...districtLabels, ...regionLabels].join(' · ')}
          {(districtLabels.length > 0 || regionLabels.length > 0) && ' · '}
          Boys postseason · NJSIAA 2024–25 · {rows.length} wrestler{rows.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Team points breakdown */}
      {bdRows.length > 0 && (
        <section className="mb-10">
          <h3 className="text-base font-semibold text-slate-800 mb-3">Team Points</h3>
          <div className="inline-block border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
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

      {/* Wrestler results */}
      <section>
        <h3 className="text-base font-semibold text-slate-800 mb-3">Wrestlers</h3>
        <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
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
