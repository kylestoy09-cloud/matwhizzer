'use client'

import { useState } from 'react'
import type { BoutForReview, SchoolOverride } from './types'
import { BoutRow } from './BoutRow'

function WeightSection({
  weight,
  bouts,
  rounds,
  duplicates,
  schoolOverrides,
  onRoundChange,
  onDuplicateToggle,
}: {
  weight: number
  bouts: BoutForReview[]
  rounds: Record<string, string>
  duplicates: Record<string, boolean>
  schoolOverrides: Record<string, SchoolOverride>
  onRoundChange: (key: string, round: string) => void
  onDuplicateToggle: (uid: string) => void
}) {
  const [open, setOpen] = useState(false)

  // Resolve per-entry duplicate status using uid (not key) to avoid collision between
  // primary and duplicate entries that share the same dedup key
  const isDupEntry = (b: BoutForReview) => duplicates[String(b.uid)] ?? b.is_duplicate

  // Use resolved school_id as the dedup key so two raw names mapping to the same
  // school (e.g. "S. Plainfield" and "South Plainfield") count as one entrant
  const resolveSchoolKey = (raw: string) => {
    const o = schoolOverrides[raw]
    return o?.type === 'nj' ? `id:${o.school_id}` : raw
  }
  const resolveSchoolDisplay = (raw: string) => {
    const o = schoolOverrides[raw]
    return o?.type === 'nj' ? o.display_name : raw
  }

  const primaries = bouts.filter(b => !isDupEntry(b))
  const weakCount = primaries.filter(b => !b.is_bye && b.inference_confidence === 'weak').length
  const dupCount = bouts.filter(b => isDupEntry(b)).length
  const bracketSize = bouts[0]?.bracket_size ?? 0

  // Collect wrestlers in first-encounter order (primary, non-bye bouts only),
  // deduplicating by resolved school_id so school name variants don't inflate the count
  const wrestlerMap = new Map<string, string>() // resolvedKey → "Name (Display School)"
  for (const b of bouts) {
    if (isDupEntry(b) || b.is_bye) continue
    if (b.wrestler1_name) {
      const k = `${b.wrestler1_name}|${resolveSchoolKey(b.wrestler1_school)}`
      if (!wrestlerMap.has(k)) wrestlerMap.set(k, `${b.wrestler1_name} (${resolveSchoolDisplay(b.wrestler1_school)})`)
    }
    if (b.wrestler2_name) {
      const k = `${b.wrestler2_name}|${resolveSchoolKey(b.wrestler2_school)}`
      if (!wrestlerMap.has(k)) wrestlerMap.set(k, `${b.wrestler2_name} (${resolveSchoolDisplay(b.wrestler2_school)})`)
    }
  }
  const wrestlers = [...wrestlerMap.values()].sort((a, b) => a.localeCompare(b))

  return (
    <div className="border border-slate-200 bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800 text-sm">{weight}</span>
          <span className="text-xs text-slate-400">{wrestlers.length} wrestlers · {bracketSize}-bracket</span>
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
  schoolOverrides,
  onRoundChange,
  onDuplicateToggle,
}: {
  bouts: BoutForReview[]
  rounds: Record<string, string>
  duplicates: Record<string, boolean>
  schoolOverrides: Record<string, SchoolOverride>
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
          schoolOverrides={schoolOverrides}
          onRoundChange={onRoundChange}
          onDuplicateToggle={onDuplicateToggle}
        />
      ))}
    </div>
  )
}
