'use client'

import { Fragment, useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { RATING_SHORT } from '@/lib/rating'

// ── Types ─────────────────────────────────────────────────────────────────────

type RecentMatch = {
  date: string
  is_winner: boolean
  opp_hammer: number
  opp_name: string | null
  source: string
  result_type: string | null
  fall_time_seconds: number | null
}

type OppRef = {
  opp_name: string
  opp_hammer: number
  result_type: string | null
  fall_time_seconds: number | null
} | null

type BestTournament = { tournament_name: string; place: number | null } | null

export type PoolWrestler = {
  pool_rank: number
  in_target: boolean
  wrestler_id: string
  first_name: string
  last_name: string
  school_name: string
  school_id: number | null
  grade: string | null
  hammer_score: number
  postseason_adjusted: number
  tournament_score: number
  match_score: number
  match_count: number
  wins: number
  losses: number
  best_win: OppRef
  notable_loss: OppRef
  worst_loss: OppRef
  recent: RecentMatch[]
  best_tournament: BestTournament
}

type SavedRanking = { wrestler_id: string; manual_rank: number; hammer_score_snapshot: number }

type Props = {
  gender: 'M' | 'F'
  weight: number
  stage: string
  entity: string
  entityLabel: string
  season: string
  weekId: number | null
  onSaved?: () => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GRADE_LABELS: Record<string, string> = { Fr: 'Fr', So: 'So', Jr: 'Jr', Sr: 'Sr' }
const COL_COUNT = 10  // includes drag handle column

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLACE_SUFFIX: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
function placeSuffix(n: number) { return PLACE_SUFFIX[n] ?? 'th' }

function formatResult(result_type: string | null, fall_time_seconds: number | null): string {
  if (!result_type) return ''
  // Normalize to readable label
  const label =
    result_type === 'Fall' || result_type === 'FALL'   ? 'Fall'
    : result_type === 'MD'                             ? 'MD'
    : result_type === 'TF' || result_type === 'TF-1.5' || result_type === 'TF-2' ? 'TF'
    : result_type === 'Dec' || result_type === 'DEC'   ? 'Dec'
    : result_type === 'SV-1'                           ? 'SV'
    : result_type === 'UTB'                            ? 'UTB'
    : result_type

  if (label === 'Fall' && fall_time_seconds != null) {
    const m = Math.floor(fall_time_seconds / 60)
    const s = fall_time_seconds % 60
    return `Fall (${m}:${String(s).padStart(2, '0')})`
  }
  return label
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HammerBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-14 h-1 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full bg-slate-600 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums font-mono text-xs font-semibold w-10">{score.toFixed(1)}</span>
    </div>
  )
}

function FormDots({ recent }: { recent: RecentMatch[] }) {
  if (!recent.length) return <span className="text-slate-300 text-xs">—</span>
  return (
    <div className="flex gap-0.5 items-center">
      {recent.map((r, i) => {
        const res = formatResult(r.result_type, r.fall_time_seconds)
        const tip = `${r.is_winner ? 'W' : 'L'}${res ? ` (${res})` : ''} vs ${r.opp_name ?? 'opp'} (${r.opp_hammer.toFixed(1)}) · ${r.date}`
        return (
          <span
            key={i}
            title={tip}
            className={`inline-block w-2 h-2 rounded-full ${r.is_winner ? 'bg-emerald-500' : 'bg-red-400'}`}
          />
        )
      })}
    </div>
  )
}

function OppCell({ oppRef, label, labelColor }: { oppRef: OppRef; label: string; labelColor: string }) {
  if (!oppRef) return <span className="text-slate-300 text-xs">—</span>
  const res = formatResult(oppRef.result_type, oppRef.fall_time_seconds)
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-700 truncate leading-tight">{oppRef.opp_name}</p>
      <p className="text-xs text-slate-400 tabular-nums">
        {oppRef.opp_hammer.toFixed(1)}
        {res && <span className="ml-1 text-slate-500">{res}</span>}
      </p>
    </div>
  )
}

