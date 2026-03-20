import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getActiveSeason } from '@/lib/get-season'
import { SEASONS } from '@/lib/seasons'
import { BracketPoll, type BracketEntry } from '@/components/BracketPoll'
import { PageHeader } from '@/components/PageHeader'
import { orderChampMatchesBySeed } from '@/lib/bracketOrder'

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
  winner_seed: number | null
  winner_grade: string | null
  winner_bracket_position: number | null
  loser_entry_id: string | null
  loser_wrestler_id: string | null
  loser_name: string | null
  loser_school: string | null
  loser_school_name: string | null
  loser_seed: number | null
  loser_grade: string | null
  loser_bracket_position: number | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CARD_H = 80

const ROUND_LABEL: Record<string, string> = {
  R1:          'Round 1',
  QF:          'Quarters',
  SF:          'Semis',
  F:           'Finals',
  C1:          'Cons. R1',
  C2:          'Cons. R2',
  C3:          'Cons. Qtrs',
  C4:          'Cons. Semis',
  '3rd_Place': '3rd Place',
  '5th_Place': '5th Place',
  '7th_Place': '7th Place',
}

const CHAMP_COLS  = ['R1', 'QF', 'SF', 'F'] as const
const CONSOL_COLS = ['C1', 'C2', 'C3', 'C4', '3rd_Place', '5th_Place', '7th_Place'] as const

// DFS traversal (girls goes R1 → QF directly, no R2)
const PREV_ROUND: Record<string, string> = { QF: 'R1', SF: 'QF', F: 'SF' }

// ── State Qualifiers ─────────────────────────────────────────────────────────

