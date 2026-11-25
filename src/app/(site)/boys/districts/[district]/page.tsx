import { TournamentHistoryView, HistoryTabs } from '@/components/site/TournamentHistory'
import Link from 'next/link'
import { PostseasonHomeLink } from '@/components/site/PostseasonHomeLink'
import { IconHint } from '@/components/site/IconHint'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase/public-cached'
import { getPostseasonSeason } from '@/lib/get-season'
import { historySeasonInfo, seasonWeights } from '@/lib/postseasonSeason'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { StdHeader } from '@/components/site/StdPage'
import { WeightTiles, NumberPills } from '@/components/site/PostseasonParts'
import { IndividualTeamPoints } from '@/components/IndividualTeamPoints'
import { BracketBuster } from '@/components/BracketBuster'
import { TeamScoreCard } from '@/components/TeamScoreCard'
import { getBoysOfficialTeamScores } from '@/lib/boysOfficialTeamScores'
import { SHOW_WRESTLER_TEAM_POINTS } from '@/lib/wrestlerTeamPoints'
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

// ── Types ───────────────────────────────────────────────────────────────────

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
  team_points: number
}

type SchoolRow = {
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

/** Generic card for wrestler-keyed stats */
function StatCard<T extends { wrestler_id: string; wrestler_name: string; school: string | null; school_name: string | null; school_id?: number | null; logo_url?: string | null; bg_color?: string | null }>({
  title,
  rows,
  subtitle,
  value,
  note,
  empty = 'No data',
}: {
  title: string
  rows: T[]
  subtitle: (r: T) => string
  value: (r: T) => string
  note?: string
  empty?: string
}) {
  return (
    <div className="bg-white rounded-none border border-black shadow-none overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</h3>
        {note && <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>}
      </div>
      <div className="divide-y divide-slate-100">
        {rows.length === 0 && (
          <p className="px-4 py-3 text-sm text-slate-400">{empty}</p>
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

// TeamScoreCard imported from '@/components/TeamScoreCard'

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DistrictSummaryPage({
  params, searchParams,
}: {
  params: Promise<{ district: string }>
  searchParams: Promise<{ view?: string }>
}) {
  const view = (await searchParams).view === 'history' ? 'history' : 'brackets'
  const { district: raw } = await params
  const d = Number(raw)
  if (!d || d < 1 || d > 32) notFound()

  const { season, options: seasonOptions } = await getPostseasonSeason('M')
  // History tab (Kyle 2026-11-14): every year on file in the picker's seasons
  if (view === 'history') return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <PostseasonHomeLink side="boys" season={season} options={seasonOptions} />
      <StdHeader title={`Boys District ${d}`} summaryKey="district" hideSummary
        tabs={<div className="space-y-3"><NumberPills items={Array.from({ length: 32 }, (_, i) => i + 1).map(dn => ({ key: dn, label: `D${dn}`, href: `/boys/districts/${dn}?view=history` }))} active={d} /><HistoryTabs base={`/boys/districts/${d}`} view="history" /></div>} />
      <TournamentHistoryView gender="M" level="district" num={d} seasons={seasonOptions.map(o => o.id)} />
    </div>
  )

  // 2020-21 (COVID) had no districts: say so rather than show empty boards (as the district list does)
  const hist = await historySeasonInfo('M', season)
  if (hist && !hist.districts) return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <PostseasonHomeLink side="boys" season={season} options={seasonOptions} />
      <StdHeader title={`Boys District ${d}`} summaryKey="district" hideSummary
        picker={<InlineSeasonPicker arrows gender="M" activeSeason={season} options={seasonOptions} />} />
      <p className="text-sm text-slate-600">There were no district tournaments this season. It went straight to the <Link href="/boys/regions" className="underline">super regions</Link>.</p>
    </div>
  )

  const weights = await seasonWeights('M', season, WEIGHTS)   // the season's own classes (Playoff History)

  const [placementsRes, matTimeRes, fastPinRes, fastTfRes, schoolsRes, teamScoreRows, teamPtsRes, stateEntRes, ghostRes, distEntriesRes, statePlacementsRes, logos] =
    await Promise.all([
      supabase.rpc('district_placements',  { p_district: d, p_gender: 'M', p_season: season }),
      supabase.rpc('district_mat_time',    { p_district: d, p_gender: 'M', p_season: season }),
      supabase.rpc('district_fastest_pin', { p_district: d, p_gender: 'M', p_season: season }),
      supabase.rpc('district_fastest_tf',  { p_district: d, p_gender: 'M', p_season: season }),
      supabase.rpc('district_schools',     { p_district: d, p_gender: 'M', p_season: season }),
      // official TrackWrestling totals, not the site formula
      getBoysOfficialTeamScores(`Boy_s Districts District ${d}`, season),
      SHOW_WRESTLER_TEAM_POINTS ? supabase.rpc('district_team_pts',    { p_district: d, p_gender: 'M', p_season: season }) : Promise.resolve({ data: [] }),
      supabase
        .from('tournament_entries')
        .select('wrestler_id, tournaments!inner(season_id, tournament_type)')
        .eq('tournaments.season_id', season)
        .eq('tournaments.tournament_type', 'boys_state'),
      supabase.rpc('ghost_champions', { p_season: season }),
      supabase
        .from('tournament_entries')
        .select('wrestler_id, seed, tournaments!inner(name, season_id, tournament_type)')
        .eq('tournaments.season_id', season)
        .eq('tournaments.tournament_type', 'districts')
        .like('tournaments.name', `%d${d}%`),
      supabase.rpc('state_placements', { p_gender: 'M', p_season: season }),
      getSchoolLogos(),
    ])

  const placements = (placementsRes.data ?? []) as PlacementRow[]
  const matTime    = ((matTimeRes.data   ?? []) as MatTimeRow[]).map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
  const fastPin    = ((fastPinRes.data   ?? []) as FastestPinRow[]).map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
  // a tech of 0:15 or under isn't honored (Kyle 2026-11-14)
  const fastTf     = ((fastTfRes.data    ?? []) as FastestTfRow[]).filter(r => r.fall_time_seconds > 15).map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
  const schools    = (schoolsRes.data    ?? []) as SchoolRow[]
  const teamScore  = (teamScoreRows as TeamScoreRow[]).map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
  const teamPts    = ((teamPtsRes.data   ?? []) as TeamPtsRow[]).map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
  const stateQualIds = new Set(
    ((stateEntRes.data ?? []) as { wrestler_id: string }[]).map(e => e.wrestler_id)
  )
  const ghostIds = new Set(
    ((ghostRes.data ?? []) as { wrestler_id: string; gender: string; tournament_type: string }[])
      .filter(g => g.gender === 'M' && g.tournament_type === 'districts')
      .map(g => g.wrestler_id)
  )
  const seedMap = new Map<string, number>()
  for (const e of ((distEntriesRes.data ?? []) as { wrestler_id: string; seed: number | null }[])) {
    if (e.wrestler_id && e.seed) seedMap.set(e.wrestler_id, e.seed)
  }
  const statePlaceMap = new Map<string, number>()
  for (const sp of ((statePlacementsRes.data ?? []) as { wrestler_id: string; place: number }[])) {
    statePlaceMap.set(sp.wrestler_id, sp.place)
  }

  // A district with a podium but no bracket on file (history_podiums, e.g. 2012-13 District 24 from the Shore Conference
  // archives — Kyle 2026-11-14): its team order stands in for team scores, and the page says where it came from
  const { data: podTeams } = await supabase.from('history_podiums').select('place, school_id, source, school:schools(display_name), tournament:tournaments!inner(name, season_id)')
    .eq('tournament.name', `Boy_s Districts District ${d}`).eq('tournament.season_id', season).is('weight', null).order('place')
  const podiumSource = (podTeams ?? [])[0]?.source as string | undefined
  const teamRows = teamScore.length || !podTeams?.length ? teamScore
    : (podTeams as unknown as { school_id: number | null; school: { display_name: string } | null }[]).map(r => {
        const name = r.school?.display_name ?? 'TBD'
        return { school: name, school_name: name, school_id: r.school_id, total_points: null, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }
      })

  // Organize placements by weight → place
  const placementsByWeight = new Map<number, Map<number, PlacementRow>>()
  for (const p of placements) {
    if (!placementsByWeight.has(p.weight)) placementsByWeight.set(p.weight, new Map())
    placementsByWeight.get(p.weight)!.set(p.place, p)
  }

  return (
    <div>

      <div className="max-w-5xl mx-auto px-4 py-10">
      <PostseasonHomeLink side="boys" season={season} options={seasonOptions} />
      <StdHeader title={`Boys District ${d}`} summaryKey="district" hideSummary
        picker={<InlineSeasonPicker arrows gender="M" activeSeason={season} options={seasonOptions} />}
        tabs={<div className="space-y-3"><NumberPills items={Array.from({ length: 32 }, (_, i) => i + 1).map(dn => ({ key: dn, label: `D${dn}`, href: `/boys/districts/${dn}` }))} active={d} /><HistoryTabs base={`/boys/districts/${d}`} view="brackets" /></div>} />

      {podiumSource && (
        <p className="mb-4 text-sm text-slate-600 border border-slate-300 bg-slate-50 px-3 py-2">
          Bracket not available for this year — placers{teamScore.length ? '' : ' and team order'} from the {podiumSource}.
        </p>
      )}

      {/* ── Bracket grid (none for a podium-only year: Kyle 2026-11-14, team scoring and placements only) ── */}
      {!podiumSource && <div className="mb-8"><WeightTiles side="boys" hrefBase={`/boys/districts/${d}`} weights={weights} /></div>}

      {/* ── Team Results ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Team Results</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TeamScoreCard rows={teamRows} gender="boys" />

          {SHOW_WRESTLER_TEAM_POINTS && <IndividualTeamPoints rows={teamPts} />}
        </div>
      </section>

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
              {weights.map((w, i) => {
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
                      const isSQ = stateQualIds.has(p.wrestler_id)
                      const seed = seedMap.get(p.wrestler_id)
                      const showUpset = seed != null && seed > 4 && seed > place   // only when they finished better than their seed
                      const statePlace = statePlaceMap.get(p.wrestler_id)
                      return (
                        <td key={place} className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
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
                              <IconHint hint={`Placed ${statePlace === 2 ? '2nd' : '3rd'} at the state tournament this season`}>
                                {statePlace === 2 ? '🥈' : '🥉'}
                              </IconHint>
                            )}
                            {statePlace != null && statePlace >= 4 && statePlace <= 8 && (
                              <IconHint hint={`Placed ${statePlace}th at the state tournament this season`} className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1 rounded">
                                S{statePlace}
                              </IconHint>
                            )}
                            {ghostIds.has(p.wrestler_id) && <IconHint hint={seed ? `Ghost champion: won this district as the #${seed} seed (seeded 5th or lower)` : 'Ghost champion: won this district seeded 5th or lower'}>👻</IconHint>}
                            {showUpset && (
                              <IconHint hint={`Seeded #${seed}, finished ${place}${place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}: ${seed - place} spot${seed - place === 1 ? '' : 's'} better than seeded`} className="text-[10px] font-bold text-emerald-600">↑{seed - place}</IconHint>
                            )}
                            {isSQ && !statePlace && (
                              <IconHint hint="State qualifier: wrestled at the state tournament this season" className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 rounded">
                                SQ
                              </IconHint>
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
        <p className="text-[11px] text-slate-400 mt-2 ml-1">
          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 rounded">SQ</span>
          {' '}= State Qualifier
        </p>
      </section>

      {/* ── District Leaders ── */}
      {!podiumSource && <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">District Leaders</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <StatCard<MatTimeRow>
            title="The Terminators"
            note="Total Tourney Mat Time"
            rows={matTime}
            subtitle={r => `${r.school_id != null ? r.school_name : 'TBD'} · ${r.match_count} wins`}
            value={r => fmtTime(r.total_seconds)}
          />

          <StatCard<FastestPinRow>
            title="Quickest Deck"
            empty="No Pins"
            rows={fastPin}
            subtitle={r => `${r.school_id != null ? r.school_name : 'TBD'} · ${r.weight} lb`}
            value={r => fmtTime(r.fall_time_seconds)}
          />

          <StatCard<FastestTfRow>
            title="Quickest Tech"
            empty="No Techs"
            rows={fastTf}
            subtitle={r => `${r.school_id != null ? r.school_name : 'TBD'} · ${r.weight} lb`}
            value={r => fmtTime(r.fall_time_seconds)}
          />


        </div>
      </section>}

      {/* ── Bracket Buster ── */}
      {!podiumSource && <section className="mb-10">
        <BracketBuster
          season={season}
          gender="M"
          tournamentType="districts"
          district={d}
          title="Bracket Buster — District Upsets"
          limit={8}
        />
      </section>}

      {/* ── Schools ── */}
      {schools.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Schools</h2>
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
        </section>
      )}

      </div>
    </div>
  )
}
