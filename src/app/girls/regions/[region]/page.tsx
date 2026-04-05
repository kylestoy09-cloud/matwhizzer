import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { BracketBuster } from '@/components/BracketBuster'
import { TeamScoreCard } from '@/components/TeamScoreCard'
import { IndividualTeamPoints } from '@/components/IndividualTeamPoints'
import RegionVideo from '@/components/RegionVideo'
import { PageHeader } from '@/components/PageHeader'

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
  school_id: number | null
  total_points: number
}

type TeamPtsRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  weight: number
  district_pts: number
  region_pts: number
  team_points: number
}

type RegionSchoolRow = {
  district_num: number
  school: string
  school_name: string | null
  school_id: number | null
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
    <div className="bg-white rounded-none border border-black shadow-none overflow-hidden">
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

  const [placementsRes, matTimeRes, fastPinRes, fastTfRes, dominanceRes, teamScoreRes, teamPtsRes, regionSchoolsRes, videoRes, ghostRes, regionEntriesRes, statePlacementsRes] =
    await Promise.all([
      supabase.rpc('girls_region_placements',  { p_region: region, p_season: season }),
      supabase.rpc('girls_region_mat_time',    { p_region: region, p_season: season }),
      supabase.rpc('girls_region_fastest_pin', { p_region: region, p_season: season }),
      supabase.rpc('girls_region_fastest_tf',  { p_region: region, p_season: season }),
      supabase.rpc('girls_region_dominance',   { p_region: region, p_season: season }),
      supabase.rpc('girls_region_team_score',  { p_region: region, p_season: season }),
      supabase.rpc('region_postseason_pts',     { p_region: Number(region), p_gender: 'F', p_season: season }),
      supabase.rpc('girls_region_schools',     { p_region: region, p_season: season }),
      supabase.from('tournaments').select('youtube_url').eq('name', `Girl_s Regions r${region}`).eq('season_id', season).single(),
      supabase.rpc('ghost_champions', { p_season: season }),
      supabase
        .from('tournament_entries')
        .select('wrestler_id, seed, tournaments!inner(name, season_id, tournament_type)')
        .eq('tournaments.season_id', season)
        .eq('tournaments.tournament_type', 'girls_regions')
        .like('tournaments.name', `%r${region}%`),
      supabase.rpc('state_placements', { p_gender: 'F', p_season: season }),
    ])

  const placements    = (placementsRes.data    ?? []) as PlacementRow[]
  const matTime       = (matTimeRes.data       ?? []) as MatTimeRow[]
  const fastPin       = (fastPinRes.data       ?? []) as FastestPinRow[]
  const fastTf        = (fastTfRes.data        ?? []) as FastestTfRow[]
  const dominance     = (dominanceRes.data     ?? []) as DominanceRow[]
  const teamScore     = (teamScoreRes.data     ?? []) as TeamScoreRow[]
  const teamPts       = (teamPtsRes.data       ?? []) as TeamPtsRow[]
  const regionSchools = (regionSchoolsRes.data ?? []) as RegionSchoolRow[]
  const youtubeUrl = (videoRes.data?.youtube_url as string | null) ?? null

  const ghostIds = new Set(
    ((ghostRes.data ?? []) as { wrestler_id: string; gender: string; tournament_type: string }[])
      .filter(g => g.gender === 'F' && g.tournament_type === 'girls_regions')
      .map(g => g.wrestler_id)
  )
  const seedMap = new Map<string, number>()
  for (const e of ((regionEntriesRes.data ?? []) as { wrestler_id: string; seed: number | null }[])) {
    if (e.wrestler_id && e.seed) seedMap.set(e.wrestler_id, e.seed)
  }
  const statePlaceMap = new Map<string, number>()
  for (const sp of ((statePlacementsRes.data ?? []) as { wrestler_id: string; place: number }[])) {
    statePlaceMap.set(sp.wrestler_id, sp.place)
  }

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

      {/* Region navigation */}
      <div className="flex gap-1.5 mb-4">
        {['1', '2', '3', '4'].map(rn => (
          <Link
            key={rn}
            href={`/girls/regions/${rn}`}
            className={`px-3 py-1.5 rounded-none text-sm font-semibold transition-colors ${
              rn === region
                ? 'bg-rose-800 text-white'
                : 'bg-white border border-black text-slate-700 hover:bg-rose-50 hover:border-rose-400 shadow-none'
            }`}
          >
            R{rn}
          </Link>
        ))}
      </div>

      {/* Header */}
      <div className="mb-8 text-center">
        <PageHeader title={`Girls ${displayName}`} />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
          <InlineSeasonPicker activeSeason={season} />
          <span>· Girls Postseason — Top 4 Advance</span>
        </div>
      </div>

      {/* ── Bracket grid ── */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-8">
        {WEIGHTS.map(w => (
          <Link
            key={w}
            href={`/girls/regions/${region}/${w}`}
            className="flex flex-col items-center justify-center py-4 rounded-none border border-black bg-white hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-none"
          >
            <span className="text-base font-bold text-slate-800">{w}</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">lbs</span>
          </Link>
        ))}
      </div>

      {/* ── Placements ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Placements</h2>
        <div className="overflow-x-auto rounded-none border border-black shadow-none">
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
                      const seed = seedMap.get(p.wrestler_id)
                      const showUpset = seed != null && seed > 4
                      const statePlace = statePlaceMap.get(p.wrestler_id)
                      return (
                        <td key={place} className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/wrestler/${p.wrestler_id}`}
                              className={`font-medium hover:underline leading-tight ${
                                place === 1 ? 'text-slate-900' : 'text-slate-700'
                              }`}
                            >
                              {p.wrestler_name}
                            </Link>
                            {statePlace === 1 && <span title="State Champion" className="shrink-0">👑</span>}
                            {statePlace != null && statePlace >= 2 && statePlace <= 3 && (
                              <span className="shrink-0" title={`State ${statePlace}${statePlace === 2 ? 'nd' : 'rd'}`}>
                                {statePlace === 2 ? '🥈' : '🥉'}
                              </span>
                            )}
                            {statePlace != null && statePlace >= 4 && statePlace <= 8 && (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1 rounded shrink-0" title={`State ${statePlace}th`}>
                                S{statePlace}
                              </span>
                            )}
                            {ghostIds.has(p.wrestler_id) && <span title="Ghost Champion" className="shrink-0">👻</span>}
                            {showUpset && (
                              <span className="text-[10px] font-bold text-emerald-600 shrink-0" title={`Seed #${seed}`}>↑{seed - place}</span>
                            )}
                          </div>
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

      {/* ── Region Video ── */}
      <RegionVideo youtubeUrl={youtubeUrl} regionName={`Girls ${displayName}`} />

      {/* ── Region Leaders ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Region Leaders</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

          <StatCard<MatTimeRow>
            title="The Terminators"
            note="Total Postseason Mat Time"
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
            note="Avg dominance per match: pins/TFs graded by speed (max 9), MD=2, Dec=1, losses scored inverse"
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
          <IndividualTeamPoints rows={teamPts} title="Postseason Individual Points Leaders" />
        </section>
      )}

      {/* ── Bracket Buster ── */}
      <section className="mb-10">
        <BracketBuster
          season={season}
          gender="F"
          tournamentType="regions"
          region={Number(region)}
          title="Bracket Buster — Region Upsets"
          limit={8}
          schoolBase="/schools"
          accentColor="rose"
        />
      </section>

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
                      href={s.school_id ? `/schools/${s.school_id}` : '#'}
                      className="px-3 py-1.5 text-sm font-medium bg-white border border-rose-200 rounded-full hover:border-rose-400 hover:bg-rose-50 transition-colors shadow-none"
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
