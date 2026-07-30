'use client'

import { useState } from 'react'
import type { BoutForReview, SchoolOverride } from './types'
import { BoutRow } from './BoutRow'
import { inferRoundsFromSeeds } from '@/lib/parseRtf'

// ── Bracket preview ───────────────────────────────────────────────────────────

const CHAMP_ROUND_NAMES = ['1st Round', '2nd Round', '3rd Round', '4th Round', 'Quarterfinals', 'Semifinals', 'Finals']
const PLACE_ROUND_NAMES = ['3rd Place', '5th Place', '7th Place']

function roundSortKey(r: string): number {
  const ci = CHAMP_ROUND_NAMES.indexOf(r)
  if (ci >= 0) return ci
  const pi = PLACE_ROUND_NAMES.indexOf(r)
  if (pi >= 0) return 100 + pi
  const cm = r.match(/^Consolation (\d+)$/)
  if (cm) return 200 + Number(cm[1])
  if (r === 'Exhibition') return 500
  return 999
}

function BracketPreview({
  weight,
  bouts,
  roundAssignments,
  seeds,
  seedKeyFn,
  onConfirm,
  onDismiss,
}: {
  weight: number
  bouts: BoutForReview[]
  roundAssignments: Record<string, string>
  seeds: Record<string, number>
  seedKeyFn: (name: string, school: string) => string
  onConfirm: () => void
  onDismiss: () => void
}) {
  const boutByKey = new Map(bouts.map(b => [b.key, b]))

  // Group assigned bouts by round
  const byRound = new Map<string, BoutForReview[]>()
  for (const [key, round] of Object.entries(roundAssignments)) {
    const b = boutByKey.get(key)
    if (!b || b.is_bye) continue
    if (!byRound.has(round)) byRound.set(round, [])
    byRound.get(round)!.push(b)
  }

  // Unassigned non-bye bouts (simulation couldn't place them)
  const assignedKeys = new Set(Object.keys(roundAssignments))
  const unassigned = bouts.filter(b => !b.is_bye && !assignedKeys.has(b.key))

  const sortedRounds = [...byRound.keys()].sort((a, b) => roundSortKey(a) - roundSortKey(b))
  const hasExhibition = byRound.has('Exhibition')
  const hasProblem = hasExhibition || unassigned.length > 0

  return (
    <div className="border border-slate-300 bg-white m-3">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Bracket Preview — {weight}lb</span>
        <div className="flex items-center gap-2">
          {hasProblem && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5">
              ⚠ {hasExhibition ? 'Exhibition bouts found' : ''}{hasExhibition && unassigned.length > 0 ? ' · ' : ''}{unassigned.length > 0 ? `${unassigned.length} unassigned` : ''}
            </span>
          )}
          {!hasProblem && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5">✓ All bouts placed</span>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {sortedRounds.map(round => {
          const roundBouts = byRound.get(round)!
          const isExhibition = round === 'Exhibition'
          return (
            <div key={round} className={`px-3 py-2 ${isExhibition ? 'bg-amber-50' : ''}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${isExhibition ? 'text-amber-700' : 'text-slate-400'}`}>
                {round}
              </p>
              <div className="space-y-0.5">
                {roundBouts.map(b => {
                  const s1 = seeds[seedKeyFn(b.wrestler1_name, b.wrestler1_school)]
                  const s2 = b.is_bye ? undefined : seeds[seedKeyFn(b.wrestler2_name, b.wrestler2_school)]
                  const isDff = b.result_type?.toUpperCase() === 'DFF'
                  return (
                    <div key={b.uid} className="text-xs text-slate-700 flex items-baseline gap-1 flex-wrap">
                      <span className={!isDff ? 'font-semibold' : 'text-slate-400'}>
                        {s1 != null ? `[${s1}] ` : ''}{b.wrestler1_name}
                      </span>
                      <span className="text-slate-300">vs</span>
                      <span className="text-slate-400">
                        {s2 != null ? `[${s2}] ` : ''}{b.wrestler2_name}
                      </span>
                      {b.result_type && (
                        <span className="text-slate-400 ml-1">
                          — {b.result_type}{b.result_detail ? ` ${b.result_detail}` : ''}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {unassigned.length > 0 && (
          <div className="px-3 py-2 bg-red-50">
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5 text-red-600">Unassigned (simulation couldn&apos;t place)</p>
            <div className="space-y-0.5">
              {unassigned.map(b => (
                <div key={b.uid} className="text-xs text-red-700 flex items-baseline gap-1 flex-wrap">
                  <span>{b.wrestler1_name}</span>
                  <span className="text-red-300">vs</span>
                  <span>{b.wrestler2_name}</span>
                  {b.result_type && <span className="text-red-400 ml-1">— {b.result_type}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-200 bg-slate-50">
        <button
          onClick={onConfirm}
          className="text-xs px-3 py-1 bg-black text-white hover:bg-slate-800 transition-colors"
        >
          Confirm &amp; apply rounds
        </button>
        <button
          onClick={onDismiss}
          className="text-xs px-3 py-1 border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

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
  const [previewRounds, setPreviewRounds] = useState<Record<string, string> | null>(null)

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

  function buildEntrants() {
    return wrestlers
      .map(w => ({ name: w.rawName, school: w.rawSchool, seed: seeds[seedKey(w.rawName, w.rawSchool)] }))
      .filter((e): e is { name: string; school: string; seed: number } => e.seed !== undefined)
  }

  function previewBracket() {
    const assignments = inferRoundsFromSeeds(weight, buildEntrants(), primaries)
    setPreviewRounds(assignments)
  }

  function applySeeds() {
    const assignments = inferRoundsFromSeeds(weight, buildEntrants(), primaries)
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
            <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-3 flex-wrap">
              <button
                onClick={previewBracket}
                className="text-xs px-2 py-1 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Preview bracket
              </button>
              <button
                onClick={applySeeds}
                className="text-xs px-2 py-1 border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Apply without preview
              </button>
              <span className="text-xs text-slate-400">
                {seededCount} of {wrestlers.length} seeded
                {seededCount < wrestlers.length && ' — unseeded positions treated as byes'}
              </span>
            </div>
          )}

          {previewRounds && (
            <BracketPreview
              weight={weight}
              bouts={primaries}
              roundAssignments={previewRounds}
              seeds={seeds}
              seedKeyFn={seedKey}
              onConfirm={() => {
                for (const [boutKey, round] of Object.entries(previewRounds)) {
                  onRoundChange(boutKey, round)
                }
                setPreviewRounds(null)
              }}
              onDismiss={() => setPreviewRounds(null)}
            />
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
