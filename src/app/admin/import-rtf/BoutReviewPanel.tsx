'use client'

import { useState } from 'react'
import type { BoutForReview, SchoolOverride } from './types'
import { BoutRow } from './BoutRow'
import { inferRoundsFromSeeds } from '@/lib/parseRtf'

function WeightSection({
  weight,
  bouts,
  rounds,
  duplicates,
  schoolOverrides,
  seeds,
  onRoundChange,
  onDuplicateToggle,
  onSeedChange,
}: {
  weight: number
  bouts: BoutForReview[]
  rounds: Record<string, string>
  duplicates: Record<string, boolean>
  schoolOverrides: Record<string, SchoolOverride>
  seeds: Record<string, number>
  onRoundChange: (key: string, round: string) => void
  onDuplicateToggle: (uid: string) => void
  onSeedChange: (seedKey: string, seed: number | undefined) => void
}) {
  const [open, setOpen] = useState(false)
  const [showDuplicates, setShowDuplicates] = useState(false)

  const isDupEntry = (b: BoutForReview) => duplicates[String(b.uid)] ?? b.is_duplicate

  const resolveSchoolKey = (raw: string) => {
    const o = schoolOverrides[raw]
    return o?.type === 'nj' ? `id:${o.school_id}` : raw.toLowerCase()
  }
  const resolveSchoolDisplay = (raw: string) => {
    const o = schoolOverrides[raw]
    return o?.type === 'nj' ? o.display_name : raw
  }

  // Seed key scoped to this weight so same wrestler at different weights stays separate
  const seedKey = (name: string, rawSchool: string) =>
    `${weight}|${name}|${resolveSchoolKey(rawSchool)}`

  const seedFor = (name: string, rawSchool: string) => seeds[seedKey(name, rawSchool)]

  const primaries = bouts.filter(b => !isDupEntry(b))
  const dupCount = bouts.filter(b => isDupEntry(b)).length
  const weakCount = primaries.filter(b => !b.is_bye && b.inference_confidence === 'weak').length
  const bracketSize = bouts[0]?.bracket_size ?? 0

  const wrestlerMap = new Map<string, { display: string; rawName: string; rawSchool: string }>()
  for (const b of bouts) {
    if (isDupEntry(b) || b.is_bye) continue
    if (b.wrestler1_name) {
      const k = `${b.wrestler1_name}|${resolveSchoolKey(b.wrestler1_school)}`
      if (!wrestlerMap.has(k)) wrestlerMap.set(k, {
        display: `${b.wrestler1_name} (${resolveSchoolDisplay(b.wrestler1_school)})`,
        rawName: b.wrestler1_name,
        rawSchool: b.wrestler1_school,
      })
    }
    if (b.wrestler2_name) {
      const k = `${b.wrestler2_name}|${resolveSchoolKey(b.wrestler2_school)}`
      if (!wrestlerMap.has(k)) wrestlerMap.set(k, {
        display: `${b.wrestler2_name} (${resolveSchoolDisplay(b.wrestler2_school)})`,
        rawName: b.wrestler2_name,
        rawSchool: b.wrestler2_school,
      })
    }
  }
  const wrestlers = [...wrestlerMap.values()].sort((a, b) => a.display.localeCompare(b.display))

  const displayBouts = showDuplicates ? bouts : primaries

  const seededCount = wrestlers.filter(w => seeds[seedKey(w.rawName, w.rawSchool)] !== undefined).length

  function applySeeds() {
    const entrants = wrestlers
      .map(w => ({ name: w.rawName, school: w.rawSchool, seed: seeds[seedKey(w.rawName, w.rawSchool)] }))
      .filter((e): e is { name: string; school: string; seed: number } => e.seed !== undefined)
    const assignments = inferRoundsFromSeeds(weight, entrants, primaries)
    for (const [boutKey, round] of Object.entries(assignments)) {
      onRoundChange(boutKey, round)
    }
  }

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
          {dupCount > 0 && <span className="text-xs text-slate-400">{dupCount} dup{dupCount !== 1 ? 's' : ''} hidden</span>}
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
          {/* Entrant list with seed inputs */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Entrants ({wrestlers.length}) → {bracketSize}-bracket
            </p>
            <div className="grid grid-cols-2 gap-x-6">
              {wrestlers.map((w, i) => {
                const sk = seedKey(w.rawName, w.rawSchool)
                const currentSeed = seeds[sk]
                return (
                  <div key={i} className="flex items-center gap-1.5 leading-6">
                    <span className="text-slate-400 text-xs w-5 text-right select-none shrink-0">{i + 1}.</span>
                    <input
                      type="number"
                      min={1}
                      max={bracketSize}
                      value={currentSeed ?? ''}
                      onChange={e => onSeedChange(sk, e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="#"
                      className="w-9 text-xs border border-slate-300 px-1 py-0 text-center focus:outline-none focus:ring-1 focus:ring-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-slate-600 truncate">{w.display}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {seededCount > 0 && (
            <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-3">
              <button
                onClick={applySeeds}
                className="text-xs px-2 py-1 bg-black text-white hover:bg-slate-800 transition-colors"
              >
                Apply seeds → auto-assign rounds
              </button>
              <span className="text-xs text-slate-400">
                {seededCount} of {wrestlers.length} seeded
                {seededCount < wrestlers.length && ' — unseeded positions treated as byes'}
              </span>
            </div>
          )}

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
                {displayBouts.map(bout => (
                  <BoutRow
                    key={bout.uid}
                    bout={bout}
                    round={rounds[bout.key] ?? bout.inferred_round}
                    isDuplicate={isDupEntry(bout)}
                    seed1={seedFor(bout.wrestler1_name, bout.wrestler1_school)}
                    seed2={bout.is_bye ? undefined : seedFor(bout.wrestler2_name, bout.wrestler2_school)}
                    onRoundChange={r => onRoundChange(bout.key, r)}
                    onDuplicateToggle={() => onDuplicateToggle(String(bout.uid))}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {dupCount > 0 && (
            <div className="px-3 py-2 border-t border-slate-100">
              <button
                onClick={() => setShowDuplicates(s => !s)}
                className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showDuplicates ? `Hide ${dupCount} duplicate${dupCount !== 1 ? 's' : ''}` : `Show ${dupCount} duplicate${dupCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          )}
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
  seeds,
  onRoundChange,
  onDuplicateToggle,
  onSeedChange,
}: {
  bouts: BoutForReview[]
  rounds: Record<string, string>
  duplicates: Record<string, boolean>
  schoolOverrides: Record<string, SchoolOverride>
  seeds: Record<string, number>
  onRoundChange: (key: string, round: string) => void
  onDuplicateToggle: (uid: string) => void
  onSeedChange: (seedKey: string, seed: number | undefined) => void
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
          seeds={seeds}
          onRoundChange={onRoundChange}
          onDuplicateToggle={onDuplicateToggle}
          onSeedChange={onSeedChange}
        />
      ))}
    </div>
  )
}
