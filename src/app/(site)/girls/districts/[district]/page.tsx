import Link from 'next/link'
import { IconHint } from '@/components/site/IconHint'
import { getSeasonIdsWithTournamentType } from '@/lib/seasons-server'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase/public-cached'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { StdHeader } from '@/components/site/StdPage'
import { WeightTiles, NumberPills } from '@/components/site/PostseasonParts'
import { getGirlsOfficialTeamScores } from '@/lib/girlsOfficialTeamScores'
import { BracketBuster } from '@/components/BracketBuster'
import { TeamScoreCard } from '@/components/TeamScoreCard'
import { getSchoolLogos } from '@/lib/school-logos'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'
import { SchoolTag } from '@/components/SchoolTag'

const WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]

const PLACE_LABEL: Record<number, string> = {
  1: 'Champion',
  2: 'Runner-Up',
  3: '3rd Place',
  4: '4th Place',
  5: '5th Place',
  6: '6th Place',
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
                href={`/girls/wrestler/${r.wrestler_id}`}
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

export default async function GirlsDistrictSummaryPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const { district: raw } = await params
  const d = Number(raw)
  if (!d || d < 1 || d > 12) notFound()

  // Girls districts only exist from season 2 onward
  const districtSeasons = await getSeasonIdsWithTournamentType('districts', 'F')
  const activeSeason = await getActiveSeason('F')
  const season = districtSeasons.includes(activeSeason) ? activeSeason : (districtSeasons[0] ?? activeSeason)

  const [placementsRes, matTimeRes, fastPinRes, fastTfRes, schoolsRes, teamScoreRows, stateEntRes, ghostRes, distEntriesRes, statePlacementsRes, logos] =
    await Promise.all([
      supabase.rpc('district_placements',  { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_mat_time',    { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_fastest_pin', { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_fastest_tf',  { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_schools',     { p_district: d, p_gender: 'F', p_season: season }),
      getGirlsOfficialTeamScores(`Girl_s Districts District ${d}`, season),
      supabase
        .from('tournament_entries')
        .select('wrestler_id, tournaments!inner(season_id, tournament_type)')
        .eq('tournaments.season_id', season)
        .eq('tournaments.tournament_type', 'girls_state'),
      supabase.rpc('ghost_champions', { p_season: season }),
      supabase
        .from('tournament_entries')
        .select('wrestler_id, seed, tournaments!inner(name, season_id, tournament_type)')
        .eq('tournaments.season_id', season)
        .eq('tournaments.tournament_type', 'districts')
        .like('tournaments.name', `%d${d}%`),
      supabase.rpc('state_placements', { p_gender: 'F', p_season: season }),
      getSchoolLogos(),
    ])

  const placements = (placementsRes.data ?? []) as PlacementRow[]
  const matTime    = ((matTimeRes.data   ?? []) as MatTimeRow[]).map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
  const fastPin    = ((fastPinRes.data   ?? []) as FastestPinRow[]).map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
  const fastTf     = ((fastTfRes.data    ?? []) as FastestTfRow[]).map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
  const schools    = (schoolsRes.data    ?? []) as SchoolRow[]
  const teamScore  = (teamScoreRows as TeamScoreRow[]).map(r => ({ ...r, logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null, bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null }))
  const stateQualIds = new Set(
    ((stateEntRes.data ?? []) as { wrestler_id: string }[]).map(e => e.wrestler_id)
  )
  const ghostIds = new Set(
    ((ghostRes.data ?? []) as { wrestler_id: string; gender: string; tournament_type: string }[])
      .filter(g => g.gender === 'F' && g.tournament_type === 'districts')
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

  const placementsByWeight = new Map<number, Map<number, PlacementRow>>()
  for (const p of placements) {
    if (!placementsByWeight.has(p.weight)) placementsByWeight.set(p.weight, new Map())
    placementsByWeight.get(p.weight)!.set(p.place, p)
  }

  return (
    <div>

      <div className="max-w-5xl mx-auto px-4 py-10">
      <StdHeader title={`Girls District ${d}`} summaryKey="district"
        picker={<InlineSeasonPicker gender="F" activeSeason={season} seasons={districtSeasons} />}
        tabs={<NumberPills items={Array.from({ length: 12 }, (_, i) => i + 1).map(dn => ({ key: dn, label: `D${dn}`, href: `/girls/districts/${dn}` }))} active={d} />} />

      {/* ── Bracket grid ── */}
      <div className="mb-8"><WeightTiles side="girls" hrefBase={`/girls/districts/${d}`} weights={WEIGHTS} /></div>

      {/* ── Team Results ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Team Results</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TeamScoreCard rows={teamScore} gender="girls" />
        </div>
      </section>

      {/* ── Placements ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Placements</h2>
        <div className="overflow-x-auto rounded-none border border-black shadow-none">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-1 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-14">
                  Wt
                </th>
                {[1, 2, 3, 4, 5, 6].map(place => (
                  <th
                    key={place}
                    className="px-3 py-1 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
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
                    <td className="px-3 py-1 font-bold text-slate-700">{w}</td>
                    {[1, 2, 3, 4, 5, 6].map(place => {
                      const p = row.get(place)
                      if (!p) {
                        return (
                          <td key={place} className="px-3 py-1 text-slate-300 text-sm">—</td>
                        )
                      }
                      const isSQ = stateQualIds.has(p.wrestler_id)
                      const seed = seedMap.get(p.wrestler_id)
                      const showUpset = seed != null && seed > 4
                      const statePlace = statePlaceMap.get(p.wrestler_id)
                      return (
                        <td key={place} className="px-3 py-1">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/girls/wrestler/${p.wrestler_id}`}
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
                              <IconHint hint={`Seeded #${seed}, finished ${place}${place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}: ${seed - place} spots better than seeded`} className="text-[10px] font-bold text-emerald-600">↑{seed - place}</IconHint>
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
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">District Leaders</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

          <StatCard<MatTimeRow>
            title="The Terminators"
            note="Total Tourney Mat Time"
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


        </div>
      </section>

      {/* ── Bracket Buster ── */}
      <section className="mb-10">
        <BracketBuster
          season={season}
          gender="F"
          tournamentType="districts"
          district={d}
          title="Bracket Buster — District Upsets"
          limit={8}
          schoolBase="/schools"
          accentColor="rose"
        />
      </section>

      {/* ── Schools ── */}
      {schools.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Schools</h2>
          <div className="flex flex-wrap gap-2">
            {schools.map(s => s.school_id ? (
              <Link
                key={s.school_id ?? s.school}
                href={`/girls/schools/${s.school_id}`}
                className="px-3 py-1.5 text-sm font-medium bg-white border border-rose-200 rounded-full hover:border-rose-400 hover:bg-rose-50 transition-colors shadow-none"
              >
                <SchoolTag id={s.school_id} name={s.school_name} className="text-sm font-medium" />
              </Link>
            ) : (
              <span key={s.school_id ?? s.school} className="px-3 py-1.5 text-sm font-medium bg-white border border-rose-200 rounded-full text-slate-500">
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