function StateQualifiers({ entries }: { entries: (BracketEntry & { tournament_id: number; weight_class_id: number })[] }) {
  if (entries.length === 0) return null
  const groups = [
    { key: 'champ', seeds: [1, 4], label: 'Region Champions' },
    { key: 'runner', seeds: [5, 8], label: 'Runners-Up' },
    { key: 'third', seeds: [9, 12], label: '3rd Place' },
    { key: 'fourth', seeds: [13, 16], label: '4th Place' },
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
            <div key={g.key} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{g.label}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {groupEntries.map(e => {
                  const regionNum = e.seed != null ? ((e.seed - 1) % 4) + 1 : null
                  return (
                    <div key={e.entry_id} className="flex items-center gap-2 px-3 py-1.5">
                      <Link
                        href={`/wrestler/${e.wrestler_id}`}
                        className="text-[13px] font-medium text-slate-800 hover:underline truncate flex-1"
                      >
                        {e.wrestler_name}
                      </Link>
                      <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{e.school_name || e.school}</span>
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatResult(m: MatchRow): string {
  if (!m.win_type) return ''
  if (m.win_type === 'FALL') {
    if (m.fall_time_seconds) {
      const mn = Math.floor(m.fall_time_seconds / 60)
      const sc = String(m.fall_time_seconds % 60).padStart(2, '0')
      return `Fall ${mn}:${sc}`
    }
    return 'Fall'
  }
  if (m.win_type === 'TF' || m.win_type === 'TF-1.5') {
    const score = (m.winner_score != null && m.loser_score != null)
      ? ` ${m.winner_score}-${m.loser_score}` : ''
    const time = m.fall_time_seconds
      ? ` ${Math.floor(m.fall_time_seconds / 60)}:${String(m.fall_time_seconds % 60).padStart(2, '0')}`
      : ''
    return `${m.win_type}${score}${time}`
  }
  if (m.win_type === 'MD' || m.win_type === 'DEC') {
    const label = m.win_type === 'MD' ? 'MD' : 'Dec'
    return (m.winner_score != null && m.loser_score != null)
      ? `${label} ${m.winner_score}-${m.loser_score}`
      : label
  }
  return m.win_type
}

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

const ROW_H  = 32
const DIV_H  = 1
const RES_H  = CARD_H - ROW_H * 2 - DIV_H * 2

function WrestlerRow({
  wrestlerId,
  name,
  school,
  seed,
  isWinner,
}: {
  wrestlerId: string | null
  name: string | null
  school: string | null
  seed: number | null
  isWinner: boolean
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 ${isWinner ? 'bg-emerald-50' : ''}`}
      style={{ height: ROW_H }}
    >
      {seed != null ? (
        <span className="text-[10px] text-slate-400 w-3.5 shrink-0 text-right">{seed}</span>
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <span className="flex-1 min-w-0 truncate">
        {!name ? (
          <span className="text-xs text-slate-400 italic">Bye</span>
        ) : wrestlerId ? (
          <Link
            href={`/wrestler/${wrestlerId}`}
            className={`text-[13px] truncate hover:underline ${
              isWinner ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'
            }`}
          >
            {name}
          </Link>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </span>
      {name && (
        <span className="text-[10px] text-slate-400 shrink-0 max-w-[48px] truncate">
          {school ?? ''}
        </span>
      )}
    </div>
  )
}

function MatchCard({ m }: { m: MatchRow }) {
  const result = formatResult(m)
  return (
    <div
      className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm w-60 shrink-0"
      style={{ height: CARD_H }}
    >
      <WrestlerRow
        wrestlerId={m.winner_wrestler_id}
        name={m.winner_name}
        school={m.winner_school}
        seed={m.winner_seed}
        isWinner
      />
      <div className="border-t border-slate-100" style={{ height: DIV_H }} />
      <WrestlerRow
        wrestlerId={m.loser_wrestler_id}
        name={m.loser_name}
        school={m.loser_school}
        seed={m.loser_seed}
        isWinner={false}
      />
      <div
        className="flex items-center justify-end px-2 border-t border-slate-100"
        style={{ height: RES_H }}
      >
        <span className="text-[10px] text-slate-400 tabular-nums">{result}</span>
      </div>
    </div>
  )
}

// ── Podium ──────────────────────────────────────────────────────────────────

type PlaceWinner = {
  place: number
  name: string | null
  school: string | null
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
        school: m.winner_school_name || m.winner_school,
        wrestlerId: m.winner_wrestler_id,
      })
      placements.push({
        place: losePlace, name: m.loser_name,
        school: m.loser_school_name || m.loser_school,
        wrestlerId: m.loser_wrestler_id,
      })
    }
  }
  return placements.sort((a, b) => a.place - b.place)
}

const PLACE_SUFFIX: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }

function Podium({ matches }: { matches: MatchRow[] }) {
  const placements = derivePlacements(matches)
  if (placements.length === 0) return null

  return (
    <div className="mt-10 mb-8 max-w-sm mx-auto">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Placewinners</h2>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {placements.map(p => (
          <div key={p.place} className={`flex items-center gap-2.5 px-3 py-2 ${p.place === 1 ? 'bg-amber-50' : ''}`}>
            <span className={`text-xs font-bold w-6 text-right shrink-0 ${
              p.place === 1 ? 'text-amber-600' : p.place === 2 ? 'text-slate-500' : p.place === 3 ? 'text-orange-500' : 'text-slate-400'
            }`}>
              {p.place}{PLACE_SUFFIX[p.place] ?? 'th'}
            </span>
            <span className="flex-1 min-w-0 truncate">
              {p.wrestlerId ? (
                <Link href={`/wrestler/${p.wrestlerId}`} className={`text-sm hover:underline truncate ${p.place === 1 ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                  {p.name}
                </Link>
              ) : (
                <span className="text-sm font-medium text-slate-700">{p.name}</span>
              )}
            </span>
            <span className="text-[11px] text-slate-400 shrink-0">{p.school ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bracket section ────────────────────────────────────────────────────────────

function BracketSection({
  cols,
  matchesByRound,
  baseMatchCount,
}: {
  cols: readonly string[]
  matchesByRound: Map<string, MatchRow[]>
  baseMatchCount: number
}) {
  const totalH = baseMatchCount * CARD_H

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0 items-start min-w-max">
        {cols.map(round => {
          const colMatches = matchesByRound.get(round) ?? []
          if (colMatches.length === 0) return null
          const slotH = totalH / colMatches.length

          return (
            <div key={round} className="flex flex-col shrink-0">
              <div className="h-8 flex items-center justify-center px-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  {ROUND_LABEL[round] ?? round}
                </span>
              </div>
              {colMatches.map(m => (
                <div
                  key={m.match_id}
                  className="flex items-center justify-center px-1.5"
                  style={{ height: slotH }}
                >
                  <MatchCard m={m} />
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Roster builder ───────────────────────────────────────────────────────────

type RosterItem = {
  wrestler_id: string
  name: string
  school: string | null
  school_name: string | null
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
        school: m.winner_school, school_name: m.winner_school_name,
        seed: m.winner_seed, grade: m.winner_grade,
      })
    }
    if (m.loser_wrestler_id && !seen.has(m.loser_wrestler_id)) {
      seen.add(m.loser_wrestler_id)
      roster.push({
        wrestler_id: m.loser_wrestler_id, name: m.loser_name ?? '—',
        school: m.loser_school, school_name: m.loser_school_name,
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

function RosterTable({ roster }: { roster: RosterItem[] }) {
  if (roster.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Entries ({roster.length})
      </h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
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
                  <Link href={`/wrestler/${r.wrestler_id}`} className="font-medium text-slate-700 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-slate-500 text-xs">{r.school_name || r.school || '—'}</td>
                <td className="px-3 py-1.5 text-slate-400 text-xs">{r.grade ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235] as const

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
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              w === current
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm'
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

export default async function GirlsStateBracketPage({
  params,
}: {
  params: Promise<{ weight: string }>
}) {
  const { weight: rawW } = await params
  const weight = Number(rawW)
  if (!weight) notFound()

  const season = await getActiveSeason()

  const [{ data }, { data: entryData }] = await Promise.all([
    supabase.rpc('state_bracket', {
      p_weight: weight,
      p_gender: 'F',
      p_season: season,
    }),
    supabase.rpc('state_bracket_entries_v2', {
      p_weight: weight,
      p_gender: 'F',
      p_season: season,
    }),
  ])

  const matches = (data ?? []) as MatchRow[]
  const entries = (entryData ?? []) as (BracketEntry & { tournament_id: number; weight_class_id: number })[]
  if (matches.length === 0 && entries.length === 0) notFound()

  const champ  = matches.filter(m => m.bracket_side === 'championship')
  const consol = matches.filter(m => m.bracket_side === 'consolation')

  // Championship — DFS ordered
  const champOrdered = orderChampMatchesBySeed(champ, 16)
  const champCols    = CHAMP_COLS.filter(r => (champOrdered.get(r) ?? []).length > 0)

  // Consolation — grouped by round, sorted by bout_number within each round
  const consolByRound = new Map<string, MatchRow[]>()
  for (const m of consol) {
    const list = consolByRound.get(m.round) ?? []
    list.push(m)
    consolByRound.set(m.round, list)
  }
  for (const [, ms] of consolByRound) {
    ms.sort((a, b) => (a.bout_number ?? 9999) - (b.bout_number ?? 9999))
  }
  const consolCols = CONSOL_COLS.filter(r => (consolByRound.get(r) ?? []).length > 0)

  // Base counts for slot-height calculation
  const r1Count = (champOrdered.get('R1') ?? []).length || 1
  const c1Count = (consolByRound.get('C1') ?? []).length || 1

  return (
    <div className="max-w-fit mx-auto px-4 py-8">
      <Link
        href="/girls/state"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← State Championships
      </Link>

      <div className="mb-8 text-center">
        <PageHeader title={`Girls State · ${weight} lb`} goldTrim />
        <p className="text-slate-500 text-sm mt-1">NJSIAA {SEASONS[season]?.label ?? season} · 16-man double elimination</p>
      </div>

      <WeightNav weights={WEIGHTS} current={weight} base="/girls/state" />

      {matches.length === 0 ? null : (<>

      {/* ── PODIUM ── */}
      <Podium matches={matches} />

      {/* ── DESKTOP bracket (lg+) ── */}
      <div className="overflow-x-auto space-y-0" style={{ WebkitOverflowScrolling: 'touch' }}>

        {/* Championship section */}
        <div>
          <div className="flex items-center gap-3 mb-1 pl-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Championship</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <BracketSection
            cols={champCols}
            matchesByRound={champOrdered}
            baseMatchCount={r1Count}
          />
        </div>

        {/* Consolation section */}
        <div>
          <div className="flex items-center gap-3 mb-1 pl-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Consolation</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <BracketSection
            cols={consolCols}
            matchesByRound={consolByRound}
            baseMatchCount={c1Count}
          />
        </div>

      </div>
      </>)}

      {entries.length > 0 && (
        <BracketPoll
          entries={entries}
          tournamentId={entries[0]?.tournament_id ?? 0}
          weightClassId={entries[0]?.weight_class_id ?? 0}
          hasMatches={matches.length > 0}
          bracketSize={16}
          provenancePrefix="R"
        />
      )}

      {entries.length > 0 && <StateQualifiers entries={entries} />}

      <WeightNav weights={WEIGHTS} current={weight} base="/girls/state" />
    </div>
  )
}
