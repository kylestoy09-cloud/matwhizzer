import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getActiveSeason } from '@/lib/get-season'
import { SEASONS } from '@/lib/seasons'
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

const CARD_H = 72

const ROUND_LABEL: Record<string, string> = {
  BYE:         'Byes',
  R2:          'Prelims',
  QF:          'Quarters',
  SF:          'Semis',
  F:           'Finals',
  C1:          'Cons. R1',
  C2:          'Cons. R2',
  '3rd_Place': '3rd Place',
  '5th_Place': '5th Place',
}

// For orderChampMatches DFS
const PREV_ROUND: Record<string, string> = { QF: 'R2', SF: 'QF', F: 'SF' }

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatResult(m: MatchRow): string {
  if (!m.win_type) return ''
  if (m.win_type === 'BYE') return 'Adv.'
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

// ── Bracket ordering (DFS from Final) ────────────────────────────────────────

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

// ── Bye synthesis ─────────────────────────────────────────────────────────

function synthesizeByes(
  entries: { entry_id: string; wrestler_id: string; wrestler_name: string; school: string; school_name: string; seed: number | null; grade: string | null; bracket_position: number | null }[],
  champMatches: MatchRow[],
  firstRound: string,
  feedingRound: string,
): MatchRow[] {
  const inFeeding = new Set<string>()
  for (const m of champMatches) {
    if (m.round === feedingRound) {
      if (m.winner_entry_id) inFeeding.add(m.winner_entry_id)
      if (m.loser_entry_id) inFeeding.add(m.loser_entry_id)
    }
  }
  const inFirst = new Set<string>()
  for (const m of champMatches) {
    if (m.round === firstRound) {
      if (m.winner_entry_id) inFirst.add(m.winner_entry_id)
      if (m.loser_entry_id) inFirst.add(m.loser_entry_id)
    }
  }
  return entries
    .filter(e => inFirst.has(e.entry_id) && !inFeeding.has(e.entry_id))
    .sort((a, b) => (a.bracket_position ?? 99) - (b.bracket_position ?? 99))
    .map(e => ({
      match_id: `bye-${e.entry_id}`,
      round: 'BYE',
      bracket_side: 'championship',
      win_type: 'BYE',
      winner_score: null, loser_score: null, fall_time_seconds: null,
      winner_entry_id: e.entry_id,
      winner_wrestler_id: e.wrestler_id,
      winner_name: e.wrestler_name,
      winner_school: e.school,
      winner_school_name: e.school_name,
      winner_seed: e.seed,
      winner_grade: e.grade,
      loser_entry_id: null, loser_wrestler_id: null,
      loser_name: null, loser_school: null, loser_school_name: null,
      loser_seed: null, loser_grade: null,
    }))
}

// ── Combined first round (byes + prelims in bracket order) ───────────────────

function buildCombinedFirstRound(
  r2Matches: MatchRow[],
  byeMatches: MatchRow[],
  entries: { entry_id: string; bracket_position: number | null }[],
): MatchRow[] {
  const posMap = new Map<string, number>()
  for (const e of entries) {
    if (e.bracket_position != null) posMap.set(e.entry_id, e.bracket_position)
  }

  const all = [...r2Matches, ...byeMatches]

  return all.sort((a, b) => {
    const posA = a.winner_entry_id ? (posMap.get(a.winner_entry_id) ?? 99) : 99
    const posB = b.winner_entry_id ? (posMap.get(b.winner_entry_id) ?? 99) : 99
    return posA - posB
  })
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
      className={`flex items-center gap-1 px-2 ${isWinner ? 'bg-emerald-50' : ''}`}
      style={{ height: 28 }}
    >
      {seed != null ? (
        <span className="text-[10px] text-slate-400 w-3.5 shrink-0 text-right">{seed}</span>
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <span className="flex-1 min-w-0 truncate">
        {isBye ? (
          <span className="text-[11px] text-slate-400 italic">Bye</span>
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
          <span className="text-[11px] text-slate-400">—</span>
        )}
      </span>
      {!isBye && (
        <span className="text-[11px] text-slate-400 shrink-0 max-w-[100px] truncate">
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
      className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm w-[216px] shrink-0"
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
        className="flex items-center justify-end px-2 border-t border-slate-100"
        style={{ height: CARD_H - 57 }}
      >
        <span className="text-[11px] text-slate-400 tabular-nums">{result}</span>
      </div>
    </div>
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
    <div className="flex items-center gap-1 px-2" style={{ height: 36 }}>
      {entry.seed != null ? (
        <span className="text-[10px] text-slate-400 w-3.5 shrink-0 text-right">{entry.seed}</span>
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <Link
          href={`/wrestler/${entry.wrestler_id}`}
          className="text-[13px] font-medium text-slate-700 hover:underline block truncate"
        >
          {entry.wrestler_name}
        </Link>
        <div className="flex items-center gap-1.5 mt-0.5">
          {entry.grade && <span className="text-[10px] text-slate-400">{entry.grade}</span>}
          {record && <span className="text-[10px] text-slate-400 tabular-nums">{record}</span>}
        </div>
      </div>
      <span className="text-[10px] text-slate-400 shrink-0 max-w-[100px] truncate">
        {entry.school}
      </span>
    </div>
  )
}

function EntryCard({ top, bot }: { top: EntryRow; bot: EntryRow | null }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm w-[216px] shrink-0">
      <EntryWrestlerRow entry={top} />
      <div className="border-t border-slate-100" />
      {bot ? (
        <EntryWrestlerRow entry={bot} />
      ) : (
        <div className="flex items-center px-2 text-[11px] text-slate-400 italic" style={{ height: 36 }}>
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

function buildRosterFromEntries(entries: EntryRow[]): RosterItem[] {
  return entries.map(e => ({
    wrestler_id: e.wrestler_id, name: e.wrestler_name,
    school: e.school, school_name: e.school_name,
    seed: e.seed, grade: e.grade,
  })).sort((a, b) => {
    if (a.seed != null && b.seed != null) return a.seed - b.seed
    if (a.seed != null) return -1
    if (b.seed != null) return 1
    return a.name.localeCompare(b.name)
  })
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

const WEIGHTS = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285] as const

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

// ── Bracket column renderer ──────────────────────────────────────────────────

function BracketColumn({
  label,
  matches: colMatches,
  totalH,
}: {
  label: string
  matches: MatchRow[]
  totalH: number
}) {
  if (colMatches.length === 0) return null
  const slotH = totalH / colMatches.length

  return (
    <div className="flex flex-col shrink-0">
      <div className="h-7 flex items-center justify-center px-3">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
          {label}
        </span>
      </div>
      {colMatches.map(m => (
        <div
          key={m.match_id}
          className="flex items-center justify-center px-1"
          style={{ height: slotH }}
        >
          <MatchCard m={m} />
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RegionBracketPage({
  params,
}: {
  params: Promise<{ region: string; weight: string }>
}) {
  const { region: rawR, weight: rawW } = await params
  const region = Number(rawR)
  const weight = Number(rawW)

  if (!region || region < 1 || region > 8 || !weight) notFound()

  const season = await getActiveSeason()

  const [{ data: matchData }, { data: entryData }, { data: champData }] = await Promise.all([
    supabase.rpc('region_bracket', {
      p_region: region,
      p_weight: weight,
      p_gender: 'M',
      p_season: season,
    }),
    supabase.rpc('region_bracket_entries_v2', {
      p_region: region,
      p_weight: weight,
      p_gender: 'M',
      p_season: season,
    }),
    supabase.rpc('region_district_champs', {
      p_region: region,
      p_weight: weight,
      p_gender: 'M',
      p_season: season,
    }),
  ])

  const matches = (matchData ?? []) as MatchRow[]
  const entries = (entryData ?? []) as (BracketEntry & { tournament_id: number; weight_class_id: number })[]
  const rawChamps = (champData ?? []) as DistrictChamp[]

  // Annotate district placers who withdrew (not in region entries) and their replacements
  const entryWrestlerIds = new Set(entries.map(e => e.wrestler_id))
  const districtChamps = rawChamps.map(dc => {
    if (dc.place >= 1 && dc.place <= 3 && !entryWrestlerIds.has(dc.wrestler_id)) {
      return { ...dc, annotation: 'Withdrawn' }
    }
    if (dc.place === 4) {
      if (entryWrestlerIds.has(dc.wrestler_id)) {
        const withdrawn = rawChamps.find(c =>
          c.district_num === dc.district_num && c.place >= 1 && c.place <= 3
          && !entryWrestlerIds.has(c.wrestler_id)
        )
        if (withdrawn) {
          return { ...dc, annotation: 'ActiveAlternate' }
        }
      }
      return { ...dc, annotation: 'Alternate' }
    }
    return dc
  })

  if (matches.length === 0 && entries.length === 0) notFound()

  // ── Build bracket data ──────────────────────────────────────────────────────

  // Group all matches by round
  const matchesByRound = new Map<string, MatchRow[]>()
  for (const m of matches) {
    const list = matchesByRound.get(m.round) ?? []
    list.push(m)
    matchesByRound.set(m.round, list)
  }

  // DFS ordering for championship side
  const champ = matches.filter(m => m.bracket_side === 'championship')
  const champOrdered = orderChampMatches(champ)

  // Synthesize bye cards + build combined first-round column
  const byeMatches = matches.length > 0 ? synthesizeByes(entries, champ, 'QF', 'R2') : []
  const r2Matches = champOrdered.get('R2') ?? []
  const combinedFirstRound = buildCombinedFirstRound(r2Matches, byeMatches, entries)

  // Championship display: Combined → QF → SF → F → 3rd_Place
  const champRounds = (['QF', 'SF', 'F'] as const).filter(r => (champOrdered.get(r) ?? []).length > 0)
  const thirdPlaceMatches = champOrdered.get('3rd_Place') ?? matchesByRound.get('3rd_Place') ?? []

  // Consolation display: C1 → C2 → 5th_Place
  const consolRounds = (['C1', 'C2'] as const).filter(r => (matchesByRound.get(r) ?? []).length > 0)
  const fifthPlaceMatches = matchesByRound.get('5th_Place') ?? []

  // Heights
  const champBaseCount = Math.max(combinedFirstRound.length, (champOrdered.get('QF') ?? []).length, 1)
  const champTotalH = champBaseCount * CARD_H

  const consolBaseCount = Math.max(
    ...consolRounds.map(r => (matchesByRound.get(r) ?? []).length),
    fifthPlaceMatches.length,
    1,
  )
  const consolTotalH = consolBaseCount * CARD_H

  const hasConsol = consolRounds.length > 0 || fifthPlaceMatches.length > 0

  return (
    <div className="max-w-fit mx-auto px-4 py-8">
      <style>{`@keyframes bracketFade{from{opacity:1}to{opacity:0}}`}</style>

      <Link
        href={`/boys/regions/${region}`}
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Region {region}
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Region {region}
          <span className="text-slate-400 font-normal ml-2">·</span>
          <span className="text-slate-600 font-semibold ml-2">{weight} lb</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">NJSIAA {SEASONS[season]?.label ?? season} · Boys postseason</p>
      </div>

      <WeightNav weights={WEIGHTS} current={weight} base={`/boys/regions/${region}`} />

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

      {/* ── Championship Bracket ── */}
      <section className="mt-6">
        <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
          Championship Bracket
        </h2>
        <div
          className="overflow-auto border border-slate-200 md:border-0 rounded-lg md:rounded-none max-h-[70vh] md:max-h-none"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          <div className="flex gap-0 items-start min-w-max p-2 md:p-0">
            {/* Combined first round (Byes + Prelims) */}
            {combinedFirstRound.length > 0 && (
              <BracketColumn label="Prelims" matches={combinedFirstRound} totalH={champTotalH} />
            )}

            {/* QF → SF → F */}
            {champRounds.map(round => (
              <BracketColumn
                key={round}
                label={ROUND_LABEL[round]}
                matches={champOrdered.get(round) ?? []}
                totalH={champTotalH}
              />
            ))}

            {/* 3rd Place */}
            {thirdPlaceMatches.length > 0 && (
              <BracketColumn label="3rd Place" matches={thirdPlaceMatches} totalH={champTotalH} />
            )}
          </div>
        </div>
        <p
          className="md:hidden text-center text-[11px] text-slate-400 py-1 pointer-events-none"
          style={{ animation: 'bracketFade 2s ease-out 1.5s forwards' }}
        >
          ← scroll →
        </p>
      </section>

      {/* ── Consolation Bracket ── */}
      {hasConsol && (
        <section className="mt-6">
          <div className="relative flex items-center my-4">
            <div className="flex-1 border-t border-slate-300" />
            <span className="px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              Consolation Bracket
            </span>
            <div className="flex-1 border-t border-slate-300" />
          </div>
          <div
            className="overflow-auto border border-slate-200 md:border-0 rounded-lg md:rounded-none max-h-[50vh] md:max-h-none"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            <div className="flex gap-0 items-start min-w-max p-2 md:p-0">
              {consolRounds.map(round => (
                <BracketColumn
                  key={round}
                  label={ROUND_LABEL[round]}
                  matches={matchesByRound.get(round) ?? []}
                  totalH={consolTotalH}
                />
              ))}

              {fifthPlaceMatches.length > 0 && (
                <BracketColumn label="5th Place" matches={fifthPlaceMatches} totalH={consolTotalH} />
              )}
            </div>
          </div>
          <p
            className="md:hidden text-center text-[11px] text-slate-400 py-1 pointer-events-none"
            style={{ animation: 'bracketFade 2s ease-out 1.5s forwards' }}
          >
            ← scroll →
          </p>
        </section>
      )}

      </>)}
      <RosterTable roster={matches.length > 0 ? buildRosterFromMatches(matches) : buildRosterFromEntries(entries as EntryRow[])} />
      {/* Poll results below entries */}
      {matches.length > 0 && entries.length > 0 && (
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
      <WeightNav weights={WEIGHTS} current={weight} base={`/boys/regions/${region}`} />
    </div>
  )
}