function ExpandedRow({ w, colSpan }: { w: PoolWrestler; colSpan: number }) {
  return (
    <tr className="bg-slate-50/70 border-b border-slate-200">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="grid grid-cols-4 gap-6 text-xs">

          {/* Score Breakdown */}
          <div>
            <p className="font-semibold text-slate-500 uppercase tracking-wide mb-2 text-[10px]">Score Breakdown</p>
            <div className="space-y-1">
              {[
                { label: 'Postseason', val: w.postseason_adjusted },
                { label: 'Tournament', val: w.tournament_score },
                { label: 'Match',      val: w.match_score },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-400">{label}</span>
                  <span className="tabular-nums font-mono text-slate-700">{val.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="font-semibold text-slate-600">Total</span>
                <span className="tabular-nums font-mono font-semibold text-slate-900">{w.hammer_score.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Key Matches */}
          <div>
            <p className="font-semibold text-slate-500 uppercase tracking-wide mb-2 text-[10px]">Key Matches</p>
            <div className="space-y-1.5">
              {w.best_win && (
                <div className="flex gap-2">
                  <span className="text-emerald-600 font-semibold shrink-0 w-12">Best W</span>
                  <span className="text-slate-700 truncate">{w.best_win.opp_name}</span>
                  <span className="text-slate-400 tabular-nums ml-auto shrink-0">{w.best_win.opp_hammer.toFixed(1)}</span>
                  {w.best_win.result_type && (
                    <span className="text-slate-500 shrink-0">{formatResult(w.best_win.result_type, w.best_win.fall_time_seconds)}</span>
                  )}
                </div>
              )}
              {w.notable_loss && (
                <div className="flex gap-2">
                  <span className="text-amber-600 font-semibold shrink-0 w-12">Top L</span>
                  <span className="text-slate-700 truncate">{w.notable_loss.opp_name}</span>
                  <span className="text-slate-400 tabular-nums ml-auto shrink-0">{w.notable_loss.opp_hammer.toFixed(1)}</span>
                  {w.notable_loss.result_type && (
                    <span className="text-slate-500 shrink-0">{formatResult(w.notable_loss.result_type, w.notable_loss.fall_time_seconds)}</span>
                  )}
                </div>
              )}
              {w.worst_loss && w.losses > 0 && (
                <div className="flex gap-2">
                  <span className="text-red-500 font-semibold shrink-0 w-12">Worst L</span>
                  <span className="text-slate-700 truncate">{w.worst_loss.opp_name}</span>
                  <span className="text-slate-400 tabular-nums ml-auto shrink-0">{w.worst_loss.opp_hammer.toFixed(1)}</span>
                  {w.worst_loss.result_type && (
                    <span className="text-slate-500 shrink-0">{formatResult(w.worst_loss.result_type, w.worst_loss.fall_time_seconds)}</span>
                  )}
                </div>
              )}
              {!w.best_win && !w.notable_loss && (
                <span className="text-slate-300">No scored matches yet</span>
              )}
            </div>
          </div>

          {/* Best Tournament */}
          <div>
            <p className="font-semibold text-slate-500 uppercase tracking-wide mb-2 text-[10px]">Best Tournament</p>
            {w.best_tournament ? (
              <div className="space-y-1">
                <p className="text-slate-700 font-medium leading-snug">{w.best_tournament.tournament_name}</p>
                {w.best_tournament.place != null ? (
                  <p className="text-slate-500">
                    <span className="font-semibold text-slate-800">{w.best_tournament.place}</span>
                    <span className="align-super text-[9px]">{placeSuffix(w.best_tournament.place)}</span>
                    <span className="text-slate-400 ml-1">place</span>
                  </p>
                ) : (
                  <p className="text-slate-400 text-[11px]">No placement recorded</p>
                )}
              </div>
            ) : (
              <span className="text-slate-300">No tournament data</span>
            )}
          </div>

          {/* Recent Form */}
          <div>
            <p className="font-semibold text-slate-500 uppercase tracking-wide mb-2 text-[10px]">
              Last 5 Matches
            </p>
            <div className="space-y-1">
              {w.recent.map((r, i) => {
                const res = formatResult(r.result_type, r.fall_time_seconds)
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`font-semibold w-3 shrink-0 ${r.is_winner ? 'text-emerald-600' : 'text-red-500'}`}>
                      {r.is_winner ? 'W' : 'L'}
                    </span>
                    {res && <span className="text-slate-500 shrink-0">{res}</span>}
                    <span className="text-slate-600 truncate flex-1">{r.opp_name ?? '—'}</span>
                    <span className="text-slate-400 tabular-nums shrink-0">{r.opp_hammer.toFixed(1)}</span>
                  </div>
                )
              })}
              {!w.recent.length && <span className="text-slate-300">No recent matches</span>}
            </div>
          </div>

        </div>
      </td>
    </tr>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function WorkbenchTable({
  gender, weight, stage, entity, entityLabel, season, weekId, onSaved,
}: Props) {
  const [pool,         setPool]        = useState<PoolWrestler[]>([])
  const [targetCount,  setTargetCount] = useState(0)
  const [poolLoading,  setPoolLoading] = useState(true)
  const [poolError,    setPoolError]   = useState<string | null>(null)

  const [savedOrder,   setSavedOrder]  = useState<SavedRanking[]>([])
  const [isComplete,   setIsComplete]  = useState(false)
  const [completedAt,  setCompletedAt] = useState<string | null>(null)
  const [completedBy,  setCompletedBy] = useState<string | null>(null)
  const [saveLoading,  setSaveLoading] = useState(true)

  const [rankedIds,  setRankedIds]  = useState<string[]>([])
  const [editMode,   setEditMode]   = useState(false)
  const [dragId,     setDragId]     = useState<string | null>(null)
  const [dragOverIdx,setDragOverIdx]= useState<number | null>(null)
  const dragCounter                 = useRef(0)
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set())
  const [saving,     setSaving]     = useState(false)
  const [flash,      setFlash]      = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  // ── Load pool ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    setPoolLoading(true)
    setPoolError(null)
    setExpanded(new Set())
    setPool([])
    fetch(
      `/api/admin/individual-rankings/pool?gender=${gender}&weight=${weight}&stage=${stage}&entity=${encodeURIComponent(entity)}&season=${encodeURIComponent(season)}`
    )
      .then(r => r.json())
      .then(d => {
        if (d.error) { setPoolError(d.error); return }
        setPool(d.wrestlers ?? [])
        setTargetCount(d.target_count ?? 0)
      })
      .catch(() => setPoolError('Failed to load pool'))
      .finally(() => setPoolLoading(false))
  }, [gender, weight, stage, entity, season])

  // ── Load saved rankings ───────────────────────────────────────────────────────

  const loadSaved = useCallback(() => {
    if (!weekId) { setSaveLoading(false); return }
    setSaveLoading(true)
    fetch(
      `/api/admin/individual-rankings/save?week_id=${weekId}&gender=${gender}&weight_class=${weight}&stage=${stage}&stage_entity=${encodeURIComponent(entity)}`
    )
      .then(r => r.json())
      .then(d => {
        setSavedOrder(d.rankings ?? [])
        setIsComplete(!!d.is_complete)
        setCompletedAt(d.completed_at ?? null)
        setCompletedBy(d.completed_by ?? null)
      })
      .catch(() => {})
      .finally(() => setSaveLoading(false))
  }, [weekId, gender, weight, stage, entity])

  useEffect(() => { loadSaved() }, [loadSaved])

  // ── Merge pool + saved rankings → working rankedIds ─────────────────────────

  useEffect(() => {
    if (poolLoading || saveLoading) return
    if (!pool.length) { setRankedIds([]); return }
    if (savedOrder.length > 0) {
      const savedIds   = savedOrder.slice().sort((a, b) => a.manual_rank - b.manual_rank).map(r => r.wrestler_id)
      const allPoolIds = pool.map(w => w.wrestler_id)
      const remaining  = allPoolIds.filter(id => !savedIds.includes(id))
      setRankedIds([...savedIds, ...remaining])
    } else {
      setRankedIds(pool.map(w => w.wrestler_id))
    }
    setEditMode(false)
  }, [pool, savedOrder, poolLoading, saveLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag-to-reorder — ALL rows (can cross the cut line) ──────────────────────

  function handleDragStart(id: string) { setDragId(id) }

  function handleDragEnter(idx: number) {
    dragCounter.current++
    setDragOverIdx(idx)
  }

  function handleDragLeave() {
    dragCounter.current--
    if (dragCounter.current === 0) setDragOverIdx(null)
  }

  function handleDrop(targetIdx: number) {
    dragCounter.current = 0
    setDragOverIdx(null)
    if (!dragId) return
    const fromIdx = rankedIds.indexOf(dragId)
    if (fromIdx === targetIdx || fromIdx === -1) { setDragId(null); return }
    const next = [...rankedIds]
    next.splice(fromIdx, 1)
    next.splice(targetIdx, 0, dragId)
    setRankedIds(next)
    setDragId(null)
  }

  function handleDragEnd() {
    setDragId(null)
    dragCounter.current = 0
    setDragOverIdx(null)
  }

  // ── Promote / demote buttons ──────────────────────────────────────────────────

  function promote(id: string) {
    const fromIdx = rankedIds.indexOf(id)
    if (fromIdx < targetCount) return
    const next = [...rankedIds]
    next.splice(fromIdx, 1)
    next.splice(targetCount - 1, 0, id)
    setRankedIds(next)
  }

  function demote(id: string) {
    const fromIdx = rankedIds.indexOf(id)
    if (fromIdx >= targetCount) return
    const next = [...rankedIds]
    next.splice(fromIdx, 1)
    next.splice(targetCount, 0, id)
    setRankedIds(next)
  }

  // ── Save / unlock ──────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!weekId) return
    setSaving(true)
    setFlash(null)
    try {
      const byId = new Map(pool.map(w => [w.wrestler_id, w]))
      const rankedWrestlers = rankedIds.slice(0, targetCount).map(id => {
        const w = byId.get(id)
        return {
          wrestler_id:           id,
          school_id:             w?.school_id ?? null,
          hammer_score_snapshot: w?.hammer_score ?? 0,
        }
      })
      const res = await fetch('/api/admin/individual-rankings/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ week_id: weekId, gender, weight_class: weight, stage, stage_entity: entity, ranked_wrestlers: rankedWrestlers }),
      })
      const d = await res.json()
      if (d.error) { setFlash({ kind: 'err', msg: d.error }); return }
      setFlash({ kind: 'ok', msg: `Saved ${d.ranked} ranked wrestlers` })
      setEditMode(false)
      await loadSaved()
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  async function handleUnlock() {
    if (!weekId) return
    await fetch('/api/admin/individual-rankings/save', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ week_id: weekId, gender, weight_class: weight, stage, stage_entity: entity }),
    })
    setIsComplete(false)
    setCompletedAt(null)
    setCompletedBy(null)
    setEditMode(true)
    onSaved?.()
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Derived ───────────────────────────────────────────────────────────────────

  const poolById  = new Map(pool.map(w => [w.wrestler_id, w]))
  const maxHammer = pool[0]?.hammer_score ?? 1
  const stageLabel = stage === 'district' ? 'District' : stage === 'region' ? 'Region' : stage === 'section' ? 'Section' : 'State'

  const advLabel = stage === 'district'
    ? `Top ${targetCount} advance to Regions`
    : stage === 'region'
      ? `Top ${targetCount} advance to Sections`
      : stage === 'section'
        ? `Top ${targetCount} advance to State`
        : `Top ${targetCount} final ranking`

  const loading     = poolLoading || saveLoading
  const canEdit     = !isComplete || editMode
  const allExpanded = pool.length > 0 && expanded.size === pool.length

  // ── Render states ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="border border-slate-200 rounded p-8 text-center">
        <p className="text-sm text-slate-400">Loading {weight} lb {stageLabel} pool…</p>
      </div>
    )
  }

  if (poolError) {
    return (
      <div className="border border-red-200 bg-red-50 rounded p-4 text-sm text-red-700">
        Error: {poolError}
      </div>
    )
  }

  if (!pool.length) {
    return (
      <div className="border border-slate-200 rounded p-8 text-center space-y-1">
        <p className="text-sm text-slate-600 font-medium">{weight} lb · {entityLabel}</p>
        <p className="text-xs text-slate-400">No wrestlers found in {RATING_SHORT} for this {stageLabel.toLowerCase()}.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-800">{weight} lb · {entityLabel}</span>
          <span className="text-xs text-slate-400">{pool.length} in pool · {advLabel}</span>
          {isComplete && !editMode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              ✓ Saved
              {completedBy && <span className="font-normal opacity-70">by {completedBy.split('@')[0]}</span>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(allExpanded ? new Set() : new Set(pool.map(w => w.wrestler_id)))}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </button>
          {isComplete && !editMode ? (
            <button onClick={() => setEditMode(true)} className="px-3 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-50">
              Re-edit
            </button>
          ) : (
            <>
              {isComplete && (
                <button
                  onClick={() => {
                    setEditMode(false)
                    const saved = savedOrder.slice().sort((a,b)=>a.manual_rank-b.manual_rank).map(r=>r.wrestler_id)
                    const rest  = pool.map(w=>w.wrestler_id).filter(id=>!savedOrder.some(r=>r.wrestler_id===id))
                    setRankedIds([...saved, ...rest])
                  }}
                  className="px-3 py-1 text-xs border border-slate-300 text-slate-500 rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
              {weekId ? (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : isComplete ? 'Update Rankings' : 'Lock Rankings'}
                </button>
              ) : (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                  Run Season 3 seed to enable saving
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Flash ─────────────────────────────────────────────────────────── */}
      {flash && (
        <div className={`rounded px-3 py-2 text-xs flex items-center justify-between ${
          flash.kind === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {flash.msg}
          <button onClick={() => setFlash(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {canEdit && (
        <p className="text-xs text-slate-400 px-0.5">
          Drag any row to reorder — including across the cut line. Use ↑ ↓ to promote or demote a wrestler.
        </p>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="border border-slate-200 rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {canEdit && <th className="w-6 px-2 py-1" />}
              <th className="px-3 py-1 text-left text-xs font-semibold text-slate-500 w-8">#</th>
              <th className="px-3 py-1 text-left text-xs font-semibold text-slate-500">Wrestler</th>
              <th className="px-3 py-1 text-left text-xs font-semibold text-slate-500">School</th>
              <th className="px-3 py-1 text-center text-xs font-semibold text-slate-500 w-8">Gr</th>
              <th className="px-3 py-1 text-center text-xs font-semibold text-slate-500 w-12">W‑L</th>
              <th className="px-3 py-1 text-right text-xs font-semibold text-slate-500 w-36">{RATING_SHORT}</th>
              <th className="px-3 py-1 text-left text-xs font-semibold text-slate-500 w-36">Best Win</th>
              <th className="px-3 py-1 text-left text-xs font-semibold text-slate-500 w-36">Notable L</th>
              <th className="px-3 py-1 text-left text-xs font-semibold text-slate-500 w-16">Last 5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rankedIds.map((id, idx) => {
              const w = poolById.get(id)
              if (!w) return null
              const isExpanded  = expanded.has(id)
              const isRanked    = idx < targetCount
              const isCutLine   = idx === targetCount
              const isDragging  = dragId === id
              const isDragOver  = dragOverIdx === idx && canEdit
              const colCount    = canEdit ? COL_COUNT : COL_COUNT - 1

              return (
                <Fragment key={id}>
                  {/* Cut line */}
                  {isCutLine && (
                    <tr>
                      <td
                        colSpan={colCount}
                        className="px-3 py-0.5 text-xs text-slate-400 text-center border-y border-dashed border-slate-300 bg-slate-50 select-none"
                      >
                        ── {pool.length - targetCount} below cut line · not advancing ──
                      </td>
                    </tr>
                  )}

                  {/* Main row */}
                  <tr
                    draggable={canEdit}
                    onDragStart={canEdit ? () => handleDragStart(id) : undefined}
                    onDragEnter={canEdit ? () => handleDragEnter(idx) : undefined}
                    onDragLeave={canEdit ? handleDragLeave : undefined}
                    onDragOver={canEdit ? e => e.preventDefault() : undefined}
                    onDrop={canEdit ? () => handleDrop(idx) : undefined}
                    onDragEnd={canEdit ? handleDragEnd : undefined}
                    onClick={() => toggleExpand(id)}
                    className={[
                      'cursor-pointer transition-colors',
                      isDragOver   ? 'bg-blue-50 border-t-2 border-blue-400' : '',
                      isDragging   ? 'opacity-40' : '',
                      isExpanded   ? 'bg-slate-50' : 'hover:bg-slate-50/60',
                      !isRanked    ? 'opacity-55' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {/* Drag handle */}
                    {canEdit && (
                      <td
                        className="px-2 py-1 text-slate-300 select-none cursor-grab active:cursor-grabbing"
                        onClick={e => e.stopPropagation()}
                      >
                        ⠿
                      </td>
                    )}

                    {/* Rank number */}
                    <td className="px-3 py-1 text-xs text-slate-400 tabular-nums font-mono">
                      {isRanked ? idx + 1 : ''}
                    </td>

                    {/* Name */}
                    <td className="px-3 py-1">
                      <Link
                        href={`/wrestler/${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs font-medium text-slate-800 hover:text-blue-600"
                      >
                        {w.first_name} {w.last_name}
                      </Link>
                    </td>

                    {/* School */}
                    <td className="px-3 py-1 text-xs text-slate-500 truncate max-w-[9rem]">{w.school_name || '—'}</td>

                    {/* Grade */}
                    <td className="px-3 py-1 text-center text-xs text-slate-400">
                      {w.grade ? (GRADE_LABELS[w.grade] ?? w.grade) : '—'}
                    </td>

                    {/* W-L */}
                    <td className="px-3 py-1 text-center text-xs tabular-nums whitespace-nowrap">
                      <span className="text-emerald-700 font-medium">{w.wins}</span>
                      <span className="text-slate-300 mx-0.5">-</span>
                      <span className="text-red-500">{w.losses}</span>
                    </td>

                    {/* Hammer */}
                    <td className="px-3 py-1"><HammerBar score={w.hammer_score} max={maxHammer} /></td>

                    {/* Best win */}
                    <td className="px-3 py-1"><OppCell oppRef={w.best_win} label="Best W" labelColor="emerald" /></td>

                    {/* Notable loss */}
                    <td className="px-3 py-1"><OppCell oppRef={w.notable_loss} label="Notable L" labelColor="amber" /></td>

                    {/* Last 5 */}
                    <td className="px-3 py-1">
                      <div className="flex items-center gap-1.5">
                        <FormDots recent={w.recent} />
                        {canEdit && (
                          <div className="flex gap-0.5 ml-1" onClick={e => e.stopPropagation()}>
                            {!isRanked && (
                              <button
                                onClick={() => promote(id)}
                                title="Promote into ranked zone"
                                className="text-slate-400 hover:text-emerald-600 text-xs leading-none px-0.5"
                              >
                                ↑
                              </button>
                            )}
                            {isRanked && (
                              <button
                                onClick={() => demote(id)}
                                title="Demote out of ranked zone"
                                className="text-slate-400 hover:text-red-500 text-xs leading-none px-0.5"
                              >
                                ↓
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && <ExpandedRow w={w} colSpan={colCount} />}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Bottom save bar ──────────────────────────────────────────────── */}
      {canEdit && weekId && (
        <div className="flex justify-between items-center pt-1">
          {isComplete && (
            <button onClick={handleUnlock} className="text-xs text-slate-400 hover:text-red-600 underline">
              Unlock &amp; clear completion
            </button>
          )}
          <div className="ml-auto flex gap-2 items-center">
            {flash?.kind === 'ok' && <span className="text-xs text-emerald-600">{flash.msg}</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-1.5 text-sm font-semibold bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isComplete ? 'Update Rankings' : 'Lock Rankings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
