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
  bracket_position: number | null
}

export type DistrictChamp = {
  district_num: number
  place: number
  wrestler_name: string
  wrestler_id: string
  school_name: string
  annotation?: string
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

const PICK_KEYS: (keyof MyPick)[] = ['pick_1st', 'pick_2nd', 'pick_3rd', 'pick_4th']

// ── Bracket matchup building from bracket_position ──────────────────────────

function buildMatchups(entries: BracketEntry[], bracketSize: 16 | 32 = 16): [BracketEntry | null, BracketEntry | null][] {
  const withPosition = entries.filter(e => e.bracket_position != null)

  if (withPosition.length > 0) {
    const byPos = new Map<number, BracketEntry>()
    for (const e of withPosition) byPos.set(e.bracket_position!, e)

    const withoutPosition = entries.filter(e => e.bracket_position == null)
    let extraIdx = 0

    const matchups: [BracketEntry | null, BracketEntry | null][] = []
    for (let i = 1; i <= bracketSize; i += 2) {
      let top = byPos.get(i) ?? null
      let bot = byPos.get(i + 1) ?? null
      if (!top && extraIdx < withoutPosition.length) top = withoutPosition[extraIdx++]
      if (!bot && extraIdx < withoutPosition.length) bot = withoutPosition[extraIdx++]
      if (top || bot) matchups.push([top, bot])
    }
    return matchups
  }

  // Fallback: seed-based pairing
  const bySeed = new Map<number, BracketEntry>()
  const unseeded: BracketEntry[] = []
  for (const e of entries) {
    if (e.seed != null && e.seed >= 1) bySeed.set(e.seed, e)
    else unseeded.push(e)
  }
  const numSeeds = bracketSize / 2
  const matchups: [BracketEntry | null, BracketEntry | null][] = []
  let unseededIdx = 0
  for (let seed = 1; seed <= numSeeds; seed++) {
    const seeded = bySeed.get(seed) ?? null
    let opponent: BracketEntry | null = null
    if (unseededIdx < unseeded.length) opponent = unseeded[unseededIdx++]
    if (seeded || opponent) matchups.push([seeded, opponent])
  }
  return matchups
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function seedColor(seed: number | null): string {
  if (seed === 1) return 'bg-amber-100 text-amber-700 font-bold'
  if (seed === 2) return 'bg-slate-200 text-slate-600 font-bold'
  if (seed === 3) return 'bg-orange-100 text-orange-600 font-semibold'
  if (seed === 4) return 'bg-sky-100 text-sky-600 font-semibold'
  if (seed != null && seed <= 8) return 'bg-slate-100 text-slate-500 font-medium'
  return 'bg-slate-50 text-slate-400'
}

function provenanceLabel(prefix: string, num: number | null, place: number | null): string | null {
  if (num == null) return null
  const placeStr = place === 1 ? 'Champ' : place === 2 ? '2nd' : place === 3 ? '3rd' : place === 4 ? '4th' : place === 5 ? '5th' : place === 6 ? '6th' : null
  return placeStr ? `${prefix}${num} ${placeStr}` : `${prefix}${num}`
}

function getVisitorId(): string {
  if (typeof window === 'undefined') return ''
  let id = document.cookie.match(/bracket_visitor=([^;]+)/)?.[1]
  if (!id) {
    id = crypto.randomUUID()
    document.cookie = `bracket_visitor=${id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  }
  return id
}

// Place circle colors
const PLACE_STYLES = [
  { bg: 'bg-amber-400', text: 'text-white', ring: 'ring-amber-400', label: '1st', labelColor: 'text-amber-600' },
  { bg: 'bg-slate-400', text: 'text-white', ring: 'ring-slate-400', label: '2nd', labelColor: 'text-slate-500' },
  { bg: 'bg-orange-400', text: 'text-white', ring: 'ring-orange-400', label: '3rd', labelColor: 'text-orange-500' },
  { bg: 'bg-sky-400', text: 'text-white', ring: 'ring-sky-400', label: '4th', labelColor: 'text-sky-500' },
]

// ── Main Component ──────────────────────────────────────────────────────────

export function BracketPoll({
  entries,
  tournamentId,
  weightClassId,
  hasMatches,
  bracketSize = 16,
  provenancePrefix = 'D',
  districtChamps = [],
}: {
  entries: BracketEntry[]
  tournamentId: number
  weightClassId: number
  hasMatches: boolean
  bracketSize?: 16 | 32
  provenancePrefix?: string
  districtChamps?: DistrictChamp[]
}) {
  const [picks, setPicks] = useState<MyPick>({ pick_1st: null, pick_2nd: null, pick_3rd: null, pick_4th: null })
  const [results, setResults] = useState<PollResult[]>([])
  const [totalVoters, setTotalVoters] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)

  const visitorId = typeof window !== 'undefined' ? getVisitorId() : ''
  const entryMap = new Map(entries.map(e => [e.wrestler_id, e]))
  const pollClosed = hasMatches

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

  // Toggle a place pick for a wrestler
  const togglePick = (wrestlerId: string, placeIdx: number) => {
    if (pollClosed) return
    const key = PICK_KEYS[placeIdx]
    const newPicks = { ...picks }

    // If this wrestler already has this place, remove it
    if (newPicks[key] === wrestlerId) {
      newPicks[key] = null
      setPicks(newPicks)
      return
    }

    // Remove this wrestler from any other place
    for (const k of PICK_KEYS) {
      if (newPicks[k] === wrestlerId) newPicks[k] = null
    }

    // Remove whoever currently holds this place
    newPicks[key] = wrestlerId
    setPicks(newPicks)
  }

  const getPickSlot = (wrestlerId: string): number | null => {
    for (let i = 0; i < PICK_KEYS.length; i++) {
      if (picks[PICK_KEYS[i]] === wrestlerId) return i
    }
    return null
  }

  // Build podium display: use poll results if available, otherwise default to seeds
  const podium = buildPodium(results, totalVoters, entries, entryMap)

  // Entries sorted by seed for the seeded list
  const seededEntries = [...entries].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))

  return (
    <div className="mt-6 space-y-6">
      {/* ── Poll Results (only if votes exist) ── */}
      {!loading && totalVoters > 0 && (
        <PodiumBar podium={podium} totalVoters={totalVoters} loading={loading} />
      )}

      {/* ── Instructions ── */}
      {!pollClosed && !submitted && (
        <p className="text-xs text-slate-400 text-center">
          Select your podium — tap a place circle next to any wrestler
        </p>
      )}

      {/* ── Seeded Entry List ── */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Entries
        </h3>
        <div className="max-w-lg bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          {seededEntries.map((entry, i) => (
            <div key={entry.entry_id} className={i > 0 ? 'border-t border-slate-100' : ''}>
              <EntryRow
                entry={entry}
                togglePick={togglePick}
                getPickSlot={getPickSlot}
                pollClosed={pollClosed}
                provenancePrefix={provenancePrefix}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Submit / Update ── */}
      {!pollClosed && picks.pick_1st && (
        <div className="flex justify-center">
          <button
            onClick={submitPicks}
            className="px-6 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors"
          >
            {submitted ? 'Update Picks' : 'Submit Picks'}
          </button>
        </div>
      )}

      {/* ── District Podiums ── */}
      {districtChamps.length > 0 && (
        <DistrictPodiums champs={districtChamps} />
      )}
    </div>
  )
}

// ── Podium builder ──────────────────────────────────────────────────────────

type PodiumEntry = { wrestler_name: string; wrestler_id: string; school: string; pct: number | null; isDefault: boolean }

function buildPodium(
  results: PollResult[],
  totalVoters: number,
  entries: BracketEntry[],
  entryMap: Map<string, BracketEntry>,
): PodiumEntry[] {
  // If we have votes, use the leaders
  if (totalVoters > 0 && results.length > 0) {
    const countKeys = ['pick_1st_count', 'pick_2nd_count', 'pick_3rd_count', 'pick_4th_count'] as const
    const podium: PodiumEntry[] = []

    for (const ck of countKeys) {
      const leader = results.reduce((best, r) => r[ck] > best[ck] ? r : best, results[0])
      if (leader[ck] > 0) {
        const entry = entryMap.get(leader.wrestler_id)
        podium.push({
          wrestler_name: leader.wrestler_name,
          wrestler_id: leader.wrestler_id,
          school: entry?.school_name || entry?.school || '',
          pct: Math.round((leader[ck] / totalVoters) * 100),
          isDefault: false,
        })
      }
    }
    if (podium.length > 0) return podium
  }

  // Default to top 4 seeds
  const seeded = [...entries].filter(e => e.seed != null).sort((a, b) => a.seed! - b.seed!)
  return seeded.slice(0, 4).map(e => ({
    wrestler_name: e.wrestler_name,
    wrestler_id: e.wrestler_id,
    school: e.school_name || e.school,
    pct: null,
    isDefault: true,
  }))
}

// ── Podium Bar ──────────────────────────────────────────────────────────────

function PodiumBar({ podium, totalVoters, loading }: { podium: PodiumEntry[]; totalVoters: number; loading: boolean }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {podium[0]?.isDefault ? 'Projected Podium' : 'Peanut Gallery Wisdom'}
        </h3>
        {totalVoters > 0 && (
          <span className="text-[10px] text-slate-400">
            {totalVoters} vote{totalVoters !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {podium.map((p, i) => (
          <div key={i} className="text-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-1 ${PLACE_STYLES[i].bg} ${PLACE_STYLES[i].text} text-xs font-bold`}>
              {i + 1}
            </div>
            <Link
              href={`/wrestler/${p.wrestler_id}`}
              className="text-xs font-medium text-slate-800 hover:underline block truncate"
            >
              {p.wrestler_name}
            </Link>
            <span className="text-[9px] text-slate-400 truncate block">{p.school}</span>
            {p.pct != null && (
              <span className={`text-[9px] font-semibold ${PLACE_STYLES[i].labelColor}`}>{p.pct}%</span>
            )}
          </div>
        ))}
        {loading && podium.length === 0 && (
          <div className="col-span-4 text-center text-xs text-slate-400 py-2">Loading...</div>
        )}
      </div>
    </div>
  )
}

