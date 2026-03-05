'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────

export type BracketEntry = {
  entry_id: string
  wrestler_id: string
  wrestler_name: string
  school: string
  school_name: string
  seed: number | null
  grade: string | null
  wins: number | null
  losses: number | null
  district_num: number | null
  district_place: number | null
}

type PollResult = {
  wrestler_id: string
  wrestler_name: string
  pick_1st_count: number
  pick_2nd_count: number
  pick_3rd_count: number
  pick_4th_count: number
  total_picks: number
}

type MyPick = {
  pick_1st: string | null
  pick_2nd: string | null
  pick_3rd: string | null
  pick_4th: string | null
}

// ── Bracket seeding: simple fold (1vN, 2v(N-1), 3v(N-2)...) ────────────────

function buildMatchups(entries: BracketEntry[], bracketSize: 16 | 32 = 16): [BracketEntry | null, BracketEntry | null][] {
  // Map seed → entry (for seeded wrestlers)
  const bySeed = new Map<number, BracketEntry>()
  const unseeded: BracketEntry[] = []

  for (const e of entries) {
    if (e.seed != null) {
      bySeed.set(e.seed, e)
    } else {
      unseeded.push(e)
    }
  }

  // Simple fold: 1vN, 2v(N-1), 3v(N-2), ...
  const matchups: [BracketEntry | null, BracketEntry | null][] = []
  const half = bracketSize / 2
  let unseededIdx = 0

  for (let i = 1; i <= half; i++) {
    const topSeed = i
    const botSeed = bracketSize + 1 - i
    let top = bySeed.get(topSeed) ?? null
    let bot = bySeed.get(botSeed) ?? null

    // Fill unseeded wrestlers into empty slots
    if (!top && unseededIdx < unseeded.length) {
      top = unseeded[unseededIdx++]
    }
    if (!bot && unseededIdx < unseeded.length) {
      bot = unseeded[unseededIdx++]
    }

    // Only include matchup if at least one wrestler exists
    if (top || bot) {
      matchups.push([top, bot])
    }
  }

  return matchups
}

// ── Seed badge styling ──────────────────────────────────────────────────────

function seedColor(seed: number | null): string {
  if (seed === 1) return 'bg-amber-100 text-amber-700 font-bold'
  if (seed === 2) return 'bg-slate-200 text-slate-600 font-bold'
  if (seed === 3) return 'bg-orange-100 text-orange-600 font-semibold'
  if (seed === 4) return 'bg-sky-100 text-sky-600 font-semibold'
  if (seed != null && seed <= 8) return 'bg-slate-100 text-slate-500 font-medium'
  return 'bg-slate-50 text-slate-400'
}

// ── District provenance label ───────────────────────────────────────────────

function provenanceLabel(prefix: string, num: number | null, place: number | null): string | null {
  if (num == null) return null
  const placeStr = place === 1 ? 'Champ' : place === 2 ? '2nd' : place === 3 ? '3rd' : place === 4 ? '4th' : place === 5 ? '5th' : place === 6 ? '6th' : null
  return placeStr ? `${prefix}${num} ${placeStr}` : `${prefix}${num}`
}

// ── Projected QF matchups ───────────────────────────────────────────────────

function projectedQFs(matchups: [BracketEntry | null, BracketEntry | null][]): string[] {
  // QF = winner of matchup[0] vs winner of matchup[1], etc.
  const qfs: string[] = []
  for (let i = 0; i < matchups.length; i += 2) {
    const a = matchups[i]
    const b = matchups[i + 1]
    if (!a || !b) continue
    const aName = a[0]?.seed ? `(${a[0].seed})` : a[0]?.wrestler_name.split(' ').pop() ?? '?'
    const bName = b[0]?.seed ? `(${b[0].seed})` : b[0]?.wrestler_name.split(' ').pop() ?? '?'
    const aBot = a[1] ? (a[1].seed ? `/${a[1].seed}` : '') : ' bye'
    const bBot = b[1] ? (b[1].seed ? `/${b[1].seed}` : '') : ' bye'
    qfs.push(`${aName}${aBot} vs ${bName}${bBot}`)
  }
  return qfs
}

// ── Visitor ID (cookie-based) ───────────────────────────────────────────────

