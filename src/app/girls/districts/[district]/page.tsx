import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { IndividualTeamPoints } from '@/components/IndividualTeamPoints'

const WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]

const PLACE_LABEL: Record<number, string> = {
  1: 'Champion',
  2: 'Runner-Up',
  3: '3rd Place',
  4: '4th Place',
}

// ── Types ───────────────────────────────────────────────────────────────────

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

type SchoolRow = {
  school: string
  school_name: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(secs: number): string {
  if (!secs || secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

// ── Sub-components ───────────────────────────────────────────────────────────

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

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function GirlsDistrictSummaryPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const { district: raw } = await params
  const d = Number(raw)
  if (!d || d < 1 || d > 12) notFound()

  // Girls districts only exist from season 2 onward
  const season = Math.max(await getActiveSeason(), 2)

  const [placementsRes, matTimeRes, fastPinRes, fastTfRes, bonusPctRes, schoolsRes, teamScoreRes, teamPtsRes] =
    await Promise.all([
      supabase.rpc('district_placements',  { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_mat_time',    { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_fastest_pin', { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_fastest_tf',  { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_dominance',   { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_schools',     { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_team_score',  { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_team_pts',    { p_district: d, p_gender: 'F', p_season: season }),
    ])

  const placements = (placementsRes.data ?? []) as PlacementRow[]
  const matTime    = (matTimeRes.data    ?? []) as MatTimeRow[]
  const fastPin    = (fastPinRes.data    ?? []) as FastestPinRow[]
  const fastTf     = (fastTfRes.data     ?? []) as FastestTfRow[]
  const dominance  = (bonusPctRes.data   ?? []) as DominanceRow[]
  const schools    = (schoolsRes.data    ?? []) as SchoolRow[]
  const teamScore  = (teamScoreRes.data  ?? []) as TeamScoreRow[]
  const teamPts    = (teamPtsRes.data    ?? []) as TeamPtsRow[]

  const placementsByWeight = new Map<number, Map<number, PlacementRow>>()
  for (const p of placements) {
    if (!placementsByWeight.has(p.weight)) placementsByWeight.set(p.weight, new Map())
    placementsByWeight.get(p.weight)!.set(p.place, p)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      <Link
        href="/girls/districts"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← District Index
      </Link>

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-rose-900">District {d}</h1>
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
          <span>NJSIAA</span>
          <InlineSeasonPicker activeSeason={season} seasons={[2]} />
          <span>· Girls postseason</span>
        </div>
      </div>

      {/* ── Bracket grid ── */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-8">
        {WEIGHTS.map(w => (
          <Link
            key={w}
            href={`/girls/districts/${d}/${w}`}
            className="flex flex-col items-center justify-center py-4 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 hover:border-rose-400 transition-colors shadow-sm"
          >
            <span className="text-base font-bold text-slate-800">{w}</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">lbs</span>
          </Link>
        ))}
      </div>

      {/* ── Team Results ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Team Results</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TeamScoreCard rows={teamScore} />

          <IndividualTeamPoints rows={teamPts} />
        </div>
      </section>

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

      {/* ── District Leaders ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">District Leaders</h2>
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

        </div>
      </section>

      {/* ── Schools ── */}
      {schools.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Schools</h2>
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
        </section>
      )}

    </div>
  )
}
