import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { IndividualTeamPoints } from '@/components/IndividualTeamPoints'
import { BracketBuster } from '@/components/BracketBuster'
import { TeamScoreCard } from '@/components/TeamScoreCard'

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
  school_id: number | null
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

  const [placementsRes, matTimeRes, fastPinRes, fastTfRes, bonusPctRes, schoolsRes, teamScoreRes, teamPtsRes, stateEntRes, ghostRes, distEntriesRes, statePlacementsRes] =
    await Promise.all([
      supabase.rpc('district_placements',  { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_mat_time',    { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_fastest_pin', { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_fastest_tf',  { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_dominance',   { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_schools',     { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_team_score',  { p_district: d, p_gender: 'F', p_season: season }),
      supabase.rpc('district_team_pts',    { p_district: d, p_gender: 'F', p_season: season }),
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
    ])

  const placements = (placementsRes.data ?? []) as PlacementRow[]
  const matTime    = (matTimeRes.data    ?? []) as MatTimeRow[]
  const fastPin    = (fastPinRes.data    ?? []) as FastestPinRow[]
  const fastTf     = (fastTfRes.data     ?? []) as FastestTfRow[]
  const dominance  = (bonusPctRes.data   ?? []) as DominanceRow[]
  const schools    = (schoolsRes.data    ?? []) as SchoolRow[]
  const teamScore  = (teamScoreRes.data  ?? []) as TeamScoreRow[]
  const teamPts    = (teamPtsRes.data    ?? []) as TeamPtsRow[]
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

  const { data: logoData } = await supabase.from('districts').select('logo_url').eq('id', d).maybeSingle()
  const logoUrl = (logoData as { logo_url: string | null } | null)?.logo_url ?? null

  return (
    <div>

      <Link
        href="/girls/districts"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 transition-colors px-4 pt-6 block"
      >
        ← District Index
      </Link>

      {/* ── Mobile: logo banner + info bar ── */}
      <div className="md:hidden sticky top-0 z-20">
        {logoUrl ? (
          <Image src={logoUrl} alt={`District ${d}`} width={1022} height={518} className="w-full h-auto" />
        ) : (
          <div className="w-full aspect-video flex items-center justify-center text-6xl font-bold bg-rose-900 text-white">{d}</div>
        )}
        <div className="bg-white border-b border-black shadow-none px-4 py-3" style={{ borderTop: '3px solid #881337' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate">District {d}</h1>
              <div className="flex items-center gap-1 text-xs text-slate-500 truncate">
                <span>NJSIAA</span>
                <InlineSeasonPicker activeSeason={season} seasons={[2]} />
                <span>· Girls Postseason</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Desktop: sticky header with logo left + info right ── */}
      <div className="hidden md:block sticky top-0 z-20 bg-white border border-black rounded-none shadow-none mb-8" style={{ borderTop: '3px solid #881337' }}>
        <div className="flex items-center gap-5 p-4">
          <div className="shrink-0">
            {logoUrl ? (
              <Image src={logoUrl} alt={`District ${d}`} width={1022} height={518} className="w-[240px] h-auto rounded-none" />
            ) : (
              <div className="w-[160px] h-[96px] rounded-none flex items-center justify-center text-4xl font-bold bg-rose-900 text-white">{d}</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 truncate">District {d}</h1>
            <p className="text-sm text-slate-500 mt-0.5">NJSIAA · Girls Postseason</p>
            <div className="flex items-center text-xs text-slate-400 mt-1">
              <InlineSeasonPicker activeSeason={season} seasons={[2]} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">

      {/* ── Bracket grid ── */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-8">
        {WEIGHTS.map(w => (
          <Link
            key={w}
            href={`/girls/districts/${d}/${w}`}
            className="flex flex-col items-center justify-center py-4 rounded-none border border-black bg-white hover:bg-rose-50 hover:border-rose-400 transition-colors shadow-none"
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
          <TeamScoreCard rows={teamScore} gender="girls" />

          <IndividualTeamPoints rows={teamPts} />
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
                      const isSQ = stateQualIds.has(p.wrestler_id)
                      const seed = seedMap.get(p.wrestler_id)
                      const showUpset = seed != null && seed > 4
                      const statePlace = statePlaceMap.get(p.wrestler_id)
                      return (
                        <td key={place} className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
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
                            {isSQ && !statePlace && (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 rounded shrink-0">
                                SQ
                              </span>
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
                key={s.school}
                href={`/schools/${s.school_id}?gender=girls`}
                className="px-3 py-1.5 text-sm font-medium bg-white border border-rose-200 rounded-full hover:border-rose-400 hover:bg-rose-50 transition-colors shadow-none"
              >
                {s.school_name || s.school}
              </Link>
            ) : (
              <span key={s.school} className="px-3 py-1.5 text-sm font-medium bg-white border border-rose-200 rounded-full text-slate-500">
                {s.school_name || s.school}
              </span>
            ))}
          </div>
        </section>
      )}

      </div>
    </div>
  )
}