// ── Matchup Card ────────────────────────────────────────────────────────────

function MatchupCard({
  top,
  bot,
  matchNum,
  togglePick,
  getPickSlot,
  pollClosed,
  provenancePrefix,
}: {
  top: BracketEntry | null
  bot: BracketEntry | null
  matchNum: number
  togglePick: (wrestlerId: string, placeIdx: number) => void
  getPickSlot: (id: string) => number | null
  pollClosed: boolean
  provenancePrefix: string
}) {
  return (
    <div className="border-l-2 border-slate-300 bg-white">
      {top ? (
        <EntryRow entry={top} togglePick={togglePick} getPickSlot={getPickSlot} pollClosed={pollClosed} provenancePrefix={provenancePrefix} />
      ) : (
        <div className="flex items-center px-2.5 text-xs text-slate-400 italic border-b border-slate-100" style={{ height: 40 }}>Bye</div>
      )}
      <div className="border-b border-slate-300" />
      {bot ? (
        <EntryRow entry={bot} togglePick={togglePick} getPickSlot={getPickSlot} pollClosed={pollClosed} provenancePrefix={provenancePrefix} />
      ) : (
        <div className="flex items-center px-2.5 text-xs text-slate-400 italic" style={{ height: 40 }}>Bye</div>
      )}
      {matchNum % 2 === 0 && <div className="h-3" />}
    </div>
  )
}

