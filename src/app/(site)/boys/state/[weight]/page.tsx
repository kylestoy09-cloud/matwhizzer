import { WeightHistoryView } from '@/components/site/TournamentHistory'
import { supabase } from '@/lib/supabase/public-cached'
import { IconHint } from '@/components/site/IconHint'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPostseasonSeason } from '@/lib/get-season'
import { seasonWeights } from '@/lib/postseasonSeason'
import { getSeasonLabel } from '@/lib/seasons-server'
import { BracketPoll, type BracketEntry } from '@/components/BracketPoll'
import { StdHeader } from '@/components/site/StdPage'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PostseasonBracket } from '@/components/bracket/PostseasonBracket'
import { getSiteLook } from '@/lib/siteLookServer'
import { getSchoolLogos } from '@/lib/school-logos'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'

type LogoMap = Awaited<ReturnType<typeof getSchoolLogos>>

// ── Types ─────────────────────────────────────────────────────────────────────

type MatchRow = {
  match_id: string
  round: string
  bracket_side: string
  win_type: string | null
  winner_score: number | null
  loser_score: number | null
  fall_time_seconds: number | null
  bout_number: number | null
  winner_entry_id: string | null
  winner_wrestler_id: string | null
  winner_name: string | null
  winner_school: string | null
  winner_school_name: string | null
  winner_school_id?: number | null
  winner_seed: number | null
  winner_grade: string | null
  winner_bracket_position: number | null
  loser_entry_id: string | null
  loser_wrestler_id: string | null
  loser_name: string | null
  loser_school: string | null
  loser_school_name: string | null
  loser_school_id?: number | null
  loser_seed: number | null
  loser_grade: string | null
  loser_bracket_position: number | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

// DFS tree traversal for championship ordering
const PREV_ROUND: Record<string, string> = { R2: 'R1', QF: 'R2', SF: 'QF', F: 'SF' }

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── DFS ordering for championship ────────────────────────────────────────────

function orderChampMatches(allChamp: MatchRow[]): Map<string, MatchRow[]> {
  const byRound = new Map<string, MatchRow[]>()
  for (const m of allChamp) {
    const list = byRound.get(m.round) ?? []
    list.push(m)
    byRound.set(m.round, list)
  }

  const byWinnerRound = new Map<string, MatchRow>()
  for (const [, ms] of byRound) {
    for (const m of ms) {
      if (m.winner_entry_id) {
        byWinnerRound.set(`${m.winner_entry_id}:${m.round}`, m)
      }
    }
  }

  const fMatches = byRound.get('F') ?? []
  if (fMatches.length !== 1) return byRound

  const ordered = new Map<string, MatchRow[]>()

  function collect(m: MatchRow) {
    const prev = PREV_ROUND[m.round]
    if (prev) {
      if (m.winner_entry_id) {
        const top = byWinnerRound.get(`${m.winner_entry_id}:${prev}`)
        if (top) collect(top)
      }
      if (m.loser_entry_id) {
        const bot = byWinnerRound.get(`${m.loser_entry_id}:${prev}`)
        if (bot) collect(bot)
      }
    }
    const list = ordered.get(m.round) ?? []
    if (!list.some(x => x.match_id === m.match_id)) {
      list.push(m)
      ordered.set(m.round, list)
    }
  }

  collect(fMatches[0])

  for (const [round, ms] of byRound) {
    if (!ordered.has(round)) ordered.set(round, ms)
  }

  return ordered
}

// ── Match Card ────────────────────────────────────────────────────────────────

// ── Podium ──────────────────────────────────────────────────────────────────

type PlaceWinner = {
  place: number
  name: string | null
  school: string | null
  school_id?: number | null
  wrestlerId: string | null
}

function derivePlacements(matches: MatchRow[]): PlaceWinner[] {
  const placements: PlaceWinner[] = []
  const roundToPlaces: [string, string, number, number][] = [
    ['F', 'championship', 1, 2],
    ['3rd_Place', 'consolation', 3, 4],
    ['5th_Place', 'consolation', 5, 6],
    ['7th_Place', 'consolation', 7, 8],
  ]
  for (const [round, side, winPlace, losePlace] of roundToPlaces) {
    const m = matches.find(m => m.round === round && m.bracket_side === side)
    if (m) {
      placements.push({
        place: winPlace, name: m.winner_name,
        school: m.winner_school_name, school_id: m.winner_school_id,
        wrestlerId: m.winner_wrestler_id,
      })
      placements.push({
        place: losePlace, name: m.loser_name,
        school: m.loser_school_name, school_id: m.loser_school_id,
        wrestlerId: m.loser_wrestler_id,
      })
    }
  }
  return placements.sort((a, b) => a.place - b.place)
}

const PLACE_SUFFIX: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }

