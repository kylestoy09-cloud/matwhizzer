'use client'

import { useState, useCallback } from 'react'
import type { ParsedMeet } from '@/lib/parseDualMeet'
import type { SchoolMatch } from '@/lib/matchSchools'
import type { WrestlerMatch } from '@/lib/matchWrestlers'
import {
  type SchoolOverride,
  type WrestlerOverride,
  resolveSchool,
} from './types'

function normalizeForDisplay(raw: string): string {
  if (raw === raw.toUpperCase() && /[A-Z]{2}/.test(raw)) {
    return raw.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }
  return raw
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const cls =
    confidence === 'exact' ? 'bg-green-100 text-green-800' :
    confidence === 'alias' ? 'bg-teal-100 text-teal-800' :
    confidence === 'high'  ? 'bg-blue-100 text-blue-800' :
    confidence === 'low'   ? 'bg-yellow-100 text-yellow-800' :
    confidence === 'oos'   ? 'bg-purple-100 text-purple-800' :
                             'bg-red-100 text-red-800'
  return (
    <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded ${cls}`}>
      {confidence}
    </span>
  )
}

function SchoolFlagCard({
  rawName,
  match,
  boutCount,
  override,
  onOverride,
  associatedWrestlers,
  wrestlerResolutions,
  onWrestlerOverride,
  gender,
}: {
  rawName:              string
  match:                SchoolMatch
  boutCount:            number
  override:             SchoolOverride | undefined
  onOverride:           (rawName: string, o: SchoolOverride | null) => void
  associatedWrestlers:  string[]
  wrestlerResolutions:  Record<string, WrestlerMatch>
  onWrestlerOverride:   (key: string, o: WrestlerOverride | null) => void
  gender:               'M' | 'F'
}) {
  const [query,        setQuery]        = useState('')
  const [results,      setResults]      = useState<{ id: number; display_name: string }[]>([])
  const [searching,    setSearching]    = useState(false)
  const [oosQuery,     setOosQuery]     = useState('')
  const [oosResults,   setOosResults]   = useState<{ id: number; display_name: string }[]>([])
  const [oosSearching, setOosSearching] = useState(false)
  const [editingNewOos, setEditingNewOos] = useState(false)
  const [newOosName,   setNewOosName]   = useState('')
  const [creating,     setCreating]     = useState(false)
  const [createError,  setCreateError]  = useState(false)

  const [nicknaming,     setNicknaming]     = useState(false)
  const [nicknameMsg,    setNicknameMsg]    = useState<string | null>(null)
  const [nicknameError,  setNicknameError]  = useState<string | null>(null)

  // A garbled school name from a nickname parse always has ") " in it
  // e.g. "Liam) McSorley (Shawnee" — reliable signal, real school names don't contain ") "
  const isNicknameParse = rawName.includes(') ') && associatedWrestlers.length > 0

  const search = useCallback((q: string) => {
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/admin/search-schools?q=${encodeURIComponent(q)}`)
        setResults((await res.json()).schools ?? [])
      } finally { setSearching(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [])

  const searchOos = useCallback((q: string) => {
    setOosQuery(q)
    if (!q.trim()) { setOosResults([]); return }
    const t = setTimeout(async () => {
      setOosSearching(true)
      try {
        const res = await fetch(`/api/admin/search-schools?q=${encodeURIComponent(q)}&oos=true`)
        setOosResults((await res.json()).schools ?? [])
      } finally { setOosSearching(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [])

  const confirmNJ = useCallback((school: { id: number; display_name: string }) => {
    onOverride(rawName, { schoolId: school.id, displayName: school.display_name })
    setQuery(''); setResults([])
  }, [rawName, onOverride])

  const confirmExistingOos = useCallback((school: { id: number; display_name: string }) => {
    onOverride(rawName, { schoolId: school.id, displayName: school.display_name, isOutOfState: true })
    setOosQuery(''); setOosResults([])
  }, [rawName, onOverride])

  const createNewOos = useCallback(async () => {
    const name = newOosName.trim()
    if (!name) return
    setCreating(true)
    setCreateError(false)
    try {
      const res = await fetch('/api/admin/create-oos-school', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ display_name: name }),
      })
      if (!res.ok) throw new Error()
      const { school } = await res.json()
      onOverride(rawName, { schoolId: school.id, displayName: school.display_name, isOutOfState: true })
      setEditingNewOos(false)
    } catch { setCreateError(true) }
    finally { setCreating(false) }
  }, [rawName, newOosName, onOverride])

  const markNotNJ = useCallback(() => {
    onOverride(rawName, { schoolId: null, displayName: rawName, isOutOfState: true })
  }, [rawName, onOverride])

  const handleNickname = useCallback(async () => {
    setNicknaming(true)
    setNicknameError(null)
    setNicknameMsg(null)
    try {
      // Use the first associated wrestler name — there's typically only one per garbled school
      const wrestlerRawName = associatedWrestlers[0]
      const reconstructed   = `${wrestlerRawName} (${rawName})`

      const res = await fetch('/api/admin/resolve-nickname-wrestler', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reconstructed, gender }),
      })
      const data = await res.json()
      if (!res.ok) { setNicknameError(data.error ?? 'Failed'); return }

      const { wrestler, school, created } = data as {
        wrestler: { id: string; displayName: string }
        school:   { id: number | null; displayName: string | null; confidence: string }
        created:  boolean
      }

      // Update any existing wrestler review entries that match this wrestler name
      for (const wName of associatedWrestlers) {
        const override: WrestlerOverride = {
          wrestlerId:   wrestler.id,
          displayName:  wrestler.displayName,
          confirmedNew: false,
        }
        for (const key of Object.keys(wrestlerResolutions)) {
          const keyName = key.split('|')[0]
          if (keyName === wName) onWrestlerOverride(key, override)
        }
      }

      // Auto-confirm the school if confidence is reliable
      const autoConfidences = new Set(['exact', 'alias', 'high', 'oos'])
      if (school?.id && autoConfidences.has(school.confidence)) {
        onOverride(rawName, {
          schoolId:     school.id,
          displayName:  school.displayName ?? schoolRawFromGarbled(rawName),
          isOutOfState: school.confidence === 'oos',
        })
        // Card transitions to resolved state — no need to show a message
      } else {
        // Wrestler handled but school needs manual confirmation
        const action = created ? 'Created' : 'Linked'
        setNicknameMsg(`${action} ${wrestler.displayName}. School "${schoolRawFromGarbled(rawName)}" needs manual confirmation below.`)
      }
    } catch {
      setNicknameError('Unexpected error — try again')
    } finally {
      setNicknaming(false)
    }
  }, [rawName, associatedWrestlers, gender, wrestlerResolutions, onWrestlerOverride, onOverride])

  const njAlts  = match.alternates.filter(a => !a.isOos)
  const oosAlts = match.alternates.filter(a => a.isOos)

  // ── Resolved ────────────────────────────────────────────────────────────────
  if (override) {
    const label = override.isOutOfState
      ? (override.schoolId ? `→ OOS: ${override.displayName}` : '→ Not a NJ school')
      : `→ ${override.displayName}`
    return (
      <div className="border border-slate-200 rounded p-3 text-sm bg-white flex items-center justify-between">
        <div>
          <span className="font-medium text-slate-800">{rawName}</span>
          <span className="text-slate-400 ml-2 text-xs">{boutCount} bout{boutCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${override.isOutOfState ? 'text-amber-700' : 'text-green-700'}`}>
            {label}
          </span>
          <button
            onClick={() => onOverride(rawName, null)}
            className="text-xs text-slate-400 hover:text-slate-700 underline"
          >
            undo
          </button>
        </div>
      </div>
    )
  }

  // ── Decision required ───────────────────────────────────────────────────────
  return (
    <div className="border border-slate-200 rounded p-3 text-sm bg-white">

      {/* Header: name · bout count · confidence */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="font-medium text-slate-800">{rawName}</span>
          <span className="text-slate-400 ml-2 text-xs">{boutCount} bout{boutCount !== 1 ? 's' : ''}</span>
        </div>
        <ConfidenceBadge confidence={match.confidence} />
      </div>

      {/* NJ alternates */}
      {njAlts.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {njAlts.map(a => (
            <button
              key={a.schoolId}
              onClick={() => confirmNJ({ id: a.schoolId, display_name: a.displayName })}
              className="text-xs px-2 py-0.5 border border-slate-300 hover:border-black hover:bg-slate-50 transition-colors"
            >
              {a.displayName} <span className="text-slate-400">({(a.score * 100).toFixed(0)}%)</span>
            </button>
          ))}
        </div>
      )}

      {/* OOS alternates */}
      {oosAlts.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-slate-400 mb-1">Existing OOS schools:</p>
          <div className="flex flex-wrap gap-1.5">
            {oosAlts.map(a => (
              <button
                key={a.schoolId}
                onClick={() => confirmExistingOos({ id: a.schoolId, display_name: a.displayName })}
                className="text-xs px-2 py-0.5 border border-amber-300 text-amber-800 hover:border-amber-500 hover:bg-amber-50 transition-colors"
              >
                OOS: {a.displayName} <span className="text-amber-500">({(a.score * 100).toFixed(0)}%)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {/* NJ search row */}
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-32">
            <input
              type="text"
              placeholder="Search NJ schools…"
              value={query}
              onChange={e => search(e.target.value)}
              onBlur={() => setTimeout(() => setResults([]), 150)}
              className="w-full text-xs border border-slate-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black"
            />
            {searching && <span className="absolute right-2 top-1 text-slate-400 text-xs">…</span>}
            {results.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 border border-slate-300 bg-white shadow-sm">
                {results.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { confirmNJ(s); setResults([]) }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50"
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={markNotNJ}
            className="text-xs px-2 py-1 border border-slate-300 hover:border-black text-slate-500 hover:text-black transition-colors whitespace-nowrap"
          >
            Not a school
          </button>
        </div>

        {/* OOS search row */}
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-32">
            <input
              type="text"
              placeholder="Search existing OOS schools…"
              value={oosQuery}
              onChange={e => searchOos(e.target.value)}
              onBlur={() => setTimeout(() => setOosResults([]), 150)}
              className="w-full text-xs border border-amber-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            {oosSearching && <span className="absolute right-2 top-1 text-amber-400 text-xs">…</span>}
            {oosResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 border border-amber-200 bg-white shadow-sm">
                {oosResults.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { confirmExistingOos(s); setOosResults([]) }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50 text-amber-800"
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => { setNewOosName(normalizeForDisplay(rawName)); setEditingNewOos(true) }}
            disabled={creating}
            className="text-xs px-2 py-1 border border-amber-300 text-amber-700 hover:border-amber-500 hover:bg-amber-50 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            New OOS school
          </button>
        </div>

        {/* Inline new OOS name editor */}
        {editingNewOos && (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={newOosName}
              onChange={e => setNewOosName(e.target.value)}
              autoFocus
              placeholder="Display name…"
              className="flex-1 text-xs border border-amber-400 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              onClick={createNewOos}
              disabled={!newOosName.trim() || creating}
              className="text-xs px-2 py-1 bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => setEditingNewOos(false)}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              cancel
            </button>
          </div>
        )}

        {createError && <p className="text-xs text-red-500">Failed to create school — try again</p>}

        {/* Nickname parse row — only shown when the school name is garbled by a nickname */}
        {isNicknameParse && (
          <div className="pt-1.5 border-t border-slate-100">
            {!nicknameMsg && (
              <button
                onClick={handleNickname}
                disabled={nicknaming}
                className="text-xs px-2 py-1 border border-purple-300 text-purple-700 hover:border-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {nicknaming ? 'Resolving…' : 'Wrestler has nickname →'}
              </button>
            )}
            {nicknameMsg  && <p className="text-xs text-purple-700">{nicknameMsg}</p>}
            {nicknameError && <p className="text-xs text-red-500">{nicknameError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

/** Extract the school portion from a garbled school name like "Liam) McSorley (Shawnee" */
function schoolRawFromGarbled(garbled: string): string {
  const lastParen = garbled.lastIndexOf('(')
  return lastParen >= 0 ? garbled.slice(lastParen + 1).trim() : garbled
}

// ── ReviewPanel ────────────────────────────────────────────────────────────────

type Props = {
  meets:               ParsedMeet[]
  schoolResolutions:   Record<string, SchoolMatch>
  schoolOverrides:     Record<string, SchoolOverride>
  onSchoolOverride:    (rawName: string, o: SchoolOverride | null) => void
  wrestlerResolutions: Record<string, WrestlerMatch>
  onWrestlerOverride:  (key: string, o: WrestlerOverride | null) => void
  gender:              'M' | 'F'
}

export function ReviewPanel({
  meets,
  schoolResolutions,
  schoolOverrides,
  onSchoolOverride,
  wrestlerResolutions,
  onWrestlerOverride,
  gender,
}: Props) {
  const boutCountBySchool = new Map<string, number>()
  // Garbled school raw name → set of wrestler raw names associated with it
  const wrestlersBySchool = new Map<string, Set<string>>()

  for (const meet of meets) {
    for (const m of meet.matches) {
      for (const [schoolRaw, wrestlerName] of [
        [m.winnerSchoolRaw, m.winnerName],
        [m.loserSchoolRaw,  m.loserName],
      ] as [string | null, string | null][]) {
        if (!schoolRaw) continue
        boutCountBySchool.set(schoolRaw, (boutCountBySchool.get(schoolRaw) ?? 0) + 1)
        if (wrestlerName) {
          if (!wrestlersBySchool.has(schoolRaw)) wrestlersBySchool.set(schoolRaw, new Set())
          wrestlersBySchool.get(schoolRaw)!.add(wrestlerName)
        }
      }
    }
  }

  const schoolItems: { rawName: string; match: SchoolMatch; boutCount: number }[] = []
  const seen = new Set<string>()

  const collect = (rawName: string | null | undefined) => {
    if (!rawName || seen.has(rawName)) return
    seen.add(rawName)
    const res = resolveSchool(rawName, schoolResolutions, schoolOverrides)
    if (res.confidence === 'low' || res.confidence === 'none') {
      const match = schoolResolutions[rawName]
      if (match) schoolItems.push({ rawName, match, boutCount: boutCountBySchool.get(rawName) ?? 0 })
    }
  }

  for (const meet of meets) {
    collect(meet.team1Name)
    collect(meet.team2Name)
    for (const m of meet.matches) {
      collect(m.winnerSchoolRaw)
      collect(m.loserSchoolRaw)
    }
  }

  schoolItems.sort((a, b) => b.boutCount - a.boutCount)

  if (schoolItems.length === 0) return null

  return (
    <div>
      <h2 className="font-semibold text-slate-700 mb-1">
        School Decisions
        <span className="ml-2 text-sm font-normal text-slate-400">
          {schoolItems.filter(s => schoolOverrides[s.rawName]).length} of {schoolItems.length} decided
        </span>
      </h2>
      <p className="text-xs text-slate-400 mb-3">
        Every unresolved school requires a decision. Sorted by bout count.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {schoolItems.map(({ rawName, match, boutCount }) => (
          <SchoolFlagCard
            key={rawName}
            rawName={rawName}
            match={match}
            boutCount={boutCount}
            override={schoolOverrides[rawName]}
            onOverride={onSchoolOverride}
            associatedWrestlers={[...(wrestlersBySchool.get(rawName) ?? [])]}
            wrestlerResolutions={wrestlerResolutions}
            onWrestlerOverride={onWrestlerOverride}
            gender={gender}
          />
        ))}
      </div>
    </div>
  )
}