// ── Entry Row ───────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  togglePick,
  getPickSlot,
  pollClosed,
  provenancePrefix,
}: {
  entry: BracketEntry
  togglePick: (wrestlerId: string, placeIdx: number) => void
  getPickSlot: (id: string) => number | null
  pollClosed: boolean
  provenancePrefix: string
}) {
  const record = (entry.wins != null && entry.losses != null) ? `${entry.wins}-${entry.losses}` : null
  const provenance = provenanceLabel(provenancePrefix, entry.district_num, entry.district_place)
  const currentSlot = getPickSlot(entry.wrestler_id)

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5" style={{ minHeight: 48 }}>
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
        <Link
          href={`/wrestler/${entry.wrestler_id}`}
          className="text-[13px] font-medium text-slate-800 hover:underline truncate block"
        >
          {entry.wrestler_name}
        </Link>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
            {entry.school_name || entry.school}
          </span>
          {record && <span className="text-[10px] text-slate-400 tabular-nums">{record}</span>}
          {provenance && (
            <span className="text-[10px] px-1 rounded bg-slate-100 text-slate-500 font-medium">
              {provenance}
            </span>
          )}
        </div>
      </div>

      {/* Place pick circles */}
      {!pollClosed && (
        <div className="flex gap-1 shrink-0">
          {PLACE_STYLES.map((style, idx) => {
            const isSelected = currentSlot === idx
            return (
              <button
                key={idx}
                onClick={() => togglePick(entry.wrestler_id, idx)}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  isSelected
                    ? `${style.bg} ${style.text} ring-2 ${style.ring} ring-offset-1`
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
                title={`Pick as ${style.label}`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      )}

      {/* Show assigned place when poll is closed */}
      {pollClosed && currentSlot != null && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${PLACE_STYLES[currentSlot].bg} ${PLACE_STYLES[currentSlot].text}`}>
          {PLACE_STYLES[currentSlot].label}
        </span>
      )}
    </div>
  )
}

// ── District Podiums ────────────────────────────────────────────────────────

const PLACE_MEDAL = ['\u{1F947}', '\u{1F948}', '\u{1F949}']

function DistrictPodiums({ champs }: { champs: DistrictChamp[] }) {
  const byDistrict = new Map<number, DistrictChamp[]>()
  for (const dc of champs) {
    const list = byDistrict.get(dc.district_num) ?? []
    list.push(dc)
    byDistrict.set(dc.district_num, list)
  }
  const districts = [...byDistrict.entries()].sort((a, b) => a[0] - b[0])

  return (
    <section className="border-t border-slate-100 pt-6">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        District Qualifiers
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {districts.map(([distNum, placers]) => (
          <div key={distNum} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500">District {distNum}</span>
            </div>
            <div className="divide-y divide-slate-50">
              {placers.map(dc => (
                <div key={dc.wrestler_id} className="flex items-center gap-2 px-3 py-1.5">
                  <span className="text-[11px] w-4 text-center shrink-0">
                    {dc.place <= 3 ? PLACE_MEDAL[dc.place - 1] : String(dc.place)}
                  </span>
                  <Link
                    href={`/wrestler/${dc.wrestler_id}`}
                    className={`text-[13px] font-medium hover:underline truncate ${dc.annotation === 'Withdrawn' ? 'text-slate-400 line-through' : dc.annotation ? 'text-slate-600' : 'text-slate-800'}`}
                  >
                    {dc.wrestler_name}
                  </Link>
                  {dc.annotation === 'Withdrawn' && (
                    <span className="text-[10px] px-1 rounded bg-red-50 text-red-500 font-medium shrink-0">
                      WD
                    </span>
                  )}
                  {dc.annotation === 'Alternate' && (
                    <span className="text-[10px] px-1 rounded bg-amber-50 text-amber-600 font-semibold shrink-0">
                      Alt
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 truncate ml-auto shrink-0">
                    {dc.school_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