function Podium({ matches, ghostIds, seedMap, logos }: { matches: MatchRow[]; ghostIds: Set<string>; seedMap: Map<string, number>; logos: LogoMap }) {
  const placements = derivePlacements(matches)
  if (placements.length === 0) return null

  return (
    <div className="mt-10 mb-8 max-w-sm mx-auto">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Placewinners</h2>
      <div className="bg-white rounded-none border border-black shadow-none overflow-hidden divide-y divide-slate-100">
        {placements.map(p => {
          const seed = p.wrestlerId ? seedMap.get(p.wrestlerId) : undefined
          const outperform = seed != null ? seed - p.place : 0
          return (
            <div key={p.place} className={`flex items-center gap-2.5 px-3 py-2 ${p.place === 1 ? 'bg-amber-50' : ''}`}>
              <span className={`text-xs font-bold w-6 text-right shrink-0 ${
                p.place === 1 ? 'text-amber-600' : p.place === 2 ? 'text-slate-500' : p.place === 3 ? 'text-orange-500' : 'text-slate-400'
              }`}>
                {p.place}{PLACE_SUFFIX[p.place] ?? 'th'}
              </span>
              <SchoolLogoBadge {...logos.badgeById(p.school_id)} />
              <span className="flex-1 min-w-0 flex items-center gap-1">
                {p.wrestlerId ? (
                  <Link href={`/boys/wrestler/${p.wrestlerId}`} className={`text-sm hover:underline truncate ${p.place === 1 ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                    {p.name}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-slate-700">{p.name}</span>
                )}
                {p.place === 1 && <IconHint hint="State champion">👑</IconHint>}
                {p.wrestlerId && ghostIds.has(p.wrestlerId) && <IconHint hint={seed ? `Ghost champion: won the state title as the #${seed} seed (seeded 5th or lower)` : 'Ghost champion: won the state title seeded 5th or lower'}>👻</IconHint>}
                {outperform > 5 && (
                  <IconHint hint={`Seeded #${seed}, finished ${p.place}${p.place === 1 ? 'st' : p.place === 2 ? 'nd' : p.place === 3 ? 'rd' : 'th'}: ${outperform} spot${outperform === 1 ? '' : 's'} better than seeded`} className="text-[10px] font-bold text-emerald-600">↑{outperform}</IconHint>
                )}
              </span>
              <span className="text-[11px] text-slate-400 shrink-0">{p.school_id != null ? p.school : 'TBD'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Bracket section (one horizontal scroll area) ──────────────────────────────

// ── Roster builder ───────────────────────────────────────────────────────────

type RosterItem = {
  wrestler_id: string
  name: string
  school: string | null
  school_name: string | null
  school_id?: number | null
  seed: number | null
  grade: string | null
}

function buildRosterFromMatches(matches: MatchRow[]): RosterItem[] {
  const seen = new Set<string>()
  const roster: RosterItem[] = []
  for (const m of matches) {
    if (m.winner_wrestler_id && !seen.has(m.winner_wrestler_id)) {
      seen.add(m.winner_wrestler_id)
      roster.push({
        wrestler_id: m.winner_wrestler_id, name: m.winner_name ?? '—',
        school: m.winner_school, school_name: m.winner_school_name, school_id: m.winner_school_id,
        seed: m.winner_seed, grade: m.winner_grade,
      })
    }
    if (m.loser_wrestler_id && !seen.has(m.loser_wrestler_id)) {
      seen.add(m.loser_wrestler_id)
      roster.push({
        wrestler_id: m.loser_wrestler_id, name: m.loser_name ?? '—',
        school: m.loser_school, school_name: m.loser_school_name, school_id: m.loser_school_id,
        seed: m.loser_seed, grade: m.loser_grade,
      })
    }
  }
  roster.sort((a, b) => {
    if (a.seed != null && b.seed != null) return a.seed - b.seed
    if (a.seed != null) return -1
    if (b.seed != null) return 1
    return a.name.localeCompare(b.name)
  })
  return roster
}

function RosterTable({ roster, logos }: { roster: RosterItem[]; logos: LogoMap }) {
  if (roster.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Entries ({roster.length})
      </h2>
      <div className="overflow-x-auto rounded-none border border-black shadow-none">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase w-10">Seed</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">School</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase w-12">Gr</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((r, i) => (
              <tr key={r.wrestler_id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                <td className="px-3 py-1.5 text-slate-400 text-xs tabular-nums">{r.seed ?? ''}</td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <SchoolLogoBadge {...logos.badgeById(r.school_id)} />
                    <Link href={`/boys/wrestler/${r.wrestler_id}`} className="font-medium text-slate-700 hover:underline">
                      {r.name}
                    </Link>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-slate-500 text-xs">{r.school_id != null ? r.school_name : 'TBD'}</td>
                <td className="px-3 py-1.5 text-slate-400 text-xs">{r.grade ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const WEIGHTS = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285] as const

const PLACE_GROUP_LABEL: Record<string, string> = {
  champ: 'Region Champions',
  runner: 'Runners-Up',
  third: '3rd Place',
  fourth: '4th Place',
}

function StateQualifiers({ entries, logos }: { entries: (BracketEntry & { tournament_id: number; weight_class_id: number })[]; logos: LogoMap }) {
  if (entries.length === 0) return null
  const groups = [
    { key: 'champ', seeds: [1, 8], label: 'Region Champions' },
    { key: 'runner', seeds: [9, 16], label: 'Runners-Up' },
    { key: 'third', seeds: [17, 24], label: '3rd Place' },
    { key: 'fourth', seeds: [25, 32], label: '4th Place' },
  ]
  return (
    <section className="mt-8 mb-4">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        State Qualifiers ({entries.length})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {groups.map(g => {
          const groupEntries = entries.filter(e => e.seed != null && e.seed >= g.seeds[0] && e.seed <= g.seeds[1])
            .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
          if (groupEntries.length === 0) return null
          return (
            <div key={g.key} className="bg-white border border-black rounded-none overflow-hidden shadow-none">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{g.label}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {groupEntries.map(e => {
                  const regionNum = e.seed != null ? ((e.seed - 1) % 8) + 1 : null
                  return (
                    <div key={e.entry_id} className="flex items-center gap-2 px-3 py-1.5">
                      <SchoolLogoBadge {...logos.badgeById(e.school_id)} />
                      <Link
                        href={`/boys/wrestler/${e.wrestler_id}`}
                        className="text-[13px] font-medium text-slate-800 hover:underline truncate flex-1"
                      >
                        {e.wrestler_name}
                      </Link>
                      <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{e.school_id != null ? e.school_name : 'TBD'}</span>
                      {regionNum && (
                        <span className="text-[10px] px-1 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                          R{regionNum}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function WeightNav({ weights, current, base }: {
  weights: readonly number[]
  current: number
  base: string
}) {
  return (
    <div className="mt-10 pt-6 border-t border-slate-100">
      <div className="flex flex-wrap gap-1.5">
        {weights.map(w => (
          <Link
            key={w}
            href={`${base}/${w}`}
            className={`px-3 py-1.5 rounded-none text-sm font-semibold transition-colors ${
              w === current
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-black text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-none'
            }`}
          >
            {w}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function StateBracketPage({
  params,
}: {
  params: Promise<{ weight: string }>
}) {
  const { weight: rawW } = await params
  const weight = Number(rawW)
  if (!weight) notFound()

  const { season, options: seasonOptions } = await getPostseasonSeason('M')

  const weights = await seasonWeights('M', season, WEIGHTS)   // the season's own classes (Playoff History)
  const seasonLbl = await getSeasonLabel(season)

  const [{ data }, { data: entryData }, { data: ghostData }, logos] = await Promise.all([
    supabase.rpc('state_bracket', {
      p_weight: weight,
      p_gender: 'M',
      p_season: season,
    }),
    supabase.rpc('state_bracket_entries_v2', {
      p_weight: weight,
      p_gender: 'M',
      p_season: season,
    }),
    supabase.rpc('ghost_champions', { p_season: season }),
    getSchoolLogos(),
  ])
  const look = (await getSiteLook()).bracket

  const matches = (data ?? []) as MatchRow[]
  const entries = ((entryData ?? []) as (BracketEntry & { tournament_id: number; weight_class_id: number })[])
    .map(e => ({ ...e, badge: logos.badgeById(e.school_id) }))
  if (matches.length === 0 && entries.length === 0) notFound()

  const ghostIds = new Set(
    ((ghostData ?? []) as { wrestler_id: string; gender: string; tournament_type: string }[])
      .filter(g => g.gender === 'M' && g.tournament_type === 'boys_state')
      .map(g => g.wrestler_id)
  )
  // Build seed map from match data
  const seedMap = new Map<string, number>()
  for (const m of matches) {
    if (m.winner_wrestler_id && m.winner_seed) seedMap.set(m.winner_wrestler_id, m.winner_seed)
    if (m.loser_wrestler_id && m.loser_seed) seedMap.set(m.loser_wrestler_id, m.loser_seed)
  }

  return (
    <div className="max-w-fit mx-auto px-4 py-8">
      <Link
        href="/boys/state"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← State Championships
      </Link>

      <StdHeader title={`Boys State · ${weight} lb`} summaryKey="state" hideSummary noLogo
        picker={<><InlineSeasonPicker arrows gender="M" activeSeason={season} options={seasonOptions} /><span>· 32-man double elimination</span></>} />

      <WeightNav weights={weights} current={weight} base="/boys/state" />

      {matches.length === 0 ? null : (<>

      {/* ── PODIUM ── */}
      <Podium matches={matches} ghostIds={ghostIds} seedMap={seedMap} logos={logos} />

      <PostseasonBracket matches={matches} size={32} look={look} />
      </>)}

      {entries.length > 0 && (
        <BracketPoll
          entries={entries}
          tournamentId={entries[0]?.tournament_id ?? 0}
          weightClassId={entries[0]?.weight_class_id ?? 0}
          hasMatches={matches.length > 0}
          bracketSize={32}
          provenancePrefix="R"
        />
      )}

      {entries.length > 0 && <StateQualifiers entries={entries} logos={logos} />}

      <WeightNav weights={weights} current={weight} base="/boys/state" />

      <WeightHistoryView gender="M" level="state" num={null} seasons={seasonOptions.map(o => o.id)} weight={weight} />
    </div>
  )
}
