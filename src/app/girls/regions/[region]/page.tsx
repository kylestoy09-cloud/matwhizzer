import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'

const WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]

const VALID_REGIONS = new Set(['1', '2', '3', '4'])

const PLACE_LABEL: Record<number, string> = {
  1: 'Champion',
  2: 'Runner-Up',
  3: '3rd Place',
  4: '4th Place',
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PlacementRow = {
  weight: number
  place: number
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
}

type MatTimeRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  total_seconds: number
  match_count: number
}

type FastestPinRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  fall_time_seconds: number
  weight: number
}

type FastestTfRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  fall_time_seconds: number
  weight: number
}

type DominanceRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  dominance_score: number
  win_count: number
}

type TeamScoreRow = {
  school: string
  school_name: string | null
  total_points: number
}

type TeamPtsRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  weight: number
  team_points: number
}

type RegionSchoolRow = {
  district_num: number
  school: string
  school_name: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(secs: number): string {
  if (!secs || secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard<T extends { wrestler_id: string; wrestler_name: string; school: string | null; school_name: string | null }>({
  title,
  rows,
  subtitle,
  value,
  note,
}: {
  title: string
  rows: T[]
  subtitle: (r: T) => string
  value: (r: T) => string
  note?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</h3>
        {note && <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>}
      </div>
      <div className="divide-y divide-slate-100">
        {rows.length === 0 && (
          <p className="px-4 py-3 text-sm text-slate-400">No data</p>
        )}
        {rows.map((r, i) => (
          <div key={`${r.wrestler_id}-${i}`} className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-xs text-slate-400 w-4 shrink-0 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <Link
                href={`/wrestler/${r.wrestler_id}`}
                className="text-sm font-medium text-slate-800 hover:underline truncate block"
              >
                {r.wrestler_name}
              </Link>
              <div className="text-[11px] text-slate-400 truncate">{subtitle(r)}</div>
            </div>
            <span className="text-sm font-semibold text-slate-700 shrink-0">{value(r)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamScoreCard({ rows }: { rows: TeamScoreRow[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Team Scoring</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.length === 0 && (
          <p className="px-4 py-3 text-sm text-slate-400">No data</p>
        )}
        {rows.map((r, i) => (
          <div key={r.school} className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-xs text-slate-400 w-4 shrink-0 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <Link
                href={`/girls/schools/${encodeURIComponent(r.school)}`}
                className="text-sm font-medium text-slate-800 hover:underline truncate block"
              >
                {r.school_name || r.school}
              </Link>
            </div>
            <span className="text-sm font-semibold text-slate-700 shrink-0">{r.total_points} pts</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function GirlsRegionSummaryPage({
  params,
}: {
  params: Promise<{ region: string }>
}) {
  const { region } = await params
  if (!VALID_REGIONS.has(region)) notFound()

  const displayName = `Region ${region}`

  const season = await getActiveSeason()

  const [placementsRes, matTimeRes, fastPinRes, fastTfRes, dominanceRes, teamScoreRes, teamPtsRes, regionSchoolsRes] =
    await Promise.all([
      supabase.rpc('girls_region_placements',  { p_region: region, p_season: season }),
      supabase.rpc('girls_region_mat_time',    { p_region: region, p_season: season }),
      supabase.rpc('girls_region_fastest_pin', { p_region: region, p_season: season }),
      supabase.rpc('girls_region_fastest_tf',  { p_region: region, p_season: season }),
      supabase.rpc('girls_region_dominance',   { p_region: region, p_season: season }),
      supabase.rpc('girls_region_team_score',  { p_region: region, p_season: season }),
      supabase.rpc('girls_region_team_pts',    { p_region: region, p_season: season }),
      supabase.rpc('girls_region_schools',     { p_region: region, p_season: season }),
    ])

  const placements    = (placementsRes.data    ?? []) as PlacementRow[]
  const matTime       = (matTimeRes.data       ?? []) as MatTimeRow[]
  const fastPin       = (fastPinRes.data       ?? []) as FastestPinRow[]
  const fastTf        = (fastTfRes.data        ?? []) as FastestTfRow[]
  const dominance     = (dominanceRes.data     ?? []) as DominanceRow[]
  const teamScore     = (teamScoreRes.data     ?? []) as TeamScoreRow[]
  const teamPts       = (teamPtsRes.data       ?? []) as TeamPtsRow[]
  const regionSchools = (regionSchoolsRes.data ?? []) as RegionSchoolRow[]

  // Group region schools by district number (already sorted by district_num from RPC)
  const districtGroups: { districtNum: number; schools: RegionSchoolRow[] }[] = []
  for (const row of regionSchools) {
    const last = districtGroups.at(-1)
    if (last?.districtNum === row.district_num) {
      last.schools.push(row)
    } else {
      districtGroups.push({ districtNum: row.district_num, schools: [row] })
    }
  }

  // Organize placements by weight → place
  const placementsByWeight = new Map<number, Map<number, PlacementRow>>()
  for (const p of placements) {
    if (!placementsByWeight.has(p.weight)) placementsByWeight.set(p.weight, new Map())
    placementsByWeight.get(p.weight)!.set(p.place, p)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Back link */}
      <Link
        href="/girls/regions"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Region Index
      </Link>

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-2xl font-bold text-rose-900">Girls {displayName}</h1>
          <InlineSeasonPicker activeSeason={season} />
        </div>
        <p className="text-slate-500 text-sm mt-1">Girls Postseason — Top 4 Advance</p>
      </div>

      {/* ── Bracket grid ── */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-8">
        {WEIGHTS.map(w => (
          <Link
            key={w}
            href={`/girls/regions/${region}/${w}`}
            className="flex flex-col items-center justify-center py-4 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-sm"
          >
            <span className="text-base font-bold text-slate-800">{w}</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">lbs</span>
          </Link>
        ))}
      </div>

      {/* ── Placements ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Placements</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-14">
                  Wt
                </th>
                {[1, 2, 3, 4].map(place => (
                  <th
                    key={place}
                    className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                  >
                    {PLACE_LABEL[place]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEIGHTS.map((w, i) => {
                const row = placementsByWeight.get(w) ?? new Map<number, PlacementRow>()
                return (
                  <tr key={w} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-4 py-2.5 font-bold text-slate-700">{w}</td>
                    {[1, 2, 3, 4].map(place => {
                      const p = row.get(place)
                      if (!p) {
                        return (
                          <td key={place} className="px-4 py-2.5 text-slate-300 text-sm">—</td>
                        )
                      }
                      return (
                        <td key={place} className="px-4 py-2.5">
                          <Link
                            href={`/wrestler/${p.wrestler_id}`}
                            className={`block font-medium hover:underline leading-tight ${
                              place === 1 ? 'text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            {p.wrestler_name}
                          </Link>
                          <span className="text-xs text-slate-500 truncate block">
                            {p.school_name || p.school}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Region Leaders ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Region Leaders</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

          <StatCard<MatTimeRow>
            title="The Terminators"
            note="Total Tourney Mat Time"
            rows={matTime}
            subtitle={r => `${r.school_name || r.school || '—'} · ${r.match_count} wins`}
            value={r => fmtTime(r.total_seconds)}
          />

          <StatCard<FastestPinRow>
            title="Quickest Deck"
            rows={fastPin}
            subtitle={r => `${r.school_name || r.school || '—'} · ${r.weight} lb`}
            value={r => fmtTime(r.fall_time_seconds)}
          />

          <StatCard<FastestTfRow>
            title="Quickest Tech"
            rows={fastTf}
            subtitle={r => `${r.school_name || r.school || '—'} · ${r.weight} lb`}
            value={r => fmtTime(r.fall_time_seconds)}
          />

          <StatCard<DominanceRow>
            title="Hammer Rating"
            note="Avg score per match · losses penalized · min 3 wins"
            rows={dominance}
            subtitle={r => `${r.school_name || r.school || '—'} · ${r.win_count} wins`}
            value={r => String(r.dominance_score)}
          />

          <TeamScoreCard rows={teamScore} />

        </div>
      </section>

      {/* ── Individual Team Points ── */}
      {teamPts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Individual Team Points</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Wrestler</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">School</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-14">Wt</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Pts</th>
                </tr>
              </thead>
              <tbody>
                {teamPts.map((r, i) => (
                  <tr key={`${r.wrestler_id}-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2">
                      <Link href={`/wrestler/${r.wrestler_id}`} className="font-medium text-slate-800 hover:underline">
                        {r.wrestler_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{r.school_name || r.school}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{r.weight}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-700">{r.team_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Schools by District ── */}
      {districtGroups.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Schools by District</h2>
          <div className="space-y-3">
            {districtGroups.map(({ districtNum, schools }) => (
              <div key={districtNum} className="flex items-start gap-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-1.5 w-16 shrink-0 text-right">
                  Dist.&nbsp;{districtNum}
                </span>
                <div className="flex flex-wrap gap-2">
                  {schools.map(s => (
                    <Link
                      key={s.school}
                      href={`/girls/schools/${encodeURIComponent(s.school)}`}
                      className="px-3 py-1.5 text-sm font-medium bg-white border border-rose-200 rounded-full hover:border-rose-400 hover:bg-rose-50 transition-colors shadow-sm"
                    >
                      {s.school_name || s.school}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
