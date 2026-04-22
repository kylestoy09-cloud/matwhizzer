'use client'

import { useState, useCallback } from 'react'
import type { ParsedMeet } from '@/lib/parseDualMeet'
import type { SchoolMatch } from '@/lib/matchSchools'
import type { WrestlerMatch } from '@/lib/matchWrestlers'
import {
  type SchoolOverride,
  type WrestlerOverride,
  type WrestlerKey,
  makeWrestlerKey,
  resolveSchool,
  resolveWrestler,
} from './types'

// ── School review item ─────────────────────────────────────────────────────────

function SchoolReviewItem({
  rawName,
  match,
  override,
  onOverride,
}: {
  rawName:    string
  match:      SchoolMatch
  override:   SchoolOverride | undefined
  onOverride: (rawName: string, o: SchoolOverride | null) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SchoolMatch | null>(null)
  const [searching, setSearching]         = useState(false)

  // Build options: primary match + alternates + search result
  const options: { schoolId: number; displayName: string; label: string }[] = []
  if (match.schoolId && match.displayName) {
    options.push({ schoolId: match.schoolId, displayName: match.displayName, label: `${match.displayName} (${(match.confidence)})` })
  }
  for (const alt of match.alternates) {
    if (!options.find(o => o.schoolId === alt.schoolId)) {
      options.push({ schoolId: alt.schoolId, displayName: alt.displayName, label: `${alt.displayName} (${(alt.score * 100).toFixed(0)}%)` })
    }
  }
  if (searchResults?.schoolId && searchResults.displayName) {
    if (!options.find(o => o.schoolId === searchResults.schoolId)) {
      options.push({ schoolId: searchResults.schoolId!, displayName: searchResults.displayName!, label: `${searchResults.displayName} (search)` })
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch('/api/admin/match-schools', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ names: [searchQuery.trim()] }),
      })
      const json = await res.json()
      setSearchResults(json.results?.[0] ?? null)
    } finally {
      setSearching(false)
    }
  }

  const selected = override?.schoolId ?? match.schoolId

  return (
    <div className="border border-black/20 bg-white p-3">
      <div className="text-xs font-semibold text-slate-700 mb-2">
        Raw name: <span className="font-mono text-slate-900">"{rawName}"</span>
        <span className="ml-2 text-orange-600 font-normal">({match.confidence})</span>
      </div>

      {options.length > 0 ? (
        <div className="space-y-1 mb-3">
          {options.map(opt => (
            <label key={opt.schoolId} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`school-${rawName}`}
                checked={selected === opt.schoolId}
                onChange={() => onOverride(rawName, { schoolId: opt.schoolId, displayName: opt.displayName })}
                className="accent-black"
              />
              <span className="text-xs text-slate-800">{opt.label}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic mb-3">No automatic candidates found.</p>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search for school…"
          className="flex-1 text-xs border border-black/30 px-2 py-1 outline-none focus:border-black"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="text-xs px-3 py-1 border border-black bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          {searching ? '…' : 'Search'}
        </button>
      </div>

      {/* Out-of-state option — only shown for 'none' confidence matches */}
      {match.confidence === 'none' && !override?.isOutOfState && (
        <button
          onClick={() => onOverride(rawName, { schoolId: null, displayName: rawName, isOutOfState: true })}
          className="mt-2 w-full text-xs px-3 py-1.5 border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 text-left"
        >
          Mark as Out-of-State — skip, no NJ school record needed
        </button>
      )}

      {override?.isOutOfState && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-500 italic">Marked as out-of-state</span>
          <button
            onClick={() => onOverride(rawName, null)}
            className="text-[11px] text-slate-400 hover:text-slate-700 underline"
          >
            Undo
          </button>
        </div>
      )}

      {override && !override.isOutOfState && (
        <button
          onClick={() => onOverride(rawName, null)}
          className="mt-2 text-[11px] text-slate-400 hover:text-slate-700 underline"
        >
          Clear override
        </button>
      )}
    </div>
  )
}

// ── Wrestler review item ───────────────────────────────────────────────────────

function WrestlerReviewItem({
  wKey,
  match,
  override,
  onOverride,
}: {
  wKey:       WrestlerKey
  match:      WrestlerMatch
  override:   WrestlerOverride | undefined
  onOverride: (key: WrestlerKey, o: WrestlerOverride | null) => void
}) {
  const isConfirmedNew = override?.confirmedNew === true
  const selectedId     = override ? override.wrestlerId : match.wrestlerId

  const candidates = [
    ...(match.wrestlerId && match.displayName
      ? [{ wrestlerId: match.wrestlerId, displayName: match.displayName, score: 1, label: `${match.displayName} (${match.confidence})` }]
      : []),
    ...match.alternates.map(a => ({
      wrestlerId:  a.wrestlerId,
      displayName: a.displayName,
      score:       a.score,
      label:       `${a.displayName} (${(a.score * 100).toFixed(0)}%)`,
    })),
  ].filter((a, i, arr) => arr.findIndex(b => b.wrestlerId === a.wrestlerId) === i)

  return (
    <div className="border border-black/20 bg-white p-3">
      <div className="text-xs font-semibold text-slate-700 mb-1">
        <span className="font-mono text-slate-900">"{match.rawName}"</span>
        <span className="ml-2 text-slate-400 font-normal font-mono">{match.weightClass}lb</span>
        <span className="ml-2 text-orange-600 font-normal">({match.confidence})</span>
      </div>

      {candidates.length > 0 ? (
        <div className="space-y-1 mb-2">
          {candidates.map(c => (
            <label key={c.wrestlerId} className={`flex items-center gap-2 cursor-pointer ${isConfirmedNew ? 'opacity-40' : ''}`}>
              <input
                type="radio"
                name={`wrestler-${wKey}`}
                checked={!isConfirmedNew && selectedId === c.wrestlerId}
                onChange={() => onOverride(wKey, { wrestlerId: c.wrestlerId, displayName: c.displayName, confirmedNew: false })}
                className="accent-black"
                disabled={isConfirmedNew}
              />
              <span className="text-xs text-slate-800">{c.label}</span>
            </label>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-3 mt-2">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isConfirmedNew}
            onChange={e =>
              onOverride(wKey, e.target.checked
                ? { wrestlerId: null, displayName: null, confirmedNew: true }
                : null
              )
            }
            className="accent-black w-3.5 h-3.5"
          />
          <span className="text-xs text-slate-600">Confirm as new wrestler</span>
        </label>
        {override && (
          <button
            onClick={() => onOverride(wKey, null)}
            className="text-[11px] text-slate-400 hover:text-slate-700 underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────────

type Props = {
  meets:                ParsedMeet[]
  schoolResolutions:    Record<string, SchoolMatch>
  schoolOverrides:      Record<string, SchoolOverride>
  wrestlerResolutions:  Record<string, WrestlerMatch>
  wrestlerOverrides:    Record<string, WrestlerOverride>
  onSchoolOverride:     (rawName: string, o: SchoolOverride | null) => void
  onWrestlerOverride:   (key: WrestlerKey, o: WrestlerOverride | null) => void
}

// ── ReviewPanel ────────────────────────────────────────────────────────────────

export function ReviewPanel({
  meets,
  schoolResolutions,
  schoolOverrides,
  wrestlerResolutions,
  wrestlerOverrides,
  onSchoolOverride,
  onWrestlerOverride,
}: Props) {
  const [open, setOpen] = useState(true)

  // Collect schools needing review (low or none, no override that resolves them)
  const schoolItems: { rawName: string; match: SchoolMatch }[] = []
  const seenSchools = new Set<string>()
  for (const meet of meets) {
    for (const rawName of [meet.team1Name, meet.team2Name]) {
      if (seenSchools.has(rawName)) continue
      seenSchools.add(rawName)
      const res = resolveSchool(rawName, schoolResolutions, schoolOverrides)
      if (res.confidence === 'low' || res.confidence === 'none') {
        const match = schoolResolutions[rawName]
        if (match) schoolItems.push({ rawName, match })
      }
    }
    // Also check match-row school names
    for (const m of meet.matches) {
      for (const rawName of [m.winnerSchoolRaw, m.loserSchoolRaw]) {
        if (!rawName || seenSchools.has(rawName)) continue
        seenSchools.add(rawName)
        const res = resolveSchool(rawName, schoolResolutions, schoolOverrides)
        if (res.confidence === 'low' || res.confidence === 'none') {
          const match = schoolResolutions[rawName]
          if (match) schoolItems.push({ rawName, match })
        }
      }
    }
  }

  // Collect wrestlers needing review (low confidence or none with alternates, no resolved override)
  const wrestlerItems: { wKey: WrestlerKey; match: WrestlerMatch }[] = []
  const seenWrestlers = new Set<WrestlerKey>()
  for (const meet of meets) {
    for (const m of meet.matches) {
      if (m.isDoubleForfeit) continue
      const pairs: [string | null, string | null][] = [
        [m.winnerName, m.winnerSchoolRaw],
        ...(!m.isForfeitWin ? [[m.loserName, m.loserSchoolRaw] as [string | null, string | null]] : []),
      ]
      for (const [name, schoolRaw] of pairs) {
        if (!name) continue
        const schoolId = resolveSchool(schoolRaw ?? '', schoolResolutions, schoolOverrides).schoolId
        const key      = makeWrestlerKey(name, schoolId, m.weightClass)
        if (seenWrestlers.has(key)) continue
        seenWrestlers.add(key)
        const resolved = resolveWrestler(key, wrestlerResolutions, wrestlerOverrides)
        const wMatch   = wrestlerResolutions[key]
        if (!wMatch) continue
        // Show if low confidence, or none with alternates (ambiguous new vs existing)
        const needsReview = resolved.confidence === 'low'
          || (resolved.confidence === 'none' && wMatch.alternates.length > 0 && !wrestlerOverrides[key]?.confirmedNew)
        if (needsReview) wrestlerItems.push({ wKey: key, match: wMatch })
      }
    }
  }

  const total = schoolItems.length + wrestlerItems.length
  if (total === 0) return null

  return (
    <div className="border border-black bg-white mt-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-black hover:bg-amber-100 transition-colors"
      >
        <span className="text-sm font-semibold text-amber-900">
          Needs Review — {total} item{total !== 1 ? 's' : ''}
          {schoolItems.length > 0 && ` (${schoolItems.length} school${schoolItems.length !== 1 ? 's' : ''})`}
          {wrestlerItems.length > 0 && ` (${wrestlerItems.length} wrestler${wrestlerItems.length !== 1 ? 's' : ''})`}
        </span>
        <span className="text-amber-700 text-xs">{open ? '▲ Collapse' : '▼ Expand'}</span>
      </button>

      {open && (
        <div className="p-4 space-y-6">

          {/* Schools */}
          {schoolItems.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                School Matches — {schoolItems.length} unresolved
              </h3>
              <div className="space-y-2">
                {schoolItems.map(({ rawName, match }) => (
                  <SchoolReviewItem
                    key={rawName}
                    rawName={rawName}
                    match={match}
                    override={schoolOverrides[rawName]}
                    onOverride={onSchoolOverride}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Wrestlers */}
          {wrestlerItems.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                Wrestler Matches — {wrestlerItems.length} need attention
              </h3>
              <div className="space-y-2">
                {wrestlerItems.map(({ wKey, match }) => (
                  <WrestlerReviewItem
                    key={wKey}
                    wKey={wKey}
                    match={match}
                    override={wrestlerOverrides[wKey]}
                    onOverride={onWrestlerOverride}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
