'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import type {
  Tournament, WeightClass, EntryRecord, MatchRecord, BracketSlot,
} from './types'
import {
  CHAMPIONSHIP_ROUNDS,
  CONSOLATION_ROUNDS,
  PLACE_ROUNDS,
  ROUND_LABELS,
  ROUND_MATCH_COUNT,
  R1_MATCHUPS,
  ROUTING,
  buildBracketSlots,
  formatResult,
  getTheoreticalSeeds,
} from './bracketRouting'
import { EditPanel } from './EditPanel'

// ─── Props ─────────────────────────────────────────────────────────

interface BracketEditorProps {
  tournaments: Tournament[]
  weightClasses: WeightClass[]
}

// ─── Main Component ────────────────────────────────────────────────

export function BracketEditor({ tournaments, weightClasses }: BracketEditorProps) {
  const defaultTournament = tournaments.find(t => t.gender === 'M') ?? tournaments[0]

  const [tournamentId, setTournamentId] = useState<number>(defaultTournament?.id ?? 0)
  const [weightClassId, setWeightClassId] = useState<number>(0)
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [entries, setEntries] = useState<EntryRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<BracketSlot | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const tournament = tournaments.find(t => t.id === tournamentId)
  const gender = tournament?.gender ?? 'M'

  const genderWeights = useMemo(
    () => weightClasses.filter(w => w.gender === gender).sort((a, b) => a.weight - b.weight),
    [weightClasses, gender]
  )

  useEffect(() => {
    if (genderWeights.length > 0 && !genderWeights.find(w => w.id === weightClassId)) {
      setWeightClassId(genderWeights[0].id)
    }
  }, [genderWeights, weightClassId])

  const currentWeight = genderWeights.find(w => w.id === weightClassId)
  const weightLabel = currentWeight ? `${currentWeight.weight} lbs` : ''
  const weightIdx = genderWeights.findIndex(w => w.id === weightClassId)

  // ── Data Fetching ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!tournamentId || !weightClassId) return
    setLoading(true)
    setSelectedSlot(null)

    const supabase = createSupabaseBrowser()

    const [matchRes, entryRes] = await Promise.all([
      supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('weight_class_id', weightClassId)
        .order('bout_number'),
      supabase
        .from('tournament_entries')
        .select('id, seed, wrestler_id, school_id, wrestlers(first_name, last_name)')
        .eq('tournament_id', tournamentId)
        .eq('weight_class_id', weightClassId)
        .order('seed'),
    ])

    setMatches((matchRes.data ?? []) as MatchRecord[])

    const transformed: EntryRecord[] = ((entryRes.data ?? []) as unknown as Array<{
      id: string
      seed: number | null
      wrestlers: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null
    }>).map(e => {
      const w = Array.isArray(e.wrestlers) ? e.wrestlers[0] : e.wrestlers
      return {
        id: e.id,
        seed: e.seed,
        wrestlerFirst: w?.first_name ?? '?',
        wrestlerLast: w?.last_name ?? '?',
        schoolName: null,
      }
    })
    setEntries(transformed)
    setLoading(false)
  }, [tournamentId, weightClassId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Bracket Slots ──────────────────────────────────────────────

  const slots = useMemo(() => buildBracketSlots(matches), [matches])

  const entryMap = useMemo(() => {
    const m = new Map<string, EntryRecord>()
    for (const e of entries) m.set(e.id, e)
    return m
  }, [entries])

  const entryBySeed = useMemo(() => {
    const m = new Map<number, EntryRecord>()
    for (const e of entries) {
      if (e.seed != null) m.set(e.seed, e)
    }
    return m
  }, [entries])

  const statusCounts = useMemo(() => {
    const c = { complete: 0, partial: 0, broken: 0, empty: 0 }
    for (const s of slots) c[s.status]++
    return c
  }, [slots])

  // ── Handlers ───────────────────────────────────────────────────

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSaved(updated: MatchRecord) {
    setMatches(prev => {
      const idx = prev.findIndex(m => m.id === updated.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [...prev, updated]
    })
    setSelectedSlot(s =>
      s ? { ...s, match: updated, status: getQuickStatus(updated) } : null
    )
    showToast('Match saved', 'success')
  }

  function handleCleared(matchId: string) {
    setMatches(prev =>
      prev.map(m =>
        m.id === matchId
          ? { ...m, winner_entry_id: null, loser_entry_id: null, win_type: null, winner_score: null, loser_score: null, fall_time_seconds: null, score_raw: null }
          : m
      )
    )
    setSelectedSlot(s =>
      s?.match?.id === matchId
        ? { ...s, match: { ...s.match!, winner_entry_id: null, loser_entry_id: null, win_type: null, winner_score: null, loser_score: null, fall_time_seconds: null, score_raw: null }, status: 'broken' }
        : s
    )
    showToast('Match cleared', 'success')
  }

  function handlePrevWeight() {
    if (weightIdx > 0) setWeightClassId(genderWeights[weightIdx - 1].id)
  }
  function handleNextWeight() {
    if (weightIdx < genderWeights.length - 1) setWeightClassId(genderWeights[weightIdx + 1].id)
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left: Bracket Display */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Breadcrumb */}
        <nav className="text-xs text-slate-400 flex items-center gap-1">
          <Link href="/admin" className="hover:text-slate-600">Admin</Link>
          <span>/</span>
          <span className="text-slate-600">Bracket Editor</span>
          {tournament && (
            <>
              <span>/</span>
              <span className="text-slate-600">{tournament.name}</span>
            </>
          )}
          {currentWeight && (
            <>
              <span>/</span>
              <span className="text-slate-900 font-medium">{currentWeight.weight}</span>
            </>
          )}
        </nav>

        {/* Selectors */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label htmlFor="tournament" className="block text-xs font-medium text-slate-600 mb-1">
              Tournament
            </label>
            <select
              id="tournament"
              value={tournamentId}
              onChange={e => setTournamentId(Number(e.target.value))}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} (S{t.season_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="weight" className="block text-xs font-medium text-slate-600 mb-1">
              Weight Class
            </label>
            <select
              id="weight"
              value={weightClassId}
              onChange={e => setWeightClassId(Number(e.target.value))}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {genderWeights.map(w => (
                <option key={w.id} value={w.id}>{w.weight} lbs</option>
              ))}
            </select>
          </div>

          <div className="flex gap-1">
            <button
              onClick={handlePrevWeight}
              disabled={weightIdx <= 0}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded
                         hover:bg-slate-50 disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              onClick={handleNextWeight}
              disabled={weightIdx >= genderWeights.length - 1}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded
                         hover:bg-slate-50 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex gap-4 text-xs">
          <span className="text-green-700">{statusCounts.complete} complete</span>
          <span className="text-yellow-700">{statusCounts.partial} missing data</span>
          <span className="text-red-700">{statusCounts.broken} broken</span>
          <span className="text-slate-400">{statusCounts.empty} empty</span>
          <span className="text-slate-400 ml-auto">{entries.length} entries</span>
        </div>

        {loading ? (
          <div className="text-sm text-slate-400 py-12 text-center">Loading bracket…</div>
        ) : (
          <>
            <section>
              <h2 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                Championship
              </h2>
              <BracketGrid
                rounds={[...CHAMPIONSHIP_ROUNDS]}
                slots={slots}
                entryMap={entryMap}
                entryBySeed={entryBySeed}
                selectedSlot={selectedSlot}
                onSlotClick={setSelectedSlot}
              />
            </section>

            <section className="mt-6">
              <h2 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                Consolation
              </h2>
              <BracketGrid
                rounds={[...CONSOLATION_ROUNDS]}
                slots={slots}
                entryMap={entryMap}
                entryBySeed={entryBySeed}
                selectedSlot={selectedSlot}
                onSlotClick={setSelectedSlot}
              />
            </section>

            <section className="mt-6">
              <h2 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                Place Matches
              </h2>
              <BracketGrid
                rounds={[...PLACE_ROUNDS]}
                slots={slots}
                entryMap={entryMap}
                entryBySeed={entryBySeed}
                selectedSlot={selectedSlot}
                onSlotClick={setSelectedSlot}
              />
            </section>
          </>
        )}
      </div>

      {/* Right: Edit Panel */}
      <div className="w-[380px] flex-shrink-0 border-l border-slate-200 overflow-auto bg-slate-50">
        <EditPanel
          slot={selectedSlot}
          entries={entries}
          allMatches={matches}
          tournamentId={tournamentId}
          weightClassId={weightClassId}
          weightLabel={weightLabel}
          onSaved={handleSaved}
          onCleared={handleCleared}
          onCancel={() => setSelectedSlot(null)}
        />
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2 rounded-none shadow-none text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

// ─── Bracket Grid ──────────────────────────────────────────────────

function BracketGrid({
  rounds,
  slots,
  entryMap,
  entryBySeed,
  selectedSlot,
  onSlotClick,
}: {
  rounds: string[]
  slots: BracketSlot[]
  entryMap: Map<string, EntryRecord>
  entryBySeed: Map<number, EntryRecord>
  selectedSlot: BracketSlot | null
  onSlotClick: (slot: BracketSlot) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {rounds.map(round => {
        const roundSlots = slots.filter(s => s.round === round)
        const count = ROUND_MATCH_COUNT[round] ?? 0
        if (count === 0) return null

        return (
          <div key={round} className="flex-shrink-0" style={{ width: 210 }}>
            <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1 truncate">
              {ROUND_LABELS[round] ?? round}
              <span className="text-slate-300 ml-1">({roundSlots.length})</span>
            </div>
            <div className="space-y-1">
              {roundSlots.map(slot => (
                <MatchCard
                  key={`${slot.round}-${slot.position}`}
                  slot={slot}
                  entryMap={entryMap}
                  entryBySeed={entryBySeed}
                  isSelected={
                    selectedSlot?.round === slot.round &&
                    selectedSlot?.position === slot.position
                  }
                  onClick={() => onSlotClick(slot)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Match Card ────────────────────────────────────────────────────
// FIX 1: Show bout number on every card.
// FIX 2: Display wrestlers in fixed slot order (top seed position
//         on top, bottom seed position on bottom), with theoretical
//         seed placeholders when no match data exists.

const BORDER_COLORS: Record<string, string> = {
  complete: 'border-l-green-500',
  partial: 'border-l-yellow-500',
  broken: 'border-l-red-500',
  empty: 'border-l-slate-300',
}

/**
 * Returns the two theoretical seeds for a bracket slot, in fixed
 * top/bottom order. For R1 this is the seed matchup directly.
 * For later rounds, returns the top-half seeds first (lower position
 * in the upstream routing) then bottom-half seeds.
 */
function getSlotSeedPair(round: string, position: number): [number[], number[]] {
  if (round === 'R1') {
    const pair = R1_MATCHUPS[position]
    return pair ? [[pair[0]], [pair[1]]] : [[], []]
  }
  const sources = ROUTING[round]?.[position]
  if (!sources) return [[], []]
  // Source 0 = top line, Source 1 = bottom line
  const topSeeds = getTheoreticalSeeds(sources[0].round, sources[0].position)
  const botSeeds = getTheoreticalSeeds(sources[1].round, sources[1].position)
  return [topSeeds, botSeeds]
}

function MatchCard({
  slot,
  entryMap,
  entryBySeed,
  isSelected,
  onClick,
}: {
  slot: BracketSlot
  entryMap: Map<string, EntryRecord>
  entryBySeed: Map<number, EntryRecord>
  isSelected: boolean
  onClick: () => void
}) {
  const { match, status } = slot
  const boutLabel = match?.bout_number != null ? `#${match.bout_number}` : 'Bout —'
  const result = match ? formatResult(match) : ''

  // Determine top-line and bottom-line wrestlers in fixed slot order.
  const [topSeeds, botSeeds] = getSlotSeedPair(slot.round, slot.position)

  let topEntry: EntryRecord | null = null
  let botEntry: EntryRecord | null = null
  let topPlaceholder = topSeeds.length === 1 ? `(${topSeeds[0]})` : ''
  let botPlaceholder = botSeeds.length === 1 ? `(${botSeeds[0]})` : ''

  if (match?.winner_entry_id || match?.loser_entry_id) {
    const winner = match.winner_entry_id ? entryMap.get(match.winner_entry_id) ?? null : null
    const loser = match.loser_entry_id ? entryMap.get(match.loser_entry_id) ?? null : null

    // Place each wrestler in their correct slot position based on which
    // seed pool they belong to. The top-line wrestler is whoever's seed
    // is in the top seed pool; the bottom-line wrestler is in the bottom pool.
    const topSeedSet = new Set(topSeeds)
    const entries = [winner, loser].filter(Boolean) as EntryRecord[]

    for (const e of entries) {
      if (e.seed != null && topSeedSet.has(e.seed)) {
        topEntry = e
      } else {
        botEntry = e
      }
    }

    // If only one entry resolved and we couldn't determine position,
    // put it on top as a fallback
    if (!topEntry && !botEntry && entries.length > 0) {
      topEntry = entries[0]
    }
  } else if (status === 'empty') {
    // No match record — show theoretical seed placeholders
    if (topSeeds.length === 1) {
      topEntry = entryBySeed.get(topSeeds[0]) ?? null
      topPlaceholder = topEntry ? '' : `(${topSeeds[0]})`
    }
    if (botSeeds.length === 1) {
      botEntry = entryBySeed.get(botSeeds[0]) ?? null
      botPlaceholder = botEntry ? '' : `(${botSeeds[0]})`
    }
  }

  function formatEntryShort(e: EntryRecord | null, placeholder: string): string {
    if (e) return `${e.seed != null ? `(${e.seed}) ` : ''}${e.wrestlerLast}`
    if (placeholder) return `${placeholder} — awaiting`
    return '—'
  }

  const topText = formatEntryShort(topEntry, topPlaceholder)
  const botText = formatEntryShort(botEntry, botPlaceholder)
  const hasData = !!(match?.winner_entry_id || match?.loser_entry_id)

  // Bold follows winner_entry_id, not slot position
  const topIsWinner = hasData && topEntry != null && match?.winner_entry_id === topEntry.id
  const botIsWinner = hasData && botEntry != null && match?.winner_entry_id === botEntry.id

  return (
    <button
      onClick={onClick}
      tabIndex={0}
      className={`w-full text-left border-l-4 ${BORDER_COLORS[status]}
        bg-white rounded-none shadow-none px-2 py-1 text-[11px] leading-tight
        hover:bg-blue-50 transition-colors group cursor-pointer
        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
    >
      {/* Top line + bout number */}
      <div className="flex justify-between items-baseline gap-1">
        <span className={topIsWinner ? 'font-semibold text-slate-900 truncate'
          : hasData && topEntry ? 'text-slate-500 truncate'
          : 'text-slate-400 truncate'}>
          {topText}
        </span>
        <span className="text-[9px] text-slate-300 whitespace-nowrap flex-shrink-0">
          {boutLabel}
        </span>
      </div>
      {/* Bottom line + result */}
      <div className="flex justify-between items-baseline gap-1">
        <span className={botIsWinner ? 'font-semibold text-slate-900 truncate'
          : hasData && botEntry ? 'text-slate-500 truncate'
          : 'text-slate-300 truncate'}>
          {botText}
        </span>
        <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
          {result || <span className="opacity-0 group-hover:opacity-100">✏️</span>}
        </span>
      </div>
    </button>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────

function getQuickStatus(m: MatchRecord) {
  if (!m.winner_entry_id || !m.loser_entry_id) return 'broken' as const
  if (!m.win_type) return 'partial' as const
  return 'complete' as const
}
