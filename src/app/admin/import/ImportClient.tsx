'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
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
import { MeetCard }             from './MeetCard'
import { ReviewPanel }          from './ReviewPanel'
import { WrestlerReviewPanel }  from './WrestlerReviewPanel'

// ── Phase ──────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'loading_schools' | 'school_review' | 'loading_wrestlers' | 'review' | 'importing' | 'done'

type ImportResult = {
  ok:               boolean
  meetsImported:    number
  matchesImported:  number
  wrestlersCreated: number
  errors:           string[]
}

type DraftSummary = {
  id:         string
  label:      string
  meet_count: number
  updated_at: string
}

// ── ImportClient ───────────────────────────────────────────────────────────────

export function ImportClient() {
  const [phase,              setPhase]              = useState<Phase>('idle')
  const [gender,             setGender]             = useState<'M' | 'F'>('M')
  const [rawText,            setRawText]            = useState('')
  const [meets,              setMeets]              = useState<ParsedMeet[]>([])
  const [schoolResolutions,  setSchoolResolutions]  = useState<Record<string, SchoolMatch>>({})
  const [schoolOverrides,    setSchoolOverrides]    = useState<Record<string, SchoolOverride>>({})
  const [wrestlerResolutions,setWrestlerResolutions]= useState<Record<string, WrestlerMatch>>({})
  const [wrestlerOverrides,  setWrestlerOverrides]  = useState<Record<string, WrestlerOverride>>({})
  const [skipped,            setSkipped]            = useState<Set<number>>(new Set())
  const [error,              setError]              = useState<string | null>(null)
  const [importResult,       setImportResult]       = useState<ImportResult | null>(null)

  // Draft state
  const [draftId,       setDraftId]       = useState<string | null>(null)
  const [draftLabel,    setDraftLabel]    = useState('')
  const [drafts,        setDrafts]        = useState<DraftSummary[]>([])
  const [draftSaving,   setDraftSaving]   = useState(false)
  const [draftError,    setDraftError]    = useState<string | null>(null)
  const [autoSaveState, setAutoSaveState] = useState<'pending' | 'saved' | null>(null)
  const autoSaveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref keeps latest values available inside the setTimeout callback without stale closures
  const autoSaveDataRef = useRef({ rawText, draftId, draftLabel, meets, phase, schoolOverrides, wrestlerOverrides })

  // ── Load drafts on mount ─────────────────────────────────────────────────────

  const loadDrafts = useCallback(async () => {
    try {
      const resp = await fetch('/api/admin/dual-import-draft')
      if (!resp.ok) return
      const json = await resp.json()
      setDrafts(json.drafts ?? [])
    } catch {}
  }, [])

  useEffect(() => { loadDrafts() }, [loadDrafts])

  // Keep ref in sync every render so auto-save callback always reads fresh values
  autoSaveDataRef.current = { rawText, draftId, draftLabel, meets, phase, schoolOverrides, wrestlerOverrides }

  // ── Auto-save core ────────────────────────────────────────────────────────────
  const performAutoSave = useCallback(async () => {
    const { rawText: rt, draftId: did, draftLabel: dl, meets: ms, schoolOverrides: so, wrestlerOverrides: wo } = autoSaveDataRef.current
    if (ms.length === 0) return
    try {
      const resp = await fetch('/api/admin/dual-import-draft', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id:                 did ?? undefined,
          label:              dl,
          raw_text:           rt,
          school_overrides:   so,
          wrestler_overrides: wo,
          meet_count:         ms.length,
        }),
      })
      if (!resp.ok) { setAutoSaveState(null); return }
      const { draft } = await resp.json()
      setDraftId(prev => prev ?? draft.id)
      setAutoSaveState('saved')
    } catch {
      setAutoSaveState(null)
    }
  }, [])

  // Save immediately when entering a review phase
  useEffect(() => {
    if (phase !== 'school_review' && phase !== 'review') return
    if (meets.length === 0) return
    setAutoSaveState('pending')
    performAutoSave()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Debounce-save when overrides change (while in a review phase)
  useEffect(() => {
    const { phase: p, meets: m } = autoSaveDataRef.current
    if (p !== 'school_review' && p !== 'review') return
    if (m.length === 0) return

    setAutoSaveState('pending')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)

    autoSaveTimer.current = setTimeout(() => { performAutoSave() }, 2000)

    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolOverrides, wrestlerOverrides])

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

  async function handleProcess(
    textOverride?: string,
    initialOverrides?: {
      schoolOverrides:   Record<string, SchoolOverride>
      wrestlerOverrides: Record<string, WrestlerOverride>
    }
  ) {
    setError(null)
    const text = (textOverride ?? rawText).trim()
    if (!text) return
    if (textOverride) setRawText(textOverride)

    // Step 1: parse (synchronous)
    const parsed = parseDualMeetText(text)

    if (parsed.length === 0) {
      setError('No meets found. Make sure the text includes a "Team A vs. Team B (MM/DD/YYYY)" header.')
      return
    }

    // Pre-check duplicates
    const initSkipped = new Set<number>()
    parsed.forEach((m, i) => { if (m.isDuplicate) initSkipped.add(i) })
    setMeets(parsed)
    setSkipped(initSkipped)
    setSchoolOverrides(initialOverrides?.schoolOverrides   ?? {})
    setWrestlerOverrides(initialOverrides?.wrestlerOverrides ?? {})
    setImportResult(null)

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

    // Step 3: wait for school review before matching wrestlers
    setPhase('school_review')
  }

  // ── Match wrestlers (called after school review is confirmed) ────────────────

  async function handleMatchWrestlers() {
    setError(null)
    setPhase('loading_wrestlers')

    // Use current schoolOverrides so corrected schools feed into wrestler matching
    const currentOverrides = schoolOverrides
    const wrestlerMap = new Map<WrestlerKey, { name: string; schoolId: number | null; weightClass: number }>()

    for (const meet of meets) {
      for (const m of meet.matches) {
        if (m.isDoubleForfeit) continue

        const pairs: [string | null, string | null][] = [
          [m.winnerName, m.winnerSchoolRaw],
          ...(!m.isForfeitWin ? [[m.loserName, m.loserSchoolRaw] as [string | null, string | null]] : []),
        ]

        for (const [name, schoolRaw] of pairs) {
          if (!name) continue
          const schoolResolved = resolveSchool(schoolRaw ?? '', schoolResolutions, currentOverrides)
          if (schoolResolved.isOutOfState) continue
          const schoolId = schoolResolved.schoolId
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
        body:    JSON.stringify({ wrestlers: [...wrestlerMap.values()], gender }),
      })
      if (!resp.ok) throw new Error(`Wrestler matching failed: ${resp.status}`)
      const json = await resp.json()
      const results: WrestlerMatch[] = json.results ?? []

      const keys = [...wrestlerMap.keys()]
      const wRes: Record<string, WrestlerMatch> = {}
      results.forEach((r, i) => { wRes[keys[i]] = r })
      setWrestlerResolutions(wRes)
    } catch (e) {
      setError(String(e))
      setPhase('school_review')
      return
    }

    setPhase('review')
  }

  // ── Draft: save current progress ─────────────────────────────────────────────

  async function handleSaveDraft() {
    setDraftSaving(true)
    setDraftError(null)
    try {
      const resp = await fetch('/api/admin/dual-import-draft', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id:                 draftId ?? undefined,
          label:              draftLabel,
          raw_text:           rawText,
          school_overrides:   schoolOverrides,
          wrestler_overrides: wrestlerOverrides,
          meet_count:         meets.length,
        }),
      })
      if (!resp.ok) throw new Error(`Save failed: ${resp.status}`)
      const { draft } = await resp.json()
      if (!draftId) setDraftId(draft.id)
    } catch (e) {
      setDraftError(String(e))
    } finally {
      setDraftSaving(false)
    }
  }

  // ── Draft: resume a saved draft ───────────────────────────────────────────────

  async function handleResumeDraft(id: string) {
    setError(null)
    try {
      const resp = await fetch(`/api/admin/dual-import-draft?id=${id}`)
      if (!resp.ok) throw new Error(`Load failed: ${resp.status}`)
      const { draft } = await resp.json()
      setDraftId(draft.id)
      setDraftLabel(draft.label ?? '')
      await handleProcess(draft.raw_text, {
        schoolOverrides:   draft.school_overrides   ?? {},
        wrestlerOverrides: draft.wrestler_overrides ?? {},
      })
    } catch (e) {
      setError(String(e))
    }
  }

  // ── Draft: delete ─────────────────────────────────────────────────────────────

  async function handleDeleteDraft(id: string) {
    try {
      await fetch(`/api/admin/dual-import-draft?id=${id}`, { method: 'DELETE' })
      setDrafts(prev => prev.filter(d => d.id !== id))
    } catch {}
  }

  // ── Import handler ───────────────────────────────────────────────────────────

  async function handleImport() {
    setError(null)
    setPhase('importing')
    try {
      const resp = await fetch('/api/admin/import-meets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          meets,
          skipped:             [...skipped],
          schoolResolutions,
          schoolOverrides,
          wrestlerResolutions,
          wrestlerOverrides,
        }),
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error ?? `HTTP ${resp.status}`)
      setImportResult(json as ImportResult)
      setPhase('done')

      // Mark draft as imported so it no longer appears in the list
      if (draftId) {
        await fetch('/api/admin/dual-import-draft', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ id: draftId }),
        })
        setDraftId(null)
        loadDrafts()
      }
    } catch (e) {
      setError(String(e))
      setPhase('review')
    }
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
            const schoolRes = resolveSchool(schoolRaw ?? '', schoolResolutions, schoolOverrides)
            if (schoolRes.isOutOfState) continue
            const key = makeWrestlerKey(name, schoolRes.schoolId, m.weightClass)
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

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function formatDraftDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Step 1: Paste area ─────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="space-y-4">

          {/* Saved drafts */}
          {drafts.length > 0 && (
            <div className="border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-slate-600 mb-1">Saved drafts</p>
              {drafts.map(d => (
                <div key={d.id} className="flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800 truncate">
                      {d.label || 'Untitled'}
                    </span>
                    <span className="text-slate-400 ml-2">
                      {d.meet_count} meet{d.meet_count !== 1 ? 's' : ''} · {formatDraftDate(d.updated_at)}
                    </span>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={() => handleResumeDraft(d.id)}
                      className="text-blue-700 font-medium hover:underline"
                    >
                      Resume
                    </button>
                    <button
                      onClick={() => handleDeleteDraft(d.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Step 1 — Paste dual meet results
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Copy and paste from TrackWrestling. Supports Format A (tab-separated) and
              Format B (jammed text). Multiple meets can be pasted at once.
            </p>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-slate-500">Gender:</span>
              <div className="flex border border-black">
                <button
                  onClick={() => setGender('M')}
                  className={`px-4 py-1 text-xs font-bold transition-colors ${gender === 'M' ? 'bg-black text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  Boys
                </button>
                <button
                  onClick={() => setGender('F')}
                  className={`px-4 py-1 text-xs font-bold transition-colors border-l border-black ${gender === 'F' ? 'bg-rose-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  Girls
                </button>
              </div>
            </div>
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
            onClick={() => handleProcess()}
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

      {/* ── School review (step 2) ───────────────────────────────────────────── */}
      {phase === 'school_review' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Step 2 — Confirm schools
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {meets.length} meet{meets.length !== 1 ? 's' : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Resolve all school names before wrestler matching — correct schools narrow the wrestler candidate list.
              </p>
            </div>
            <button
              onClick={() => {
                if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
                setAutoSaveState(null)
                setPhase('idle'); setMeets([]); setError(null); setDraftId(null); setDraftLabel('')
              }}
              className="text-xs text-slate-400 hover:text-slate-700 underline"
            >
              ← Start over
            </button>
          </div>

          <ReviewPanel
            meets={meets}
            schoolResolutions={schoolResolutions}
            schoolOverrides={schoolOverrides}
            onSchoolOverride={handleSchoolOverride}
          />

          {error && (
            <p className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2">{error}</p>
          )}

          {/* Save draft before touching anything */}
          <div className="border border-black bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                value={draftLabel}
                onChange={e => setDraftLabel(e.target.value)}
                placeholder="Draft label (optional, e.g. Dec duals week 1)"
                className="flex-1 text-xs border border-slate-300 px-2 py-1.5 outline-none focus:ring-1 focus:ring-black bg-white"
              />
              <button
                onClick={handleSaveDraft}
                disabled={draftSaving}
                className="px-3 py-1.5 border border-black text-xs font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {draftSaving ? 'Saving…' : draftId ? 'Update draft' : 'Save draft'}
              </button>
            </div>
            {draftError && <p className="text-xs text-red-600 mt-1">{draftError}</p>}
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[11px] text-slate-400">
                Progress auto-saves 3s after each change.
              </p>
              {autoSaveState === 'pending' && (
                <span className="text-[11px] text-slate-400">Saving…</span>
              )}
              {autoSaveState === 'saved' && (
                <span className="text-[11px] text-green-600">Auto-saved</span>
              )}
            </div>
          </div>

          <button
            onClick={handleMatchWrestlers}
            className="px-5 py-2 bg-black text-white text-sm font-semibold hover:bg-slate-800"
          >
            Schools confirmed — Match Wrestlers →
          </button>
        </div>
      )}

      {/* ── Importing ───────────────────────────────────────────────────────── */}
      {phase === 'importing' && (
        <div className="border border-black bg-white px-6 py-10 text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-sm font-semibold text-slate-700">Writing to database…</p>
          <p className="text-xs text-slate-400 mt-1">Creating meets, matches, and new wrestlers.</p>
        </div>
      )}

      {/* ── Done ────────────────────────────────────────────────────────────── */}
      {phase === 'done' && importResult && (
        <div className="border border-black bg-white px-6 py-8 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            {importResult.ok ? 'Import complete' : 'Import finished with errors'}
          </h2>
          <ul className="text-sm text-slate-700 space-y-1">
            <li><span className="text-green-700 font-medium">{importResult.meetsImported}</span> meets imported</li>
            <li><span className="text-green-700 font-medium">{importResult.matchesImported}</span> matches written</li>
            {importResult.wrestlersCreated > 0 && (
              <li><span className="text-blue-700 font-medium">{importResult.wrestlersCreated}</span> new wrestlers created</li>
            )}
          </ul>
          {importResult.errors.length > 0 && (
            <div className="border border-red-300 bg-red-50 px-3 py-2 space-y-1">
              <p className="text-xs font-semibold text-red-700">Errors:</p>
              {importResult.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600">{e}</p>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
              setAutoSaveState(null)
              setPhase('idle'); setMeets([]); setError(null); setImportResult(null); loadDrafts()
            }}
            className="px-4 py-2 bg-black text-white text-sm font-semibold hover:bg-slate-800"
          >
            Import more
          </button>
        </div>
      )}

      {/* ── Step 2+3: Review ────────────────────────────────────────────────── */}
      {phase === 'review' && (
        <div className="space-y-4">

          {/* Step 3 header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Step 3 — Review meets
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {meets.length} meet{meets.length !== 1 ? 's' : ''} found
                </span>
                {draftId && (
                  <span className="ml-2 text-xs font-normal text-slate-400">(draft)</span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Green = exact · Yellow = high · Orange = low · Red = none/new
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleMatchWrestlers}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
                title="Re-run wrestler matching after changing school overrides"
              >
                Re-match wrestlers
              </button>
              <button
                onClick={() => {
                  if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
                  setAutoSaveState(null)
                  setPhase('idle'); setMeets([]); setError(null); setDraftId(null); setDraftLabel('')
                }}
                className="text-xs text-slate-400 hover:text-slate-700 underline"
              >
                ← Start over
              </button>
            </div>
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
                onWrestlerOverride={handleWrestlerOverride}
              />
            ))}
          </div>

          {/* Step 3: School review panel */}
          <ReviewPanel
            meets={meets}
            schoolResolutions={schoolResolutions}
            schoolOverrides={schoolOverrides}
            onSchoolOverride={handleSchoolOverride}
          />

          {/* Step 4: Wrestler review panel */}
          <WrestlerReviewPanel
            meets={meets}
            schoolResolutions={schoolResolutions}
            schoolOverrides={schoolOverrides}
            wrestlerResolutions={wrestlerResolutions}
            wrestlerOverrides={wrestlerOverrides}
            onWrestlerOverride={handleWrestlerOverride}
            gender={gender}
          />

          {/* Controls */}
          <div className="border border-black bg-white px-4 py-4 space-y-3 mt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                onClick={handleImport}
                disabled={blockingSchools > 0}
                className="px-5 py-2 bg-black text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                Import All
              </button>
            </div>

            {/* Save draft row */}
            <div className="pt-1 border-t border-slate-100 space-y-1">
              <div className="flex items-center gap-2">
                <input
                  value={draftLabel}
                  onChange={e => setDraftLabel(e.target.value)}
                  placeholder="Draft label (optional)"
                  className="flex-1 text-xs border border-slate-300 px-2 py-1.5 outline-none focus:ring-1 focus:ring-black bg-white"
                />
                <button
                  onClick={handleSaveDraft}
                  disabled={draftSaving}
                  className="px-3 py-1.5 border border-black text-xs font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {draftSaving ? 'Saving…' : draftId ? 'Update draft' : 'Save draft'}
                </button>
              </div>
              {draftError && <p className="text-xs text-red-600">{draftError}</p>}
              <div className="flex justify-end">
                {autoSaveState === 'pending' && (
                  <span className="text-[11px] text-slate-400">Saving…</span>
                )}
                {autoSaveState === 'saved' && (
                  <span className="text-[11px] text-green-600">Auto-saved</span>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
