'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import type { InSeasonTournament, TournamentBoutRecord } from '../bracket/types'
import { InSeasonEditPanel } from '../bracket/InSeasonEditPanel'

// ── Types ─────────────────────────────────────────────────────────────────────

type AugmentedBout = TournamentBoutRecord & {
  w1_registered_school_id: number | null
  w2_registered_school_id: number | null
}

type FilterKey = 'all' | 'no_nj_id' | 'school_mismatch' | 'unk_round' | 'stub_name'

// ── Flags ─────────────────────────────────────────────────────────────────────

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'All',
  no_nj_id: 'No NJ ID',
  school_mismatch: 'School Mismatch',
  unk_round: 'UNK Round',
  stub_name: 'Stub Name',
}

const FLAG_BADGE: Record<FilterKey, string> = {
  all: '',
  no_nj_id: 'bg-amber-100 text-amber-800',
  school_mismatch: 'bg-red-100 text-red-800',
  unk_round: 'bg-orange-100 text-orange-800',
  stub_name: 'bg-violet-100 text-violet-800',
}

function isStub(name: string): boolean {
  // "J. Barron" or "M. Smith" — initial + period, common import artifact
  return /^[A-Z]\.\s/.test(name)
}

function getBoutFlags(b: AugmentedBout): FilterKey[] {
  const flags: FilterKey[] = []

  // NJ school matched but no wrestler link — should have resolved
  if (
    (b.nj_wrestler1_id === null && b.wrestler1_school_id !== null) ||
    (b.nj_wrestler2_id === null && b.wrestler2_school_id !== null)
  ) flags.push('no_nj_id')

  // Linked wrestler's registered school differs from bout's recorded school
  if (
    (b.w1_registered_school_id !== null &&
     b.wrestler1_school_id !== null &&
     b.w1_registered_school_id !== b.wrestler1_school_id) ||
    (b.w2_registered_school_id !== null &&
     b.wrestler2_school_id !== null &&
     b.w2_registered_school_id !== b.wrestler2_school_id)
  ) flags.push('school_mismatch')

  if (b.round === 'UNK') flags.push('unk_round')

  if (isStub(b.wrestler1_name_raw) || isStub(b.wrestler2_name_raw)) {
    flags.push('stub_name')
  }

  return flags
}

// ── Round ordering (matches BracketEditor) ────────────────────────────────────

const ROUND_ORDER: Record<string, number> = {
  R1: 1, R2: 2, R3: 3, QF: 4, SF: 5, F: 6,
  C1: 11, C2: 12, C3: 13, C4: 14, CSF: 15, C3rd: 16,
  '3rd_Place': 20, '5th_Place': 21, '7th_Place': 22,
  PL: 30, UNK: 99,
}

// ── Main component ────────────────────────────────────────────────────────────