function getVisitorId(): string {
  if (typeof window === 'undefined') return ''
  let id = document.cookie.match(/bracket_visitor=([^;]+)/)?.[1]
  if (!id) {
    id = crypto.randomUUID()
    document.cookie = `bracket_visitor=${id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  }
  return id
}

// ── Pick slot labels ────────────────────────────────────────────────────────

const PICK_LABELS = [
  { key: 'pick_1st' as const, label: 'Champion', color: 'border-amber-400 bg-amber-50' },
  { key: 'pick_2nd' as const, label: 'Runner-Up', color: 'border-slate-400 bg-slate-50' },
  { key: 'pick_3rd' as const, label: '3rd Place', color: 'border-orange-300 bg-orange-50' },
  { key: 'pick_4th' as const, label: '4th Place', color: 'border-sky-300 bg-sky-50' },
]

// ── Main Component ──────────────────────────────────────────────────────────

export function BracketPoll({
  entries,
  tournamentId,
  weightClassId,
  hasMatches,
  bracketSize = 16,
  provenancePrefix = 'D',
}: {
  entries: BracketEntry[]
  tournamentId: number
  weightClassId: number
  hasMatches: boolean
  bracketSize?: 16 | 32
  provenancePrefix?: string
}) {
  const [picks, setPicks] = useState<MyPick>({ pick_1st: null, pick_2nd: null, pick_3rd: null, pick_4th: null })
  const [results, setResults] = useState<PollResult[]>([])
  const [totalVoters, setTotalVoters] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeSlot, setActiveSlot] = useState<keyof MyPick | null>(null)

  const visitorId = typeof window !== 'undefined' ? getVisitorId() : ''
  const matchups = buildMatchups(entries, bracketSize)
  const qfPreview = projectedQFs(matchups)

  const fetchPoll = useCallback(async () => {
    if (!tournamentId || !weightClassId) return
    const res = await fetch(
      `/api/picks?tournament_id=${tournamentId}&weight_class_id=${weightClassId}&visitor_id=${visitorId}`
    )
    const data = await res.json()
    setResults(data.results ?? [])
    setTotalVoters(data.totalVoters ?? 0)
    if (data.myPick) {
      setPicks(data.myPick)
      setSubmitted(true)
    }
    setLoading(false)
  }, [tournamentId, weightClassId, visitorId])

  useEffect(() => { fetchPoll() }, [fetchPoll])

  const submitPicks = async () => {
    await fetch('/api/picks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournament_id: tournamentId,
        weight_class_id: weightClassId,
        visitor_id: visitorId,
        ...picks,
      }),
    })
    setSubmitted(true)
    fetchPoll()
  }

  const selectWrestler = (wrestlerId: string) => {
    if (!activeSlot || hasMatches) return
    // Remove wrestler from any existing slot
    const newPicks = { ...picks }
    for (const key of Object.keys(newPicks) as (keyof MyPick)[]) {
      if (newPicks[key] === wrestlerId) newPicks[key] = null
    }
    newPicks[activeSlot] = wrestlerId
    setPicks(newPicks)

    // Auto-advance to next empty slot
    const slotOrder: (keyof MyPick)[] = ['pick_1st', 'pick_2nd', 'pick_3rd', 'pick_4th']
    const nextEmpty = slotOrder.find(k => k !== activeSlot && !newPicks[k])
    setActiveSlot(nextEmpty ?? null)
  }

  const entryMap = new Map(entries.map(e => [e.wrestler_id, e]))
  const pollClosed = hasMatches

  // Get pick assignment for a wrestler (which slot they're in)
  const getPickSlot = (wrestlerId: string): number | null => {
    if (picks.pick_1st === wrestlerId) return 0
    if (picks.pick_2nd === wrestlerId) return 1
    if (picks.pick_3rd === wrestlerId) return 2
    if (picks.pick_4th === wrestlerId) return 3
    return null
  }

  return (
    <div className="mt-6 space-y-6">
      {/* ── First Round Matchups ── */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          First Round Draw
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {matchups.map(([top, bot], i) => (
            <MatchupCard
              key={i}
              top={top}
              bot={bot}
              matchNum={i + 1}
              onSelect={selectWrestler}
              activeSlot={activeSlot}
              getPickSlot={getPickSlot}
              pollClosed={pollClosed}
              provenancePrefix={provenancePrefix}
            />
          ))}
        </div>
      </section>

      {/* ── Projected QF Preview ── */}
      {qfPreview.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Projected Quarterfinals
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {qfPreview.map((qf, i) => (
              <div key={i} className="px-3 py-2 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-100">
                <span className="text-slate-400 mr-1.5">QF{i + 1}</span> {qf}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Poll Section ── */}
      {!pollClosed && (
        <section className="border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Pick Your Placewinners
            </h3>
            {totalVoters > 0 && (
              <span className="text-[10px] text-slate-400">
                {totalVoters} pick{totalVoters !== 1 ? 's' : ''} submitted
              </span>
            )}
          </div>

          {/* Pick slots */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {PICK_LABELS.map(({ key, label, color }) => {
              const wrestlerId = picks[key]
              const wrestler = wrestlerId ? entryMap.get(wrestlerId) : null
              const isActive = activeSlot === key

              return (
                <button
                  key={key}
                  onClick={() => setActiveSlot(isActive ? null : key)}
                  className={`rounded-lg border-2 px-3 py-2.5 text-left transition-all ${
                    isActive ? `${color} ring-2 ring-offset-1 ring-slate-400` : wrestler ? color : 'border-dashed border-slate-200 bg-white'
                  }`}
                >
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">{label}</div>
                  {wrestler ? (
                    <div className="text-sm font-medium text-slate-800 truncate mt-0.5">
                      {wrestler.wrestler_name}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic mt-0.5">
                      {isActive ? 'Select from bracket...' : 'Tap to select'}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Submit button */}
          {picks.pick_1st && (
            <button
              onClick={submitPicks}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors"
            >
              {submitted ? 'Update Picks' : 'Submit Picks'}
            </button>
          )}
        </section>
      )}

      {/* ── Poll Results ── */}
      {(submitted || pollClosed) && !loading && (
        <section className={pollClosed ? '' : 'border-t border-slate-100 pt-6'}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {pollClosed ? 'Community Predictions' : 'Community Picks'}
            </h3>
            {totalVoters > 0 && (
              <span className="text-[10px] text-slate-400">
                {totalVoters} vote{totalVoters !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <PollResultsTable results={results} totalVoters={totalVoters} />
        </section>
      )}
    </div>
  )
}

// ── Matchup Card ────────────────────────────────────────────────────────────

function MatchupCard({
  top,
  bot,
  matchNum,
  onSelect,
  activeSlot,
  getPickSlot,
  pollClosed,
  provenancePrefix,
}: {
  top: BracketEntry | null
  bot: BracketEntry | null
  matchNum: number
  onSelect: (id: string) => void
  activeSlot: string | null
  getPickSlot: (id: string) => number | null
  pollClosed: boolean
  provenancePrefix: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <div className="px-2.5 py-1 bg-slate-50 border-b border-slate-100">
        <span className="text-[10px] text-slate-400 font-medium">Match {matchNum}</span>
      </div>
      <EntryRow entry={top} onSelect={onSelect} activeSlot={activeSlot} getPickSlot={getPickSlot} pollClosed={pollClosed} provenancePrefix={provenancePrefix} />
      <div className="border-t border-slate-100" />
      {bot ? (
        <EntryRow entry={bot} onSelect={onSelect} activeSlot={activeSlot} getPickSlot={getPickSlot} pollClosed={pollClosed} provenancePrefix={provenancePrefix} />
      ) : (
        <div className="flex items-center px-2.5 text-xs text-slate-400 italic" style={{ height: 52 }}>
          Bye
        </div>
      )}
    </div>
  )
}

// ── Entry Row ───────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  onSelect,
  activeSlot,
  getPickSlot,
  pollClosed,
  provenancePrefix,
}: {
  entry: BracketEntry | null
  onSelect: (id: string) => void
  activeSlot: string | null
  getPickSlot: (id: string) => number | null
  pollClosed: boolean
  provenancePrefix: string
}) {
  if (!entry) return null

  const record = (entry.wins != null && entry.losses != null) ? `${entry.wins}-${entry.losses}` : null
  const provenance = provenanceLabel(provenancePrefix, entry.district_num, entry.district_place)
  const pickSlot = getPickSlot(entry.wrestler_id)
  const isSelectable = activeSlot && !pollClosed

  const pickBorders = [
    'ring-2 ring-amber-400',
    'ring-2 ring-slate-400',
    'ring-2 ring-orange-300',
    'ring-2 ring-sky-300',
  ]

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-colors ${
        isSelectable ? 'cursor-pointer hover:bg-blue-50' : ''
      } ${pickSlot != null ? 'bg-emerald-50/50' : ''}`}
      style={{ minHeight: 52 }}
      onClick={() => isSelectable && onSelect(entry.wrestler_id)}
    >
      {/* Seed badge */}
      {entry.seed != null ? (
        <span className={`text-[10px] w-5 h-5 flex items-center justify-center rounded-full shrink-0 ${seedColor(entry.seed)}`}>
          {entry.seed}
        </span>
      ) : (
        <span className="w-5 shrink-0" />
      )}

      {/* Wrestler info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/wrestler/${entry.wrestler_id}`}
            className="text-sm font-medium text-slate-800 hover:underline truncate"
            onClick={e => e.stopPropagation()}
          >
            {entry.wrestler_name}
          </Link>
          {pickSlot != null && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
              pickSlot === 0 ? 'bg-amber-100 text-amber-700' :
              pickSlot === 1 ? 'bg-slate-200 text-slate-600' :
              pickSlot === 2 ? 'bg-orange-100 text-orange-600' :
              'bg-sky-100 text-sky-600'
            }`}>
              {['1st', '2nd', '3rd', '4th'][pickSlot]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
            {entry.school_name || entry.school}
          </span>
          {record && <span className="text-[10px] text-slate-400 tabular-nums">{record}</span>}
          {provenance && (
            <span className="text-[10px] px-1 py-0 rounded bg-slate-100 text-slate-500 font-medium">
              {provenance}
            </span>
          )}
          {entry.grade && <span className="text-[10px] text-slate-300">{entry.grade}</span>}
        </div>
      </div>

      {/* Pick indicator ring */}
      {pickSlot != null && (
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          pickSlot === 0 ? 'bg-amber-400' :
          pickSlot === 1 ? 'bg-slate-400' :
          pickSlot === 2 ? 'bg-orange-400' :
          'bg-sky-400'
        }`} />
      )}
    </div>
  )
}

// ── Poll Results Table ──────────────────────────────────────────────────────

function PollResultsTable({ results, totalVoters }: { results: PollResult[]; totalVoters: number }) {
  if (results.length === 0 || totalVoters === 0) {
    return <p className="text-sm text-slate-400">No picks yet. Be the first!</p>
  }

  // Sort by champion picks descending
  const sorted = [...results].sort((a, b) => b.pick_1st_count - a.pick_1st_count || b.pick_2nd_count - a.pick_2nd_count)

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase">Wrestler</th>
            <th className="px-3 py-2 text-center text-[10px] font-semibold text-amber-600 uppercase">Champ</th>
            <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-500 uppercase">2nd</th>
            <th className="px-3 py-2 text-center text-[10px] font-semibold text-orange-500 uppercase">3rd</th>
            <th className="px-3 py-2 text-center text-[10px] font-semibold text-sky-500 uppercase">4th</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.wrestler_id} className="border-t border-slate-100">
              <td className="px-3 py-1.5 font-medium text-slate-700">{r.wrestler_name}</td>
              <td className="px-3 py-1.5 text-center">
                <PctBadge count={r.pick_1st_count} total={totalVoters} color="amber" />
              </td>
              <td className="px-3 py-1.5 text-center">
                <PctBadge count={r.pick_2nd_count} total={totalVoters} color="slate" />
              </td>
              <td className="px-3 py-1.5 text-center">
                <PctBadge count={r.pick_3rd_count} total={totalVoters} color="orange" />
              </td>
              <td className="px-3 py-1.5 text-center">
                <PctBadge count={r.pick_4th_count} total={totalVoters} color="sky" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PctBadge({ count, total, color }: { count: number; total: number; color: string }) {
  if (count === 0) return <span className="text-[10px] text-slate-300">-</span>
  const pct = Math.round((count / total) * 100)
  const colorMap: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
    orange: 'bg-orange-100 text-orange-600',
    sky: 'bg-sky-100 text-sky-600',
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${colorMap[color]}`}>
      {pct}%
    </span>
  )
}
