'use client'

import { useState, useCallback, useMemo } from 'react'
import { parseDualMeetText } from '@/lib/parseDualMeet'
import type { ParsedMeet } from '@/lib/parseDualMeet'
import type { SchoolMatch } from '@/lib/matchSchools'
import type { WrestlerMatch } from '@/lib/matchWrestlers'
import {
  type SchoolOverride,
  type WrestlerOverride,
  type WrestlerKey,
  makeWrestlerKey,
  resolveSchool,
} from './types'
import { MeetCard }    from './MeetCard'
import { ReviewPanel } from './ReviewPanel'

// ── Phase ──────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'loading_schools' | 'loading_wrestlers' | 'review'

// ── ImportClient ───────────────────────────────────────────────────────────────

export function ImportClient() {
  const [phase,              setPhase]              = useState<Phase>('idle')
  const [rawText,            setRawText]            = useState('')
  const [meets,              setMeets]              = useState<ParsedMeet[]>([])
  const [schoolResolutions,  setSchoolResolutions]  = useState<Record<string, SchoolMatch>>({})
  const [schoolOverrides,    setSchoolOverrides]    = useState<Record<string, SchoolOverride>>({})
  const [wrestlerResolutions,setWrestlerResolutions]= useState<Record<string, WrestlerMatch>>({})
  const [wrestlerOverrides,  setWrestlerOverrides]  = useState<Record<string, WrestlerOverride>>({})
  const [skipped,            setSkipped]            = useState<Set<number>>(new Set())
  const [error,              setError]              = useState<string | null>(null)
  const [toast,              setToast]              = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  // ── School override handler ──────────────────────────────────────────────────

  const handleSchoolOverride = useCallback((rawName: string, o: SchoolOverride | null) => {
    setSchoolOverrides(prev => {
      const next = { ...prev }
      if (o === null) delete next[rawName]
      else next[rawName] = o
      return next
    })
  }, [])

  // ── Wrestler override handler ────────────────────────────────────────────────

  const handleWrestlerOverride = useCallback((key: WrestlerKey, o: WrestlerOverride | null) => {
    setWrestlerOverrides(prev => {
      const next = { ...prev }
      if (o === null) delete next[key]
      else next[key] = o
      return next
    })
  }, [])

  // ── Skip handler ─────────────────────────────────────────────────────────────

  const handleSkip = useCallback((idx: number, skip: boolean) => {
    setSkipped(prev => {
      const next = new Set(prev)
      if (skip) next.add(idx)
      else      next.delete(idx)
      return next
    })
  }, [])

  // ── Main process function ────────────────────────────────────────────────────

  async function handleProcess() {
    setError(null)
    const text = rawText.trim()
    if (!text) return

    // Step 1: parse (synchronous)
    const parsed = parseDualMeetText(text)
    if (parsed.length === 0) {
      setError('No meets found. Make sure the text includes a "Team A vs. Team B (MM/DD/YYYY)" header.')
      return
    }

    // Pre-check skip set — pre-check duplicates
    const initSkipped = new Set<number>()
    parsed.forEach((m, i) => { if (m.isDuplicate) initSkipped.add(i) })
    setMeets(parsed)
    setSkipped(initSkipped)
    setSchoolOverrides({})
    setWrestlerOverrides({})

    // Step 2: collect unique school names from headers + match rows
    const allSchoolNames = new Set<string>()
    for (const meet of parsed) {
      allSchoolNames.add(meet.team1Name)
      allSchoolNames.add(meet.team2Name)
      for (const m of meet.matches) {
        if (m.winnerSchoolRaw) allSchoolNames.add(m.winnerSchoolRaw)
        if (m.loserSchoolRaw)  allSchoolNames.add(m.loserSchoolRaw)
      }
    }

    setPhase('loading_schools')
    let schoolRes: Record<string, SchoolMatch> = {}
    try {
      const resp = await fetch('/api/admin/match-schools', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ names: [...allSchoolNames] }),
      })
      if (!resp.ok) throw new Error(`School matching failed: ${resp.status}`)
      const json = await resp.json()
      const results: SchoolMatch[] = json.results ?? []
      for (const r of results) schoolRes[r.rawName] = r
      setSchoolResolutions(schoolRes)
    } catch (e) {
      setError(String(e))
      setPhase('idle')
      return
    }

    // Step 3: collect unique wrestler requests
    setPhase('loading_wrestlers')
    const wrestlerMap = new Map<WrestlerKey, { name: string; schoolId: number | null; weightClass: number }>()

    for (const meet of parsed) {
      for (const m of meet.matches) {
        if (m.isDoubleForfeit) continue

        const pairs: [string | null, string | null][] = [
          [m.winnerName, m.winnerSchoolRaw],
          ...(!m.isForfeitWin ? [[m.loserName, m.loserSchoolRaw] as [string | null, string | null]] : []),
        ]

        for (const [name, schoolRaw] of pairs) {
          if (!name) continue
          const schoolId = resolveSchool(schoolRaw ?? '', schoolRes, {}).schoolId
          const key = makeWrestlerKey(name, schoolId, m.weightClass)
          if (!wrestlerMap.has(key)) {
            wrestlerMap.set(key, { name, schoolId, weightClass: m.weightClass })
          }
        }
      }
    }

    try {
      const resp = await fetch('/api/admin/match-wrestlers', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wrestlers: [...wrestlerMap.values()] }),
      })
      if (!resp.ok) throw new Error(`Wrestler matching failed: ${resp.status}`)
      const json = await resp.json()
      const results: WrestlerMatch[] = json.results ?? []

      // Re-index results by key (same order as the map iteration)
      const keys = [...wrestlerMap.keys()]
      const wRes: Record<string, WrestlerMatch> = {}
      results.forEach((r, i) => { wRes[keys[i]] = r })
      setWrestlerResolutions(wRes)
    } catch (e) {
      setError(String(e))
      setPhase('idle')
      return
    }

    setPhase('review')
  }

  // ── Import button readiness ──────────────────────────────────────────────────

  const { blockingSchools, readyCount, skippedCount, newWrestlerCount } = useMemo(() => {
    let blocking = 0, ready = 0, newW = 0

    for (let i = 0; i < meets.length; i++) {
      const meet = meets[i]
      const isSkipped = skipped.has(i)

      // Check if any school for this meet is an unresolved 'none'
      let meetBlocked = false
      for (const rawName of [meet.team1Name, meet.team2Name]) {
        const res = resolveSchool(rawName, schoolResolutions, schoolOverrides)
        if (res.confidence === 'none') { meetBlocked = true; blocking++ ; break }
      }

      if (isSkipped) { skippedCount: void 0 }
      else if (!meetBlocked) ready++

      if (!isSkipped) {
        for (const m of meet.matches) {
          if (m.isDoubleForfeit || m.isForfeitWin) continue
          for (const [name, schoolRaw] of [
            [m.winnerName, m.winnerSchoolRaw] as const,
            [m.loserName,  m.loserSchoolRaw]  as const,
          ]) {
            if (!name) continue
            const schoolId = resolveSchool(schoolRaw ?? '', schoolResolutions, schoolOverrides).schoolId
            const key = makeWrestlerKey(name, schoolId, m.weightClass)
            const res = wrestlerResolutions[key]
            const ovr = wrestlerOverrides[key]
            const isNew = ovr ? ovr.confirmedNew : (res?.isNew ?? true)
            if (isNew) newW++
          }
        }
      }
    }

    return {
      blockingSchools:  blocking,
      readyCount:       ready,
      skippedCount:     skipped.size,
      newWrestlerCount: newW,
    }
  }, [meets, skipped, schoolResolutions, schoolOverrides, wrestlerResolutions, wrestlerOverrides])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Step 1: Paste area ─────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Step 1 — Paste dual meet results
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Copy and paste from TrackWrestling. Supports Format A (tab-separated) and
              Format B (jammed text). Multiple meets can be pasted at once.
            </p>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              rows={14}
              spellCheck={false}
              placeholder="Paste TrackWrestling dual meet text here…"
              className="w-full font-mono text-xs border border-black px-3 py-2 outline-none focus:ring-1 focus:ring-black resize-y bg-white"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2">{error}</p>
          )}
          <button
            onClick={handleProcess}
            disabled={!rawText.trim()}
            className="px-5 py-2 bg-black text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Parse &amp; Match →
          </button>
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {(phase === 'loading_schools' || phase === 'loading_wrestlers') && (
        <div className="border border-black bg-white px-6 py-10 text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-sm font-semibold text-slate-700">
            {phase === 'loading_schools' ? 'Matching school names…' : 'Matching wrestlers…'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {phase === 'loading_wrestlers' && 'First run loads ~8k wrestlers — may take a few seconds.'}
          </p>
        </div>
      )}

      {/* ── Step 2+3: Review ────────────────────────────────────────────────── */}
      {phase === 'review' && (
        <div className="space-y-4">

          {/* Step 2 header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Step 2 — Review meets
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {meets.length} meet{meets.length !== 1 ? 's' : ''} found
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Green = exact · Yellow = high · Orange = low · Red = none/new
              </p>
            </div>
            <button
              onClick={() => { setPhase('idle'); setMeets([]); setError(null) }}
              className="text-xs text-slate-400 hover:text-slate-700 underline"
            >
              ← Start over
            </button>
          </div>

          {/* Meet cards */}
          <div className="space-y-3">
            {meets.map((meet, i) => (
              <MeetCard
                key={i}
                meet={meet}
                schoolResolutions={schoolResolutions}
                schoolOverrides={schoolOverrides}
                wrestlerResolutions={wrestlerResolutions}
                wrestlerOverrides={wrestlerOverrides}
                skip={skipped.has(i)}
                onSkipChange={skip => handleSkip(i, skip)}
              />
            ))}
          </div>

          {/* Step 3: Review panel */}
          <ReviewPanel
            meets={meets}
            schoolResolutions={schoolResolutions}
            schoolOverrides={schoolOverrides}
            wrestlerResolutions={wrestlerResolutions}
            wrestlerOverrides={wrestlerOverrides}
            onSchoolOverride={handleSchoolOverride}
            onWrestlerOverride={handleWrestlerOverride}
          />

          {/* Controls */}
          <div className="border border-black bg-white px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-2">
            <div className="text-xs text-slate-600 space-x-4">
              <span className="text-green-700 font-medium">{readyCount} meets ready</span>
              {skippedCount > 0 && <span className="text-slate-400">{skippedCount} skipped</span>}
              {newWrestlerCount > 0 && (
                <span className="text-red-600">{newWrestlerCount} wrestlers to create</span>
              )}
              {blockingSchools > 0 && (
                <span className="text-red-700 font-semibold">
                  {blockingSchools} unresolved school{blockingSchools !== 1 ? 's' : ''} blocking import
                </span>
              )}
            </div>

            <button
              onClick={() => showToast('Import logic coming in next stage — review looks good!')}
              disabled={blockingSchools > 0}
              className="px-5 py-2 bg-black text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              Import All
            </button>
          </div>

          {/* Toast */}
          {toast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-5 py-3 shadow-lg z-50">
              {toast}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
