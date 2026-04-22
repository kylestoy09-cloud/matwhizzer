'use client'

import { useState } from 'react'
import type { ParsedMeet } from '@/lib/parseDualMeet'
import type { SchoolMatch } from '@/lib/matchSchools'
import {
  type SchoolOverride,
  resolveSchool,
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

// ── Props ──────────────────────────────────────────────────────────────────────

type Props = {
  meets:             ParsedMeet[]
  schoolResolutions: Record<string, SchoolMatch>
  schoolOverrides:   Record<string, SchoolOverride>
  onSchoolOverride:  (rawName: string, o: SchoolOverride | null) => void
}

// ── ReviewPanel ────────────────────────────────────────────────────────────────

export function ReviewPanel({
  meets,
  schoolResolutions,
  schoolOverrides,
  onSchoolOverride,
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

  if (schoolItems.length === 0) return null

  return (
    <div className="border border-black bg-white mt-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-black hover:bg-amber-100 transition-colors"
      >
        <span className="text-sm font-semibold text-amber-900">
          Schools — {schoolItems.length} unresolved
        </span>
        <span className="text-amber-700 text-xs">{open ? '▲ Collapse' : '▼ Expand'}</span>
      </button>

      {open && (
        <div className="p-4">
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
    </div>
  )
}
