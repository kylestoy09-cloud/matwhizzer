'use client'

import { Fragment, useState, useEffect, useMemo, useCallback } from 'react'
import type { ParsedMeet } from '@/lib/parseDualMeet'
import type { WrestlerMatch } from '@/lib/matchWrestlers'
import {
  type SchoolMatch,
  type SchoolOverride,
  type WrestlerOverride,
  type WrestlerKey,
  makeWrestlerKey,
  resolveSchool,
  resolveWrestler,
} from './types'

// ── School roster search ───────────────────────────────────────────────────────

function RosterSearch({
  schoolId,
  panelKey,
  override,
  gender,
  onSelect,
}: {
  schoolId:   number | null
  panelKey:   WrestlerKey
  override:   WrestlerOverride | undefined
  gender:     'M' | 'F'
  onSelect:   (wrestlerId: string, displayName: string) => void
}) {
  const [query,   setQuery]   = useState('')
  const [roster,  setRoster]  = useState<{ wrestlerId: string; displayName: string; weights: number[] }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!schoolId) return
    setLoading(true)
    fetch(`/api/admin/school-wrestlers?schoolId=${schoolId}&gender=${gender}`)
      .then(r => r.json())
      .then(j => setRoster(j.wrestlers ?? []))
      .finally(() => setLoading(false))
  }, [schoolId])

  if (!schoolId) return <p className="text-xs text-slate-400 italic">No school resolved.</p>
  if (loading)   return <p className="text-xs text-slate-400 italic">Loading roster…</p>

  const filtered = query.trim()
    ? roster.filter(w => w.displayName.toLowerCase().includes(query.toLowerCase()))
    : roster

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search roster by name…"
        className="w-full text-xs border border-black/30 px-2 py-1 outline-none focus:border-black mb-2"
      />
      <div className="max-h-40 overflow-y-auto space-y-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            {roster.length === 0 ? 'No wrestlers on file.' : 'No matches.'}
          </p>
        ) : filtered.map(w => (
          <label key={w.wrestlerId} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`roster-${panelKey}`}
              checked={!override?.confirmedNew && override?.wrestlerId === w.wrestlerId}
              onChange={() => onSelect(w.wrestlerId, w.displayName)}
              className="accent-black"
            />
            <span className="text-xs text-slate-800">{w.displayName}</span>
            <span className="text-xs text-slate-400">{w.weights.join(', ')}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ── Wrestler resolution card ───────────────────────────────────────────────────
// Used for both low-confidence items and new wrestlers that the user clicks into.

function WrestlerCard({
  wKey,
  rawName,
  schoolRaw,
  schoolId,
  weightClass,
  match,
  override,
  gender,
  sameSchoolNew,
  onOverride,
  onClose,
}: {
  wKey:          WrestlerKey
  rawName:       string
  schoolRaw:     string | null
  schoolId:      number | null
  weightClass:   number
  match:         WrestlerMatch | undefined
  override:      WrestlerOverride | undefined
  gender:        'M' | 'F'
  sameSchoolNew: { key: WrestlerKey; rawName: string; weights: number[] }[]
  onOverride:    (key: WrestlerKey, o: WrestlerOverride | null) => void
  onClose?:      () => void
}) {
  const alternates = match?.alternates ?? []
  const isConfirmedNew = override?.confirmedNew === true

  return (
    <div className="border-t border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-semibold text-slate-700">
          <span className="font-mono">{rawName}</span>
          {schoolRaw && <span className="text-slate-400 font-normal ml-1">({schoolRaw})</span>}
          <span className="text-slate-400 font-normal ml-2">{weightClass}lb</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm leading-none ml-4 shrink-0"
          >×</button>
        )}
      </div>

      {alternates.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {alternates.map(alt => (
            <label key={alt.wrestlerId} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`wcard-${wKey}`}
                checked={!isConfirmedNew && override?.wrestlerId === alt.wrestlerId}
                onChange={() => onOverride(wKey, {
                  wrestlerId:   alt.wrestlerId,
                  displayName:  alt.displayName,
                  confirmedNew: false,
                })}
                className="accent-black"
              />
              <span className="text-xs text-slate-800">{alt.displayName}</span>
              <span className="text-xs text-slate-400">{(alt.score * 100).toFixed(0)}%</span>
            </label>
          ))}
        </div>
      )}

      {alternates.length === 0 && (
        <div className="mb-3">
          <RosterSearch
            schoolId={schoolId}
            panelKey={wKey}
            override={override}
            gender={gender}
            onSelect={(wrestlerId, displayName) =>
              onOverride(wKey, { wrestlerId, displayName, confirmedNew: false })
            }
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => onOverride(
            wKey,
            isConfirmedNew
              ? null
              : { wrestlerId: null, displayName: null, confirmedNew: true },
          )}
          className={`text-xs px-3 py-1 border ${
            isConfirmedNew
              ? 'border-slate-300 bg-slate-100 text-slate-500'
              : 'border-black bg-white hover:bg-slate-50 text-slate-800'
          }`}
        >
          {isConfirmedNew ? '✓ Confirmed new — undo' : 'Confirm as New Wrestler'}
        </button>
        {override && !isConfirmedNew && !override.linkedToKey && (
          <button
            onClick={() => onOverride(wKey, null)}
            className="text-[11px] text-slate-400 hover:text-slate-700 underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Link to another name in this import */}
      {sameSchoolNew.length > 0 && (
        <div className="mt-3 pt-3 border-t border-amber-200">
          <p className="text-[11px] text-slate-500 mb-2 font-medium">
            Same person as another name in this import:
          </p>
          <div className="space-y-1">
            {sameSchoolNew.map(other => (
              <label key={other.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`link-${wKey}`}
                  checked={override?.linkedToKey === other.key}
                  onChange={() => onOverride(wKey, {
                    wrestlerId: null, displayName: null, confirmedNew: false,
                    linkedToKey: other.key,
                  })}
                  className="accent-black"
                />
                <span className="text-xs text-slate-800">{other.rawName}</span>
                <span className="text-xs text-slate-400">{other.weights.join('/')}</span>
              </label>
            ))}
          </div>
          {override?.linkedToKey && (
            <button
              onClick={() => onOverride(wKey, null)}
              className="text-[11px] text-slate-400 hover:text-slate-700 underline mt-1"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────

type WrestlerItem = {
  key:              WrestlerKey
  rawName:          string
  schoolRaw:        string | null
  schoolId:         number | null
  schoolDisplay:    string
  weightClass:      number
  match:            WrestlerMatch | undefined
}

// ── Props ──────────────────────────────────────────────────────────────────────

type Props = {
  meets:               ParsedMeet[]
  schoolResolutions:   Record<string, SchoolMatch>
  schoolOverrides:     Record<string, SchoolOverride>
  wrestlerResolutions: Record<string, WrestlerMatch>
  wrestlerOverrides:   Record<string, WrestlerOverride>
  onWrestlerOverride:  (key: WrestlerKey, o: WrestlerOverride | null) => void
  gender:              'M' | 'F'
}

// ── WrestlerReviewPanel ────────────────────────────────────────────────────────

export function WrestlerReviewPanel({
  meets,
  schoolResolutions,
  schoolOverrides,
  wrestlerResolutions,
  wrestlerOverrides,
  onWrestlerOverride,
  gender,
}: Props) {
  const [open,          setOpen]          = useState(true)
  const [activeKey,     setActiveKey]     = useState<WrestlerKey | null>(null)
  const [openSchools,   setOpenSchools]   = useState<Set<string>>(new Set())
  const [newFilter,     setNewFilter]     = useState('')

  // ── Collect and categorise wrestler items ──────────────────────────────────

  const { lowItems, newItems } = useMemo(() => {
    const seen = new Set<WrestlerKey>()
    const low: WrestlerItem[]  = []
    const newW: WrestlerItem[] = []

    for (const meet of meets) {
      for (const m of meet.matches) {
        if (m.isDoubleForfeit) continue

        const pairs: [string | null, string | null][] = [
          [m.winnerName, m.winnerSchoolRaw],
          ...(!m.isForfeitWin ? [[m.loserName, m.loserSchoolRaw] as [string | null, string | null]] : []),
        ]

        for (const [name, schoolRaw] of pairs) {
          if (!name) continue
          const schoolRes = resolveSchool(schoolRaw ?? '', schoolResolutions, schoolOverrides)
          if (schoolRes.isOutOfState) continue
          const schoolId  = schoolRes.schoolId
          const key       = makeWrestlerKey(name, schoolId, m.weightClass)
          if (seen.has(key)) continue
          seen.add(key)

          const resolved = resolveWrestler(key, wrestlerResolutions, wrestlerOverrides)
          const rawMatch = wrestlerResolutions[key]
          // Classify by the PRE-OVERRIDE match state so that an accidentally-linked
          // "new" wrestler stays visible in the new section and can be undone.
          const originallyNew = !rawMatch || rawMatch.isNew
          const item: WrestlerItem = {
            key,
            rawName:       name,
            schoolRaw:     schoolRaw ?? null,
            schoolId,
            schoolDisplay: schoolRes.displayName ?? schoolRaw ?? '(unknown)',
            weightClass:   m.weightClass,
            match:         rawMatch,
          }

          if (resolved.confidence === 'low' && !originallyNew) {
            low.push(item)
          } else if (originallyNew) {
            newW.push(item)
          }
        }
      }
    }

    // Sort low-conf by school then name
    low.sort((a, b) => a.schoolDisplay.localeCompare(b.schoolDisplay) || a.rawName.localeCompare(b.rawName))
    // Sort new by school then name then weight
    newW.sort((a, b) =>
      a.schoolDisplay.localeCompare(b.schoolDisplay) ||
      a.rawName.localeCompare(b.rawName) ||
      a.weightClass - b.weightClass
    )

    return { lowItems: low, newItems: newW }
  }, [meets, schoolResolutions, schoolOverrides, wrestlerResolutions, wrestlerOverrides])

  // ── Group new wrestlers by school, then merge same name into a single row ──
  // Same wrestler at different weight classes = one display row with all weights.

  type NewGroup = {
    groupKey: string        // `${rawName}|${schoolId ?? 'null'}`
    rawName: string
    schoolRaw: string | null
    schoolId: number | null
    schoolDisplay: string
    keys: WrestlerKey[]     // one key per weight class occurrence
    weights: number[]       // sorted weight classes
    primaryMatch: WrestlerMatch | undefined
  }

  const newBySchool = useMemo(() => {
    const map = new Map<string, NewGroup[]>()
    const filter = newFilter.toLowerCase().trim()
    for (const item of newItems) {
      if (filter && !item.rawName.toLowerCase().includes(filter) && !item.schoolDisplay.toLowerCase().includes(filter)) continue
      const groupKey = `${item.rawName}|${item.schoolId ?? 'null'}`
      const schoolGroups = map.get(item.schoolDisplay) ?? []
      const existing = schoolGroups.find(g => g.groupKey === groupKey)
      if (existing) {
        existing.keys.push(item.key)
        existing.weights.push(item.weightClass)
        existing.weights.sort((a, b) => a - b)
      } else {
        schoolGroups.push({
          groupKey,
          rawName:       item.rawName,
          schoolRaw:     item.schoolRaw,
          schoolId:      item.schoolId,
          schoolDisplay: item.schoolDisplay,
          keys:          [item.key],
          weights:       [item.weightClass],
          primaryMatch:  item.match,
        })
        map.set(item.schoolDisplay, schoolGroups)
      }
    }
    return map
  }, [newItems, newFilter])

  // Apply an override to every key in a group (same name+school, different weights)
  const handleGroupOverride = useCallback((group: NewGroup, override: WrestlerOverride | null) => {
    for (const k of group.keys) {
      onWrestlerOverride(k, override)
    }
  }, [onWrestlerOverride])

  // Batch-confirm all unresolved new wrestlers as new
  const handleConfirmAllNew = useCallback(() => {
    for (const item of newItems) {
      if (!wrestlerOverrides[item.key]) {
        onWrestlerOverride(item.key, { wrestlerId: null, displayName: null, confirmedNew: true })
      }
    }
  }, [newItems, wrestlerOverrides, onWrestlerOverride])

  const totalLowPending = lowItems.filter(i => !wrestlerOverrides[i.key]).length

  if (lowItems.length === 0 && newItems.length === 0) return null

  const summaryLabel = [
    totalLowPending > 0 ? `${totalLowPending} need review` : null,
    newItems.length  > 0 ? `${newItems.length} new to create` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="border border-black bg-white mt-4">

      {/* ── Panel header ────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-red-50 border-b border-black hover:bg-red-100 transition-colors"
      >
        <span className="text-sm font-semibold text-red-900">
          Wrestlers — {summaryLabel}
        </span>
        <span className="text-red-700 text-xs">{open ? '▲ Collapse' : '▼ Expand'}</span>
      </button>

      {open && (
        <div className="divide-y divide-black/10">

          {/* ── LOW CONFIDENCE ──────────────────────────────────────────────── */}
          {lowItems.length > 0 && (
            <div className="p-4">
              <h3 className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-3">
                Low confidence — fuzzy match found, decision needed ({lowItems.length})
              </h3>
              <div className="space-y-3">
                {lowItems.map(item => {
                  const override  = wrestlerOverrides[item.key]
                  const isResolved = !!override

                  return (
                    <div key={item.key} className="border border-black/20 bg-white">
                      <div
                        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50"
                        onClick={() => setActiveKey(prev => prev === item.key ? null : item.key)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isResolved
                            ? <span className="text-[10px] font-bold px-1 py-0.5 bg-green-100 text-green-700 border border-green-300 shrink-0">✓</span>
                            : <span className="text-[10px] font-bold px-1 py-0.5 bg-orange-100 text-orange-700 border border-orange-300 shrink-0">?</span>
                          }
                          <span className="text-xs font-semibold text-slate-800 truncate">{item.rawName}</span>
                          <span className="text-xs text-slate-400 shrink-0">({item.schoolRaw})</span>
                          <span className="text-xs text-slate-400 shrink-0">{item.weightClass}lb</span>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0 ml-2">
                          {activeKey === item.key ? '▲' : '▼'}
                        </span>
                      </div>

                      {activeKey === item.key && (
                        <WrestlerCard
                          wKey={item.key}
                          rawName={item.rawName}
                          schoolRaw={item.schoolRaw}
                          schoolId={item.schoolId}
                          weightClass={item.weightClass}
                          match={item.match}
                          override={override}
                          gender={gender}
                          sameSchoolNew={[]}
                          onOverride={onWrestlerOverride}
                          onClose={() => setActiveKey(null)}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── NEW WRESTLERS ────────────────────────────────────────────────── */}
          {newItems.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  New wrestlers to create ({newItems.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Scan for reversed names / typos — click to fix
                </p>
              </div>

              {/* Filter + batch confirm */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newFilter}
                  onChange={e => setNewFilter(e.target.value)}
                  placeholder="Filter by name or school…"
                  className="flex-1 text-xs border border-black/20 px-2 py-1.5 outline-none focus:border-black bg-white"
                />
                <button
                  onClick={handleConfirmAllNew}
                  className="shrink-0 text-[11px] font-semibold px-3 py-1.5 border border-black bg-white hover:bg-slate-50 text-slate-800"
                  title="Mark every un-reviewed wrestler as a new person to create"
                >
                  Confirm all as new
                </button>
              </div>

              {/* Expand / collapse all */}
              <div className="flex gap-3 mb-3">
                <button
                  onClick={() => setOpenSchools(new Set(newBySchool.keys()))}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                >
                  Expand all schools
                </button>
                <button
                  onClick={() => setOpenSchools(new Set())}
                  className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                >
                  Collapse all
                </button>
              </div>

              {/* By-school groups */}
              <div className="space-y-2">
                {[...newBySchool.entries()].map(([school, groups]) => {
                  const isOpen = openSchools.has(school)

                  return (
                    <div key={school} className="border border-black/15 bg-white">
                      <button
                        onClick={() => setOpenSchools(prev => {
                          const next = new Set(prev)
                          isOpen ? next.delete(school) : next.add(school)
                          return next
                        })}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 text-left"
                      >
                        <span className="text-xs font-semibold text-slate-800">{school}</span>
                        <span className="text-xs text-slate-400">
                          {groups.length} wrestler{groups.length !== 1 ? 's' : ''}
                          {' '}{isOpen ? '▲' : '▼'}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="border-t border-black/10">
                          {groups.map(group => {
                            // Group is "fixed" if every key has an override
                            const overrides = group.keys.map(k => wrestlerOverrides[k])
                            const primaryOverride = overrides[0]
                            const isFixed   = overrides.every(Boolean)
                            const isActive  = activeKey === group.groupKey

                            // Sibling groups for "same person as" linking
                            const siblings = groups
                              .filter(g => g.groupKey !== group.groupKey)
                              .map(g => ({ key: g.keys[0], rawName: g.rawName, weights: g.weights }))

                            // Resolve linked display name
                            const linkedRawName = primaryOverride?.linkedToKey
                              ? groups.find(g => g.keys[0] === primaryOverride.linkedToKey)?.rawName
                                ?? primaryOverride.linkedToKey.split('|')[0]
                              : null

                            return (
                              <Fragment key={group.groupKey}>
                                <div
                                  className={`flex items-center gap-3 px-3 py-1.5 cursor-pointer border-b border-black/5 last:border-0 ${
                                    isFixed ? 'bg-green-50' : 'hover:bg-amber-50'
                                  }`}
                                  onClick={() => setActiveKey(prev => prev === group.groupKey ? null : group.groupKey)}
                                >
                                  <span className="text-[11px] font-mono text-slate-400 w-10 shrink-0">
                                    {group.weights.join('/')}
                                  </span>
                                  <span className="text-xs text-slate-800 flex-1">{group.rawName}</span>
                                  {isFixed && primaryOverride && (
                                    <span className="text-[10px] font-bold px-1 py-0.5 bg-green-100 text-green-700 border border-green-300 shrink-0">
                                      {primaryOverride.confirmedNew
                                        ? '✓ new'
                                        : linkedRawName
                                          ? `→ same as ${linkedRawName}`
                                          : `→ ${primaryOverride.displayName}`}
                                    </span>
                                  )}
                                  {!isFixed && (
                                    <span className="text-[10px] text-red-600 font-semibold shrink-0">NEW</span>
                                  )}
                                </div>

                                {isActive && (
                                  <WrestlerCard
                                    wKey={group.keys[0]}
                                    rawName={group.rawName}
                                    schoolRaw={group.schoolRaw}
                                    schoolId={group.schoolId}
                                    weightClass={group.weights[0]}
                                    match={group.primaryMatch}
                                    override={primaryOverride}
                                    gender={gender}
                                    sameSchoolNew={siblings}
                                    onOverride={(_, o) => handleGroupOverride(group, o)}
                                    onClose={() => setActiveKey(null)}
                                  />
                                )}
                              </Fragment>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
