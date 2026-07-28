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
  onDuplicateToggle: (uid: string) => void
}) {
  const [open, setOpen] = useState(false)

  // Resolve per-entry duplicate status using uid (not key) to avoid collision between
  // primary and duplicate entries that share the same dedup key
  const isDupEntry = (b: BoutForReview) => duplicates[String(b.uid)] ?? b.is_duplicate

  const primaries = bouts.filter(b => !isDupEntry(b))
  const weakCount = primaries.filter(b => !b.is_bye && b.inference_confidence === 'weak').length
  const dupCount = bouts.filter(b => isDupEntry(b)).length
  const bracketSize = bouts[0]?.bracket_size ?? 0

  // Collect wrestlers in first-encounter order (primary, non-bye bouts only)
  const wrestlerMap = new Map<string, string>() // key → "Name (School)"
  for (const b of bouts) {
    if (isDupEntry(b) || b.is_bye) continue
    if (b.wrestler1_name) {
      const k = `${b.wrestler1_name}|${b.wrestler1_school}`
      if (!wrestlerMap.has(k)) wrestlerMap.set(k, `${b.wrestler1_name} (${b.wrestler1_school})`)
    }
    if (b.wrestler2_name) {
      const k = `${b.wrestler2_name}|${b.wrestler2_school}`
      if (!wrestlerMap.has(k)) wrestlerMap.set(k, `${b.wrestler2_name} (${b.wrestler2_school})`)
    }
  }
  const wrestlers = [...wrestlerMap.values()]
  const entrants = wrestlers.length

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
        <div className="border-t border-slate-100">
          {/* Numbered wrestler list */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Entrants ({wrestlers.length}) → {bracketSize}-bracket
            </p>
            <ol className="text-xs text-slate-600 columns-2 gap-x-6 list-none">
              {wrestlers.map((w, i) => (
                <li key={i} className="leading-5">
                  <span className="text-slate-400 mr-1 select-none">{i + 1}.</span>{w}
                </li>
              ))}
            </ol>
          </div>
          <div className="overflow-x-auto">
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
              {bouts.map(bout => (
                <BoutRow
                  key={bout.uid}
                  bout={bout}
                  round={rounds[bout.key] ?? bout.inferred_round}
                  isDuplicate={isDupEntry(bout)}
                  onRoundChange={r => onRoundChange(bout.key, r)}
                  onDuplicateToggle={() => onDuplicateToggle(String(bout.uid))}
                />
              ))}
            </tbody>
          </table>
          </div>
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
  onDuplicateToggle: (uid: string) => void
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