export function BoutAuditClient({
  tournaments,
}: {
  tournaments: InSeasonTournament[]
}) {
  const [tid, setTid]                         = useState(tournaments[0]?.id ?? '')
  const [bouts, setBouts]                     = useState<AugmentedBout[]>([])
  const [loading, setLoading]                 = useState(false)
  const [loadError, setLoadError]             = useState('')
  const [filter, setFilter]                   = useState<FilterKey>('all')
  const [selectedBout, setSelectedBout]       = useState<AugmentedBout | null>(null)
  const [toast, setToast]                     = useState<{ msg: string; ok: boolean } | null>(null)

  // Fetch all bouts for the selected tournament
  useEffect(() => {
    if (!tid) return
    setLoading(true)
    setLoadError('')
    setBouts([])
    setSelectedBout(null)

    fetch(`/api/admin/bout-audit?tid=${encodeURIComponent(tid)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setLoadError(d.error); return }
        setBouts(d.bouts ?? [])
      })
      .catch(e => setLoadError(String(e)))
      .finally(() => setLoading(false))
  }, [tid])

  // Compute flags for every bout (re-runs whenever bouts change, e.g. after a save)
  const boutFlags = useMemo(() => {
    const map = new Map<string, FilterKey[]>()
    for (const b of bouts) map.set(b.id, getBoutFlags(b))
    return map
  }, [bouts])

  // Count per filter tab (always from full unfiltered set)
  const counts = useMemo<Record<FilterKey, number>>(() => {
    const c: Record<FilterKey, number> = {
      all: bouts.length,
      no_nj_id: 0,
      school_mismatch: 0,
      unk_round: 0,
      stub_name: 0,
    }
    for (const flags of boutFlags.values()) {
      for (const f of flags) c[f]++
    }
    return c
  }, [boutFlags, bouts.length])

  // Bouts that match the active filter
  const filteredBouts = useMemo(
    () => filter === 'all'
      ? bouts
      : bouts.filter(b => boutFlags.get(b.id)?.includes(filter)),
    [bouts, boutFlags, filter],
  )

  // Grouped: weight → (sorted) round → bouts
  const grouped = useMemo(() => {
    const byWeight = new Map<number, Map<string, AugmentedBout[]>>()
    for (const b of filteredBouts) {
      if (!byWeight.has(b.weight_class)) byWeight.set(b.weight_class, new Map())
      const byRound = byWeight.get(b.weight_class)!
      if (!byRound.has(b.round)) byRound.set(b.round, [])
      byRound.get(b.round)!.push(b)
    }
    // Sort rounds within each weight group
    for (const [, byRound] of byWeight) {
      const sorted = [...byRound.entries()].sort(
        ([a], [b]) => (ROUND_ORDER[a] ?? 98) - (ROUND_ORDER[b] ?? 98),
      )
      byRound.clear()
      for (const [k, v] of sorted) byRound.set(k, v)
    }
    return byWeight
  }, [filteredBouts])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // After save: merge updated fields back, preserve augmented cross-check data
  const handleSaved = useCallback((updated: TournamentBoutRecord) => {
    setBouts(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b))
    setSelectedBout(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
    showToast('Saved', true)
  }, [])

  const handleCancel = useCallback(() => setSelectedBout(null), [])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-200 shrink-0">
        <Link
          href="/admin"
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          ← Admin
        </Link>
        <h1 className="text-sm font-semibold text-slate-900">Bout Audit</h1>
        <div className="flex-1" />
        <select
          value={tid}
          onChange={e => { setTid(e.target.value); setFilter('all') }}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {tournaments.length === 0 && (
            <option value="">No tournaments found</option>
          )}
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: filter tabs + bout list ─────────────────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden border-r border-slate-200">
          {/* Filter tabs */}
          <div className="flex gap-1.5 px-4 py-2.5 border-b border-slate-100 bg-slate-50 shrink-0 flex-wrap">
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-colors ${
                  filter === f
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                }`}
              >
                {FILTER_LABELS[f]}
                <span className={`text-[10px] tabular-nums ${filter === f ? 'text-slate-400' : 'text-slate-400'}`}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>

          {/* Toast */}
          {toast && (
            <div
              className={`px-4 py-1.5 text-xs font-medium shrink-0 ${
                toast.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {toast.msg}
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-auto">
            {loading && (
              <p className="text-sm text-slate-400 text-center py-16">Loading bouts…</p>
            )}
            {!loading && loadError && (
              <p className="text-sm text-red-500 text-center py-16">{loadError}</p>
            )}
            {!loading && !loadError && bouts.length === 0 && tid && (
              <p className="text-sm text-slate-400 text-center py-16">
                No bouts found for this tournament
              </p>
            )}
            {!loading && !loadError && filteredBouts.length === 0 && bouts.length > 0 && (
              <p className="text-sm text-slate-400 text-center py-16">
                No bouts match this filter
              </p>
            )}

            {!loading && !loadError && [...grouped.entries()].map(([weight, byRound]) => {
              const weightCount = [...byRound.values()].reduce((s, arr) => s + arr.length, 0)
              return (
                <div key={weight}>
                  {/* Weight header */}
                  <div className="sticky top-0 z-10 flex items-baseline gap-2 px-4 py-1.5 bg-slate-100 border-y border-slate-200">
                    <span className="text-xs font-semibold text-slate-700">{weight} lb</span>
                    <span className="text-[10px] text-slate-400">{weightCount} bout{weightCount !== 1 ? 's' : ''}</span>
                  </div>

                  {[...byRound.entries()].map(([round, roundBouts]) => (
                    <div key={round}>
                      {/* Round label */}
                      <div className="px-4 pt-2 pb-0.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {round}
                        </span>
                      </div>

                      {/* Bout rows */}
                      {roundBouts.map(bout => {
                        const flags = boutFlags.get(bout.id) ?? []
                        const isSelected = selectedBout?.id === bout.id

                        return (
                          <button
                            key={bout.id}
                            onClick={() => setSelectedBout(isSelected ? null : bout)}
                            className={`w-full text-left px-4 py-2.5 border-b border-slate-100 transition-colors hover:bg-slate-50 border-l-4 ${
                              isSelected
                                ? 'bg-blue-50 border-l-blue-500'
                                : 'border-l-transparent'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              {/* Wrestlers */}
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <WrestlerLine
                                  name={bout.wrestler1_name_raw}
                                  school={bout.wrestler1_school_raw}
                                  hasLink={!!bout.nj_wrestler1_id}
                                  hasSchool={bout.wrestler1_school_id !== null}
                                  isWinner={bout.winner === 1}
                                />
                                <WrestlerLine
                                  name={bout.wrestler2_name_raw}
                                  school={bout.wrestler2_school_raw}
                                  hasLink={!!bout.nj_wrestler2_id}
                                  hasSchool={bout.wrestler2_school_id !== null}
                                  isWinner={bout.winner === 2}
                                />
                              </div>

                              {/* Result + flags */}
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                {bout.result_type && (
                                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                    {bout.result_type}
                                    {bout.result_detail ? ` ${bout.result_detail}` : ''}
                                  </span>
                                )}
                                {flags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 justify-end">
                                    {flags.map(f => (
                                      <span
                                        key={f}
                                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${FLAG_BADGE[f]}`}
                                      >
                                        {FILTER_LABELS[f]}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right: edit panel ──────────────────────────────────────────── */}
        <div className="w-72 xl:w-80 overflow-y-auto shrink-0">
          <InSeasonEditPanel
            bout={selectedBout}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WrestlerLine({
  name,
  school,
  hasLink,
  hasSchool,
  isWinner,
}: {
  name: string
  school: string
  hasLink: boolean
  hasSchool: boolean
  isWinner: boolean
}) {
  return (
    <div className={`flex items-baseline gap-1 text-xs ${isWinner ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
      <span className="truncate">{name}</span>
      <span className="text-slate-400 font-normal text-[10px] shrink-0">({school})</span>
      {!hasLink && hasSchool && (
        <span className="shrink-0 text-[9px] font-semibold text-amber-600">NO ID</span>
      )}
    </div>
  )
}
