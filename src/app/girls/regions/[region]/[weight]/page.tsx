import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getActiveSeason } from '@/lib/get-season'
import { BracketPoll, type BracketEntry, type DistrictChamp } from '@/components/BracketPoll'

// ── Types ─────────────────────────────────────────────────────────────────────

type MatchRow = {
  match_id: string
  round: string
  bracket_side: string
  win_type: string | null
  winner_score: number | null
  loser_score: number | null
  fall_time_seconds: number | null
  winner_entry_id: string | null
  winner_wrestler_id: string | null
  winner_name: string | null
  winner_school: string | null
  winner_school_name: string | null
  winner_seed: number | null
  winner_grade: string | null
  loser_entry_id: string | null
  loser_wrestler_id: string | null
  loser_name: string | null
  loser_school: string | null
  loser_school_name: string | null
  loser_seed: number | null
  loser_grade: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_REGIONS = new Set(['1', '2', '3', '4'])

const CARD_H = 88

const ROUND_LABEL: Record<string, string> = {
  R1:          'Round 1',
  R2:          'Prelims',
  QF:          'Quarters',
  SF:          'Semis',
  F:           'Finals',
  C1:          'Cons. R1',
  C2:          'Cons. R2',
  C3:          'Cons. Qtrs',
  C4:          'Cons. Semis',
  '3rd_Place': '3rd Place',
  '5th_Place': '5th Place',
}

// Girls regions are 32-man: R1→R2→QF→SF→F
const CHAMP_COLS  = ['R1', 'R2', 'QF', 'SF', 'F'] as const
const CONSOL_COLS = ['C1', 'C2', 'C3', 'C4', '3rd_Place', '5th_Place'] as const

// DFS traversal
const PREV_ROUND: Record<string, string> = { R2: 'R1', QF: 'R2', SF: 'QF', F: 'SF' }

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
  const isBye = !name

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 ${isWinner ? 'bg-emerald-50' : ''}`}
      style={{ height: 36 }}
    >
      {seed != null ? (
        <span className="text-[10px] text-slate-400 w-3.5 shrink-0 text-right">{seed}</span>
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <span className="flex-1 min-w-0 truncate">
        {isBye ? (
          <span className="text-xs text-slate-400 italic">Bye</span>
        ) : wrestlerId ? (
          <Link
            href={`/wrestler/${wrestlerId}`}
            className={`text-sm truncate hover:underline ${
              isWinner ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'
            }`}
          >
            {name}
          </Link>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </span>
      {!isBye && (
        <span className="text-[10px] text-slate-400 shrink-0 max-w-[52px] truncate">
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
      className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm w-56 shrink-0"
      style={{ height: CARD_H }}
    >
      <WrestlerRow
        wrestlerId={m.winner_wrestler_id}
        name={m.winner_name}
        school={m.winner_school}
        seed={m.winner_seed}
        isWinner
      />
      <div className="border-t border-slate-100" />
      <WrestlerRow
        wrestlerId={m.loser_wrestler_id}
        name={m.loser_name}
        school={m.loser_school}
        seed={m.loser_seed}
        isWinner={false}
      />
      <div
        className="flex items-center justify-end px-2.5 border-t border-slate-100"
        style={{ height: CARD_H - 73 }}
      >
        <span className="text-[10px] text-slate-400 tabular-nums">{result}</span>
      </div>
    </div>
  )
}

// ── Mobile round list ─────────────────────────────────────────────────────────

function MobileRound({ label, matches }: { label: string; matches: MatchRow[] }) {
  return (
    <section>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</h3>
      <div className="space-y-2">
        {matches.map(m => (
          <MatchCard key={m.match_id} m={m} />
        ))}
      </div>
    </section>
  )
}

// ── Entry Card (pre-tournament) ──────────────────────────────────────────────

type EntryRow = {
  entry_id: string
  wrestler_id: string
  wrestler_name: string
  school: string
  school_name: string
  seed: number | null
  grade: string | null
  wins: number | null
  losses: number | null
}

function EntryWrestlerRow({ entry }: { entry: EntryRow }) {
  const record = (entry.wins != null && entry.losses != null)
    ? `${entry.wins}-${entry.losses}` : null

  return (
    <div className="flex items-center gap-1.5 px-2.5" style={{ height: 44 }}>
      {entry.seed != null ? (
        <span className="text-[10px] text-slate-400 w-3.5 shrink-0 text-right">{entry.seed}</span>
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <Link
          href={`/wrestler/${entry.wrestler_id}`}
          className="text-sm font-medium text-slate-700 hover:underline block truncate"
        >
          {entry.wrestler_name}
        </Link>
        <div className="flex items-center gap-1.5 mt-0.5">
          {entry.grade && <span className="text-[10px] text-slate-400">{entry.grade}</span>}
          {record && <span className="text-[10px] text-slate-400 tabular-nums">{record}</span>}
        </div>
      </div>
      <span className="text-[10px] text-slate-400 shrink-0 max-w-[52px] truncate">
        {entry.school}
      </span>
    </div>
  )
}

function EntryCard({ top, bot }: { top: EntryRow; bot: EntryRow | null }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm w-56 shrink-0">
      <EntryWrestlerRow entry={top} />
      <div className="border-t border-slate-100" />
      {bot ? (
        <EntryWrestlerRow entry={bot} />
      ) : (
        <div className="flex items-center px-2.5 text-xs text-slate-400 italic" style={{ height: 44 }}>
          Bye
        </div>
      )}
    </div>
  )
}

function EntriesView({ entries }: { entries: EntryRow[] }) {
  const n = entries.length
  const pairs: [EntryRow, EntryRow | null][] = []
  for (let i = 0; i < Math.ceil(n / 2); i++) {
    pairs.push([entries[i], n - 1 - i > i ? entries[n - 1 - i] : null])
  }

  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">Entries · Results not yet available</p>
      <div className="flex flex-col gap-3">
        {pairs.map(([top, bot]) => (
          <EntryCard key={top.entry_id} top={top} bot={bot} />
        ))}
      </div>
    </div>
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

export default async function GirlsRegionBracketPage({
  params,
}: {
  params: Promise<{ region: string; weight: string }>
}) {
  const { region, weight: rawW } = await params
  const weight = Number(rawW)

  if (!VALID_REGIONS.has(region) || !weight) notFound()

  const season = await getActiveSeason()

  const [{ data: matchData }, { data: entryData }, { data: champData }] = await Promise.all([
    supabase.rpc('girls_region_bracket', {
      p_region: region,
      p_weight: weight,
      p_season: season,
    }),
    supabase.rpc('girls_region_bracket_entries_v2', {
      p_region: region,
      p_weight: weight,
      p_season: season,
    }),
    supabase.rpc('girls_region_district_champs', {
      p_region: region,
      p_weight: weight,
      p_season: season,
    }),
  ])

  const matches = (matchData ?? []) as MatchRow[]
  const entries = (entryData ?? []) as (BracketEntry & { tournament_id: number; weight_class_id: number })[]
  const districtChamps = (champData ?? []) as DistrictChamp[]
  if (matches.length === 0 && entries.length === 0) notFound()

  // Split sides
  const champ  = matches.filter(m => m.bracket_side === 'championship')
  const consol = matches.filter(m => m.bracket_side === 'consolation')

  // Order championship by DFS tree traversal
  const champOrdered = orderChampMatches(champ)

  // Active championship columns
  const champCols = CHAMP_COLS.filter(r => (champOrdered.get(r) ?? []).length > 0)

  // Consolation: group by round
  const consolByRound = new Map<string, MatchRow[]>()
  for (const m of consol) {
    const list = consolByRound.get(m.round) ?? []
    list.push(m)
    consolByRound.set(m.round, list)
  }
  const consolCols = CONSOL_COLS.filter(r => (consolByRound.get(r) ?? []).length > 0)

  // Base height from widest round
  const r1Count   = (champOrdered.get('R1') ?? []).length
  const r2Count   = (champOrdered.get('R2') ?? []).length
  const baseCount = r1Count || r2Count || 1
  const totalH    = baseCount * CARD_H

  // All rounds for mobile
  const allRounds = [...champCols, ...consolCols]

  return (
    <div className="max-w-fit mx-auto px-4 py-8">
      <Link
        href={`/girls/regions/${region}`}
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Region {region}
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-rose-900">
          Region {region}
          <span className="text-slate-400 font-normal ml-2">·</span>
          <span className="text-slate-600 font-semibold ml-2">{weight} lb</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">NJSIAA {season === 1 ? '2024–25' : '2025–26'} · Girls postseason</p>
      </div>

      <WeightNav weights={WEIGHTS} current={weight} base={`/girls/regions/${region}`} />

      {matches.length === 0 ? (
        <BracketPoll
          entries={entries}
          tournamentId={entries[0]?.tournament_id ?? 0}
          weightClassId={entries[0]?.weight_class_id ?? 0}
          hasMatches={false}
          bracketSize={16}
          provenancePrefix="D"
          districtChamps={districtChamps}
        />
      ) : (<>

      {/* ── DESKTOP bracket (md+) ── */}
      <div className="hidden md:block overflow-x-auto">
        <div className="flex gap-0 items-start min-w-max">

          {/* Championship columns */}
          {champCols.map(round => {
            const colMatches = champOrdered.get(round) ?? []
            const slotH = totalH / colMatches.length

            return (
              <div key={round} className="flex flex-col shrink-0">
                <div className="h-8 flex items-center justify-center px-4">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {ROUND_LABEL[round]}
                  </span>
                </div>
                {colMatches.map(m => (
                  <div
                    key={m.match_id}
                    className="flex items-center justify-center px-2"
                    style={{ height: slotH }}
                  >
                    <MatchCard m={m} />
                  </div>
                ))}
              </div>
            )
          })}

          {/* Divider */}
          {consolCols.length > 0 && (
            <div className="w-px bg-slate-200 mx-2 self-stretch mt-8" />
          )}

          {/* Consolation columns */}
          {consolCols.map(round => {
            const colMatches = consolByRound.get(round) ?? []
            const slotH = totalH / colMatches.length

            return (
              <div key={round} className="flex flex-col shrink-0">
                <div className="h-8 flex items-center justify-center px-4">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {ROUND_LABEL[round]}
                  </span>
                </div>
                {colMatches.map(m => (
                  <div
                    key={m.match_id}
                    className="flex items-center justify-center px-2"
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

      {/* ── MOBILE bracket (<md) ── */}
      <div className="md:hidden space-y-6">
        {allRounds.map(round => {
          const ms = champCols.includes(round as typeof champCols[number])
            ? (champOrdered.get(round) ?? [])
            : (consolByRound.get(round) ?? [])
          if (ms.length === 0) return null
          return (
            <MobileRound
              key={round}
              label={ROUND_LABEL[round] ?? round}
              matches={ms}
            />
          )
        })}
      </div>
      {entries.length > 0 && (
        <BracketPoll
          entries={entries}
          tournamentId={entries[0]?.tournament_id ?? 0}
          weightClassId={entries[0]?.weight_class_id ?? 0}
          hasMatches={true}
          bracketSize={16}
          provenancePrefix="D"
          districtChamps={districtChamps}
        />
      )}
      </>)}
      <WeightNav weights={WEIGHTS} current={weight} base={`/girls/regions/${region}`} />
    </div>
  )
}
