import Link from 'next/link'
import { IconHint } from '@/components/site/IconHint'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase/public-cached'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { StdHeader } from '@/components/site/StdPage'
import { WeightTiles, NumberPills } from '@/components/site/PostseasonParts'
import { BracketBuster } from '@/components/BracketBuster'
import { TeamScoreCard } from '@/components/TeamScoreCard'
import { getBoysOfficialTeamScores } from '@/lib/boysOfficialTeamScores'
import { SHOW_WRESTLER_TEAM_POINTS } from '@/lib/wrestlerTeamPoints'
import { IndividualTeamPoints } from '@/components/IndividualTeamPoints'
import RegionVideo from '@/components/RegionVideo'
import { getSchoolLogos } from '@/lib/school-logos'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'
import { SchoolTag } from '@/components/SchoolTag'

const WEIGHTS = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]

const PLACE_LABEL: Record<number, string> = {
  1: 'Champion',
  2: 'Runner-Up',
  3: '3rd Place',
  4: '4th Place',
}

// ── Types ────────────────────────────────────────────────────────────────────

type PlacementRow = {
  weight: number
  place: number
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  school_id?: number | null
}

type MatTimeRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  school_id?: number | null
  total_seconds: number
  match_count: number
}

type FastestPinRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  school_id?: number | null
  fall_time_seconds: number
  weight: number
}

type FastestTfRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  school_id?: number | null
  fall_time_seconds: number
  weight: number
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
  school_id?: number | null
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(secs: number): string {
  if (!secs || secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard<T extends { wrestler_id: string; wrestler_name: string; school: string | null; school_name: string | null; school_id?: number | null; logo_url?: string | null; bg_color?: string | null }>({
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
            <SchoolLogoBadge logoUrl={r.logo_url} bgColor={r.bg_color} />
            <div className="flex-1 min-w-0">
              <Link
                href={`/boys/wrestler/${r.wrestler_id}`}
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

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function RegionSummaryPage({
  params,
}: {
  params: Promise<{ region: string }>
}) {
  const { region: raw } = await params
  const r = Number(raw)
  if (!r || r < 1 || r > 8) notFound()

  const season = await getActiveSeason('M')

  const [placementsRes, matTimeRes, fastPinRes, fastTfRes, teamScoreRows, teamPtsRes, regionSchoolsRes, videoRes, ghostRes, regionEntriesRes, statePlacementsRes, logos] =
    await Promise.all([
      supabase.rpc('region_placements',  { p_region: r, p_gender: 'M', p_season: season }),
      supabase.rpc('region_mat_time',    { p_region: r, p_gender: 'M', p_season: season }),
      supabase.rpc('region_fastest_pin', { p_region: r, p_gender: 'M', p_season: season }),
      supabase.rpc('region_fastest_tf',  { p_region: r, p_gender: 'M', p_season: season }),
      // official TrackWrestling totals, not the site formula
      getBoysOfficialTeamScores(`Boy_s Regions r${r}`, season),
      SHOW_WRESTLER_TEAM_POINTS ? supabase.rpc('region_postseason_pts', { p_region: r, p_gender: 'M', p_season: season }) : Promise.resolve({ data: [] }),
      supabase.rpc('region_schools',     { p_region: r, p_gender: 'M', p_season: season }),
      supabase.from('tournaments').select('youtube_url').eq('name', `Boy_s Regions r${r}`).eq('season_id', season).single(),
      supabase.rpc('ghost_champions', { p_season: season }),
      supabase
        .from('tournament_entries')
        .select('wrestler_id, seed, tournaments!inner(name, season_id, tournament_type)')
        .eq('tournaments.season_id', season)
        .eq('tournaments.tournament_type', 'regions')
        .like('tournaments.name', `%r${r}%`),
      supabase.rpc('state_placements', { p_gender: 'M', p_season: season }),
      getSchoolLogos(),
    ])

  const placements    = (placementsRes.data    ?? []) as PlacementRow[]
  const matTime       = ((matTimeRes.data   ?? []) as MatTimeRow[]).map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
  const fastPin       = ((fastPinRes.data   ?? []) as FastestPinRow[]).map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
  const fastTf        = ((fastTfRes.data    ?? []) as FastestTfRow[]).map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
  const teamScore     = (teamScoreRows as TeamScoreRow[]).map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
  const teamPts       = ((teamPtsRes.data   ?? []) as TeamPtsRow[]).map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
  const regionSchools = (regionSchoolsRes.data ?? []) as RegionSchoolRow[]
  const youtubeUrl = (videoRes.data?.youtube_url as string | null) ?? null

  // Ghost champion IDs + seed map for badges
  const ghostIds = new Set(
    ((ghostRes.data ?? []) as { wrestler_id: string; gender: string; tournament_type: string }[])
      .filter(g => g.gender === 'M' && g.tournament_type === 'regions')
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
    <div>

      <div className="max-w-5xl mx-auto px-4 py-10">
      <StdHeader title={`Boys Region ${r}`} summaryKey="region"
        picker={<InlineSeasonPicker gender="M" activeSeason={season} />}
        tabs={<NumberPills items={[1, 2, 3, 4, 5, 6, 7, 8].map(rn => ({ key: rn, label: `R${rn}`, href: `/boys/regions/${rn}` }))} active={r} />} />

      {/* ── Bracket grid ── */}
      <div className="mb-8"><WeightTiles side="boys" hrefBase={`/boys/regions/${r}`} weights={WEIGHTS} /></div>

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
                      const showUpset = seed != null && seed > 4 && seed > place   // only when they finished better than their seed
                      const statePlace = statePlaceMap.get(p.wrestler_id)
                      return (
                        <td key={place} className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/boys/wrestler/${p.wrestler_id}`}
                              className={`font-medium hover:underline leading-tight ${
                                place === 1 ? 'text-slate-900' : 'text-slate-700'
                              }`}
                            >
                              {p.wrestler_name}
                            </Link>
                            {statePlace === 1 && <IconHint hint="State champion this season">👑</IconHint>}
                            {statePlace != null && statePlace >= 2 && statePlace <= 3 && (
                              <IconHint hint={`Placed ${statePlace === 2 ? '2nd' : '3rd'} at the state tournament this season`} className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded">
                                {statePlace === 2 ? '🥈' : '🥉'}
                              </IconHint>
                            )}
                            {statePlace != null && statePlace >= 4 && statePlace <= 8 && (
                              <IconHint hint={`Placed ${statePlace}th at the state tournament this season`} className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1 rounded">
                                S{statePlace}
                              </IconHint>
                            )}
                            {ghostIds.has(p.wrestler_id) && <IconHint hint={seed ? `Ghost champion: won this region as the #${seed} seed (seeded 5th or lower)` : 'Ghost champion: won this region seeded 5th or lower'}>👻</IconHint>}
                            {showUpset && (
                              <IconHint hint={`Seeded #${seed}, finished ${place}${place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}: ${seed - place} spot${seed - place === 1 ? '' : 's'} better than seeded`} className="text-[10px] font-bold text-emerald-600">↑{seed - place}</IconHint>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 truncate block">
                            <SchoolTag id={p.school_id} name={p.school_name} className="text-xs text-slate-500" />
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
      <RegionVideo youtubeUrl={youtubeUrl} regionName={`Region ${r}`} />

      {/* ── Region Leaders ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Region Leaders</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

          <StatCard<MatTimeRow>
            title="The Terminators"
            note="Total Postseason Mat Time"
            rows={matTime}
            subtitle={r => `${r.school_id != null ? r.school_name : 'TBD'} · ${r.match_count} wins`}
            value={r => fmtTime(r.total_seconds)}
          />

          <StatCard<FastestPinRow>
            title="Quickest Deck"
            rows={fastPin}
            subtitle={r => `${r.school_id != null ? r.school_name : 'TBD'} · ${r.weight} lb`}
            value={r => fmtTime(r.fall_time_seconds)}
          />

          <StatCard<FastestTfRow>
            title="Quickest Tech"
            rows={fastTf}
            subtitle={r => `${r.school_id != null ? r.school_name : 'TBD'} · ${r.weight} lb`}
            value={r => fmtTime(r.fall_time_seconds)}
          />


          <TeamScoreCard rows={teamScore} gender="boys" />

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
          gender="M"
          tournamentType="regions"
          region={r}
          title="Bracket Buster — Region Upsets"
          limit={8}
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
                  {schools.map(s => s.school_id ? (
                    <Link
                      key={s.school_id ?? s.school}
                      href={`/boys/schools/${s.school_id}`}
                      className="px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 rounded-full hover:border-slate-400 hover:bg-slate-50 transition-colors shadow-none"
                    >
                      <SchoolTag id={s.school_id} name={s.school_name} className="text-sm font-medium" />
                    </Link>
                  ) : (
                    <span key={s.school_id ?? s.school} className="px-3 py-1.5 text-sm font-medium bg-white border border-slate-200 rounded-full text-slate-500">
                      <SchoolTag id={s.school_id} name={s.school_name} className="text-sm font-medium" />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      </div>
    </div>
  )
}
