'use client'

import { useState } from 'react'
import type { BoutForReview } from './types'
import { BoutRow } from './BoutRow'

function WeightSection({
  weight,
  bouts,
  rounds,
  duplicates,
  onRoundChange,
  onDuplicateToggle,
}: {
  weight: number
  bouts: BoutForReview[]
  rounds: Record<string, string>
  duplicates: Record<string, boolean>
  onRoundChange: (key: string, round: string) => void
  onDuplicateToggle: (key: string) => void
}) {
  const [open, setOpen] = useState(false)

  const primaries = bouts.filter(b => !b.is_duplicate)
  const weakCount = primaries.filter(b => !b.is_bye && b.inference_confidence === 'weak').length
  const dupCount = bouts.filter(b => duplicates[b.key] ?? b.is_duplicate).length
  const bracketSize = bouts[0]?.bracket_size ?? 0
  const entrants = bouts.filter(b => !b.is_duplicate && !b.is_bye).reduce((s, b) => {
    s.add(`${b.wrestler1_name}|${b.wrestler1_school}`)
    s.add(`${b.wrestler2_name}|${b.wrestler2_school}`)
    return s
  }, new Set<string>()).size

  return (
    <div className="border border-slate-200 bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800 text-sm">{weight}</span>
          <span className="text-xs text-slate-400">{entrants} wrestlers · {bracketSize}-bracket</span>
          <span className="text-xs text-slate-400">{primaries.length} bouts</span>
          {dupCount > 0 && <span className="text-xs text-slate-400">{dupCount} dup{dupCount !== 1 ? 's' : ''}</span>}
        </div>
        <div className="flex items-center gap-2">
          {weakCount > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              ⚠ {weakCount} uncertain
            </span>
          )}
          <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-medium text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="px-2 py-1.5 text-left">Section</th>
                <th className="px-2 py-1.5 text-left">Bout</th>
                <th className="px-2 py-1.5 text-left">Round</th>
                <th className="px-2 py-1.5 text-left" />
              </tr>
            </thead>
            <tbody>
              {bouts.map((bout, i) => (
                <BoutRow
                  key={`${bout.key}-${i}`}
                  bout={bout}
                  round={rounds[bout.key] ?? bout.inferred_round}
                  isDuplicate={duplicates[bout.key] ?? bout.is_duplicate}
                  onRoundChange={r => onRoundChange(bout.key, r)}
                  onDuplicateToggle={() => onDuplicateToggle(bout.key)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function BoutReviewPanel({
  bouts,
  rounds,
  duplicates,
  onRoundChange,
  onDuplicateToggle,
}: {
  bouts: BoutForReview[]
  rounds: Record<string, string>
  duplicates: Record<string, boolean>
  onRoundChange: (key: string, round: string) => void
  onDuplicateToggle: (key: string) => void
}) {
  const byWeight = new Map<number, BoutForReview[]>()
  for (const b of bouts) {
    if (!byWeight.has(b.weight_class)) byWeight.set(b.weight_class, [])
    byWeight.get(b.weight_class)!.push(b)
  }
  const weights = [...byWeight.keys()].sort((a, b) => a - b)

  const totalWeak = bouts.filter(b => !b.is_duplicate && !b.is_bye && b.inference_confidence === 'weak').length

  return (
    <div className="space-y-1.5">
      {totalWeak > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
          ⚠ {totalWeak} round{totalWeak !== 1 ? 's' : ''} flagged as uncertain — check rows highlighted in amber before importing.
          Hover the ⚠ badge on a row to see why.
        </p>
      )}
      {weights.map(wc => (
        <WeightSection
          key={wc}
          weight={wc}
          bouts={byWeight.get(wc)!}
          rounds={rounds}
          duplicates={duplicates}
          onRoundChange={onRoundChange}
          onDuplicateToggle={onDuplicateToggle}
        />
      ))}
    </div>
  )
}
