'use client'

import { useState, useEffect, useMemo } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import type { BracketSlot, EntryRecord, MatchRecord } from './types'
import {
  ROUND_LABELS,
  WIN_TYPE_OPTIONS,
  WIN_TYPE_LABELS,
  SCORED_WIN_TYPES,
  TIMED_WIN_TYPES,
  formatTime,
  parseTime,
  formatEntryLabel,
  getEligibleEntryIds,
  groupMatchesByRound,
} from './bracketRouting'

interface EditPanelProps {
  slot: BracketSlot | null
  entries: EntryRecord[]
  allMatches: MatchRecord[]
  tournamentId: number
  weightClassId: number
  weightLabel: string
  onSaved: (updated: MatchRecord) => void
  onCleared: (matchId: string) => void
  onCancel: () => void
}

export function EditPanel({
  slot,
  entries,
  allMatches,
  tournamentId,
  weightClassId,
  weightLabel,
  onSaved,
  onCleared,
  onCancel,
}: EditPanelProps) {
  const [winnerId, setWinnerId] = useState<string>('')
  const [loserId, setLoserId] = useState<string>('')
  const [winType, setWinType] = useState<string>('')
  const [winnerScore, setWinnerScore] = useState<string>('')
  const [loserScore, setLoserScore] = useState<string>('')
  const [timeStr, setTimeStr] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')

  // Build entry lookup
  const entryMap = useMemo(() => {
    const m = new Map<string, EntryRecord>()
    for (const e of entries) m.set(e.id, e)
    return m
  }, [entries])

  // Build seed lookup for eligibility
  const entryBySeed = useMemo(() => {
    const m = new Map<number, EntryRecord>()
    for (const e of entries) {
      if (e.seed != null) m.set(e.seed, e)
    }
    return m
  }, [entries])

  // Eligible entries for this slot — strictly capped by theoretical seed pool
  const eligible = useMemo(() => {
    if (!slot) return []
    const byRound = groupMatchesByRound(allMatches)
    const ids = getEligibleEntryIds(slot.round, slot.position, byRound, entryBySeed)
    return ids.map(id => entryMap.get(id)).filter(Boolean) as EntryRecord[]
  }, [slot, allMatches, entryMap, entryBySeed])

  // Reset form when slot changes
  useEffect(() => {
    if (!slot?.match) {
      setWinnerId('')
      setLoserId('')
      setWinType('')
      setWinnerScore('')
      setLoserScore('')
      setTimeStr('')
      return
    }
    const m = slot.match
    setWinnerId(m.winner_entry_id ?? '')
    setLoserId(m.loser_entry_id ?? '')
    setWinType(m.win_type ?? '')
    setWinnerScore(m.winner_score != null ? String(m.winner_score) : '')
    setLoserScore(m.loser_score != null ? String(m.loser_score) : '')
    setTimeStr(m.fall_time_seconds != null ? formatTime(m.fall_time_seconds) : '')
  }, [slot])

  // Auto-set loser when exactly 2 eligible entries and winner is selected
  useEffect(() => {
    if (eligible.length === 2 && winnerId) {
      const other = eligible.find(e => e.id !== winnerId)
      if (other) setLoserId(other.id)
    }
  }, [winnerId, eligible])

  const showScores = SCORED_WIN_TYPES.has(winType)
  const showTime = TIMED_WIN_TYPES.has(winType) || winType === 'FALL'

  // ── Empty state ──────────────────────────────────────────────────
  if (!slot) {
    return (
      <div className="p-6 text-center text-slate-400 space-y-3">
        <p className="text-lg font-medium">Select any match to edit</p>
        <div className="text-xs space-y-1">
          <p><span className="inline-block w-3 h-3 bg-green-500 rounded-sm mr-1" /> Complete</p>
          <p><span className="inline-block w-3 h-3 bg-yellow-500 rounded-sm mr-1" /> Missing data</p>
          <p><span className="inline-block w-3 h-3 bg-red-500 rounded-sm mr-1" /> Broken entry</p>
          <p><span className="inline-block w-3 h-3 bg-slate-300 rounded-sm mr-1" /> Empty</p>
        </div>
      </div>
    )
  }

  const boutNumber = slot.match?.bout_number
  const bracketSide = slot.match?.bracket_side

  // ── Build score_raw for save ─────────────────────────────────────
  function buildScoreRaw(): string | null {
    if (winType === 'FALL') return null
    if (showScores && winnerScore && loserScore) {
      return `${winnerScore}-${loserScore}`
    }
    return null
  }

  // ── Save handler (FIX 1: uses bout_number as slot identity) ─────
  async function handleSave() {
    if (!winnerId) {
      setError('Select a winner')
      return
    }
    setSaving(true)
    setError('')

    const fallSeconds = showTime ? parseTime(timeStr) : null
    const payload = {
      tournament_id: tournamentId,
      weight_class_id: weightClassId,
      round: slot!.round,
      bracket_side: bracketSide ?? null,
      winner_entry_id: winnerId || null,
      loser_entry_id: loserId || null,
      win_type: winType || null,
      winner_score: showScores && winnerScore ? parseInt(winnerScore) : null,
      loser_score: showScores && loserScore ? parseInt(loserScore) : null,
      fall_time_seconds: fallSeconds,
      score_raw: buildScoreRaw(),
    }

    const supabase = createSupabaseBrowser()

    if (boutNumber != null) {
      // Primary path: use bout_number to find or create the match record.
      // Query for existing match by tournament_id + bout_number.
      const { data: existing } = await supabase
        .from('matches')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('bout_number', boutNumber)
        .maybeSingle()

      if (existing) {
        // UPDATE by bout_number-identified row
        const { data, error: err } = await supabase
          .from('matches')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single()

        if (err) { setError(err.message); setSaving(false); return }
        onSaved(data as MatchRecord)
      } else {
        // INSERT with bout_number
        const { data, error: err } = await supabase
          .from('matches')
          .insert({ ...payload, bout_number: boutNumber })
          .select()
          .single()

        if (err) { setError(err.message); setSaving(false); return }
        onSaved(data as MatchRecord)
      }
    } else if (slot!.match) {
      // Fallback: match exists but has no bout_number (rare 2% case).
      // Update by match ID.
      const { data, error: err } = await supabase
        .from('matches')
        .update(payload)
        .eq('id', slot!.match.id)
        .select()
        .single()

      if (err) { setError(err.message); setSaving(false); return }
      onSaved(data as MatchRecord)
    } else {
      // No bout_number and no existing match — insert without bout_number
      const { data, error: err } = await supabase
        .from('matches')
        .insert(payload)
        .select()
        .single()

      if (err) { setError(err.message); setSaving(false); return }
      onSaved(data as MatchRecord)
    }
    setSaving(false)
  }

  // ── Clear handler ────────────────────────────────────────────────
  async function handleClear() {
    if (!slot?.match) return
    if (!window.confirm('Clear all match data? This sets winner, loser, score, and result to null.')) {
      return
    }
    setSaving(true)
    setError('')

    const supabase = createSupabaseBrowser()
    const { data, error: err } = await supabase
      .from('matches')
      .update({
        winner_entry_id: null,
        loser_entry_id: null,
        win_type: null,
        winner_score: null,
        loser_score: null,
        fall_time_seconds: null,
        score_raw: null,
      })
      .eq('id', slot.match.id)
      .select()
      .single()

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    onCleared(data.id)
    setSaving(false)
  }

  // ── Wrestler dropdown — strictly capped, no "All entries" fallback ──
  function renderSelect(
    label: string,
    value: string,
    onChange: (v: string) => void,
    id: string
  ) {
    return (
      <div>
        <label htmlFor={id} className="block text-xs font-medium text-slate-600 mb-1">
          {label}
        </label>
        <select
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">— Select —</option>
          {eligible.map(e => (
            <option key={e.id} value={e.id}>
              {formatEntryLabel(e)}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-slate-400 mt-0.5">{eligible.length} eligible</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header — FIX 1: show bout number, FIX 2: show bracket side */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          {ROUND_LABELS[slot.round] ?? slot.round}
          {bracketSide && <span className="font-normal text-slate-500"> &middot; {bracketSide}</span>}
          {boutNumber != null && <span className="font-normal text-slate-500"> &middot; Bout {boutNumber}</span>}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">{weightLabel}</p>
        {slot.match && (
          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
            {slot.match.id}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs rounded px-3 py-2">{error}</div>
      )}

      {/* Winner */}
      {renderSelect('Winner', winnerId, setWinnerId, 'winner-select')}

      {/* Win Type */}
      <div>
        <label htmlFor="wintype" className="block text-xs font-medium text-slate-600 mb-1">
          Result
        </label>
        <select
          id="wintype"
          value={winType}
          onChange={e => setWinType(e.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">— Select —</option>
          {WIN_TYPE_OPTIONS.map(wt => (
            <option key={wt} value={wt}>
              {wt} — {WIN_TYPE_LABELS[wt]}
            </option>
          ))}
        </select>
      </div>

      {/* Scores (conditional) */}
      {showScores && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label htmlFor="wscore" className="block text-xs font-medium text-slate-600 mb-1">
              Winner Score
            </label>
            <input
              id="wscore"
              type="number"
              min={0}
              value={winnerScore}
              onChange={e => setWinnerScore(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <span className="pb-2 text-slate-400">–</span>
          <div className="flex-1">
            <label htmlFor="lscore" className="block text-xs font-medium text-slate-600 mb-1">
              Loser Score
            </label>
            <input
              id="lscore"
              type="number"
              min={0}
              value={loserScore}
              onChange={e => setLoserScore(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      )}

      {/* Time (conditional) */}
      {showTime && (
        <div>
          <label htmlFor="time" className="block text-xs font-medium text-slate-600 mb-1">
            Time (M:SS)
          </label>
          <input
            id="time"
            type="text"
            placeholder="0:00"
            value={timeStr}
            onChange={e => setTimeStr(e.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      )}

      {/* Loser */}
      {renderSelect('Loser', loserId, setLoserId, 'loser-select')}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-slate-900 text-white rounded py-2 text-sm font-semibold
                     hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {slot.match && (
          <button
            onClick={handleClear}
            disabled={saving}
            className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded
                       hover:bg-red-50 disabled:opacity-50"
          >
            Clear
          </button>
        )}
        <button
          onClick={onCancel}
          className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
