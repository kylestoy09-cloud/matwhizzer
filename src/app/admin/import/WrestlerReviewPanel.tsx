'use client'

import { Fragment, useState, useEffect, useMemo } from 'react'
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
  onSelect,
}: {
  schoolId:   number | null
  panelKey:   WrestlerKey
  override:   WrestlerOverride | undefined
  onSelect:   (wrestlerId: string, displayName: string) => void
}) {
  const [query,   setQuery]   = useState('')
  const [roster,  setRoster]  = useState<{ wrestlerId: string; displayName: string; weights: number[] }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!schoolId) return
    setLoading(true)
    fetch(`/api/admin/school-wrestlers?schoolId=${schoolId}`)
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
  onOverride,
  onClose,
}: {
  wKey:        WrestlerKey
  rawName:     string
  schoolRaw:   string | null
  schoolId:    number | null
  weightClass: number
  match:       WrestlerMatch | undefined
  override:    WrestlerOverride | undefined
  onOverride:  (key: WrestlerKey, o: WrestlerOverride | null) => void
  onClose?:    () => void
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
        {override && !isConfirmedNew && (
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
}

// ── WrestlerReviewPanel ────────────────────────────────────────────────────────

export function WrestlerReviewPanel({
  meets,
  schoolResolutions,
  schoolOverrides,
  wrestlerResolutions,
  wrestlerOverrides,
  onWrestlerOverride,
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
          const schoolId  = schoolRes.schoolId
          const key       = makeWrestlerKey(name, schoolId, m.weightClass)
          if (seen.has(key)) continue
          seen.add(key)

          const resolved = resolveWrestler(key, wrestlerResolutions, wrestlerOverrides)
          const rawMatch = wrestlerResolutions[key]
          const item: WrestlerItem = {
            key,
            rawName:       name,
            schoolRaw:     schoolRaw ?? null,
            schoolId,
            schoolDisplay: schoolRes.displayName ?? schoolRaw ?? '(unknown)',
            weightClass:   m.weightClass,
            match:         rawMatch,
          }

          if (resolved.confidence === 'low') {
            low.push(item)
          } else if (resolved.isNew) {
            newW.push(item)
          }
        }
      }
    }

    // Sort low-conf by school then name
    low.sort((a, b) => a.schoolDisplay.localeCompare(b.schoolDisplay) || a.rawName.localeCompare(b.rawName))
    // Sort new by school then weight
    newW.sort((a, b) => a.schoolDisplay.localeCompare(b.schoolDisplay) || a.weightClass - b.weightClass)

    return { lowItems: low, newItems: newW }
  }, [meets, schoolResolutions, schoolOverrides, wrestlerResolutions, wrestlerOverrides])

  // ── Group new wrestlers by school ──────────────────────────────────────────

  const newBySchool = useMemo(() => {
    const map = new Map<string, WrestlerItem[]>()
    const filter = newFilter.toLowerCase().trim()
    for (const item of newItems) {
      if (filter && !item.rawName.toLowerCase().includes(filter) && !item.schoolDisplay.toLowerCase().includes(filter)) continue
      const bucket = map.get(item.schoolDisplay) ?? []
      bucket.push(item)
      map.set(item.schoolDisplay, bucket)
    }
    return map
  }, [newItems, newFilter])

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

              {/* Filter */}
              <input
                type="text"
                value={newFilter}
                onChange={e => setNewFilter(e.target.value)}
                placeholder="Filter by name or school…"
                className="w-full text-xs border border-black/20 px-2 py-1.5 outline-none focus:border-black mb-4 bg-white"
              />

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
                {[...newBySchool.entries()].map(([school, items]) => {
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
                          {items.length} wrestler{items.length !== 1 ? 's' : ''}
                          {' '}{isOpen ? '▲' : '▼'}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="border-t border-black/10">
                          {items.map(item => {
                            const override    = wrestlerOverrides[item.key]
                            const isActive    = activeKey === item.key
                            const isFixed     = !!override

                            return (
                              <Fragment key={item.key}>
                                <div
                                  className={`flex items-center gap-3 px-3 py-1.5 cursor-pointer border-b border-black/5 last:border-0 ${
                                    isFixed ? 'bg-green-50' : 'hover:bg-amber-50'
                                  }`}
                                  onClick={() => setActiveKey(prev => prev === item.key ? null : item.key)}
                                >
                                  <span className="text-[11px] font-mono text-slate-400 w-8 shrink-0">
                                    {item.weightClass}
                                  </span>
                                  <span className="text-xs text-slate-800 flex-1">{item.rawName}</span>
                                  {isFixed && (
                                    <span className="text-[10px] font-bold px-1 py-0.5 bg-green-100 text-green-700 border border-green-300 shrink-0">
                                      {override.confirmedNew ? '✓ new' : `→ ${override.displayName}`}
                                    </span>
                                  )}
                                  {!isFixed && (
                                    <span className="text-[10px] text-red-600 font-semibold shrink-0">NEW</span>
                                  )}
                                </div>

                                {isActive && (
                                  <WrestlerCard
                                    wKey={item.key}
                                    rawName={item.rawName}
                                    schoolRaw={item.schoolRaw}
                                    schoolId={item.schoolId}
                                    weightClass={item.weightClass}
                                    match={item.match}
                                    override={override}
                                    onOverride={onWrestlerOverride}
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
