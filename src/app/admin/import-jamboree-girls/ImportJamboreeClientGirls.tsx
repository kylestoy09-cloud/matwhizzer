'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { parseJamboreeGirlsText } from '@/lib/parseJamboreeGirls'
import type { ParsedMeet } from '@/lib/parseDualMeet'
import type { SchoolMatch } from '@/lib/matchSchools'
import type { WrestlerMatch } from '@/lib/matchWrestlers'
import {
  type SchoolOverride,
  type WrestlerOverride,
  type WrestlerKey,
  makeWrestlerKey,
  resolveSchool,
  isPlaceholderName,
} from '../import/types'
import { MeetCard }             from '../import/MeetCard'
import { ReviewPanel }          from '../import/ReviewPanel'
import { WrestlerReviewPanel }  from '../import/WrestlerReviewPanel'
import { SEASONS }              from '@/lib/seasons'

const GENDER = 'F' as const

type Phase = 'idle' | 'loading_schools' | 'school_review' | 'loading_wrestlers' | 'review' | 'importing' | 'done'

type ImportResult = {
  ok:               boolean
  meetsImported:    number
  matchesImported:  number
  wrestlersCreated: number
  meetsSkippedDup:  number
  errors:           string[]
}

type DraftSummary = {
  id:         string
  label:      string
  meet_count: number
  gender:     'M' | 'F'
  updated_at: string
}

// ── ImportJamboreeClientGirls ────────────────────────────────────────────────

export function ImportJamboreeClientGirls() {
  const [phase,              setPhase]              = useState<Phase>('idle')
  const [seasonId,           setSeasonId]           = useState<number>(2)
  const [rawText,            setRawText]            = useState('')
  const [jamboreeDate,       setJamboreeDate]       = useState('')  // MM/DD/YYYY
  const [meets,              setMeets]              = useState<ParsedMeet[]>([])
  const [schoolResolutions,  setSchoolResolutions]  = useState<Record<string, SchoolMatch>>({})
  const [schoolOverrides,    setSchoolOverrides]    = useState<Record<string, SchoolOverride>>({})
  const [wrestlerResolutions,setWrestlerResolutions]= useState<Record<string, WrestlerMatch>>({})
  const [wrestlerOverrides,  setWrestlerOverrides]  = useState<Record<string, WrestlerOverride>>({})
  const [skipped,            setSkipped]            = useState<Set<number>>(new Set())
  const [error,              setError]              = useState<string | null>(null)
  const [importResult,       setImportResult]       = useState<ImportResult | null>(null)
  const [inactiveSchools,    setInactiveSchools]    = useState<Map<number, string>>(new Map())

  const [draftId,       setDraftId]       = useState<string | null>(null)
  const [draftLabel,    setDraftLabel]    = useState('')
  const [drafts,        setDrafts]        = useState<DraftSummary[]>([])
  const [draftSaving,   setDraftSaving]   = useState(false)
  const [draftError,    setDraftError]    = useState<string | null>(null)
  const [autoSaveState, setAutoSaveState] = useState<'pending' | 'saved' | null>(null)
  const autoSaveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveDataRef = useRef({ rawText, draftId, draftLabel, meets, phase, schoolOverrides, wrestlerOverrides })

  const loadDrafts = useCallback(async () => {
    try {
      const resp = await fetch('/api/admin/dual-import-draft')
      if (!resp.ok) return
      const json = await resp.json()
      setDrafts((json.drafts ?? []).filter((d: DraftSummary) => d.gender === 'F'))
    } catch {}
  }, [])

  useEffect(() => { loadDrafts() }, [loadDrafts])

  autoSaveDataRef.current = { rawText, draftId, draftLabel, meets, phase, schoolOverrides, wrestlerOverrides }

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
          gender:             GENDER,
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

  useEffect(() => {
    if (phase !== 'school_review' && phase !== 'review') return
    if (meets.length === 0) return
    setAutoSaveState('pending')
    performAutoSave()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

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

  const handleSchoolOverride = useCallback((rawName: string, o: SchoolOverride | null) => {
    setSchoolOverrides(prev => {
      const next = { ...prev }
      if (o === null) delete next[rawName]
      else next[rawName] = o
      return next
    })
  }, [])

  const handleWrestlerOverride = useCallback((key: WrestlerKey, o: WrestlerOverride | null) => {
    setWrestlerOverrides(prev => {
      const next = { ...prev }
      if (o === null) delete next[key]
      else next[key] = o
      return next
    })
  }, [])

  const handleSkip = useCallback((idx: number, skip: boolean) => {
    setSkipped(prev => {
      const next = new Set(prev)
      if (skip) next.add(idx)
      else      next.delete(idx)
      return next
    })
  }, [])

  async function handleProcess(textOverride?: string, initialOverrides?: {
    schoolOverrides:   Record<string, SchoolOverride>
    wrestlerOverrides: Record<string, WrestlerOverride>
  }) {
    setError(null)
    const text = (textOverride ?? rawText).trim()
    if (!text) return
    if (textOverride) setRawText(textOverride)

    const dateToUse = jamboreeDate.trim()
    if (!dateToUse.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      setError('Enter the jamboree date in MM/DD/YYYY format before parsing.')
      return
    }

    const parsed = parseJamboreeGirlsText(text, dateToUse) as unknown as ParsedMeet[]

    if (parsed.length === 0) {
      setError('No bouts found. Make sure the text includes lines like "100 Winner Name (School) over Loser Name (School) (Fall 0:42)".')
      return
    }

    setMeets(parsed)
    setSkipped(new Set())
    setSchoolOverrides(initialOverrides?.schoolOverrides   ?? {})
    setWrestlerOverrides(initialOverrides?.wrestlerOverrides ?? {})
    setImportResult(null)

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
        body:    JSON.stringify({ names: [...allSchoolNames], gender: GENDER, seasonId }),
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

    try {
      const njIds = Object.values(schoolRes)
        .filter(r => r.schoolId !== null && r.confidence !== 'oos')
        .map(r => r.schoolId as number)
      const uniqueIds = [...new Set(njIds)]
      if (uniqueIds.length > 0) {
        const resp = await fetch('/api/admin/school-enrollment', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ schoolIds: uniqueIds, seasonId, gender: GENDER }),
        })
        if (resp.ok) {
          const { inactiveIds } = await resp.json()
          const inactiveSet = new Set<number>(inactiveIds)
          const nameMap = new Map<number, string>()
          for (const r of Object.values(schoolRes)) {
            if (r.schoolId !== null && inactiveSet.has(r.schoolId)) {
              nameMap.set(r.schoolId, r.displayName ?? String(r.schoolId))
            }
          }
          setInactiveSchools(nameMap)
        }
      } else {
        setInactiveSchools(new Map())
      }
    } catch {
      setInactiveSchools(new Map())
    }

    setPhase('school_review')
  }

  async function handleMatchWrestlers() {
    setError(null)
    setPhase('loading_wrestlers')

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
          const schoolResolved = resolveSchool(schoolRaw ?? '', schoolResolutions, schoolOverrides)
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
        body:    JSON.stringify({ wrestlers: [...wrestlerMap.values()], gender: GENDER }),
      })
      if (!resp.ok) throw new Error(`Wrestler matching failed: ${resp.status}`)
      const json = await resp.json()
      const results: WrestlerMatch[] = json.results ?? []

      const keys = [...wrestlerMap.keys()]
      const wRes: Record<string, WrestlerMatch> = {}
      results.forEach((r, i) => { wRes[keys[i]] = r })
      setWrestlerResolutions(wRes)

      const allResolvedIds = new Set<number>()
      for (const { schoolId } of wrestlerMap.values()) {
        if (schoolId !== null) allResolvedIds.add(schoolId)
      }
      if (allResolvedIds.size > 0) {
        try {
          const cr = await fetch('/api/admin/school-enrollment', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ schoolIds: [...allResolvedIds], seasonId, gender: GENDER }),
          })
          if (cr.ok) {
            const { inactiveIds } = await cr.json()
            const inactiveSet = new Set<number>(inactiveIds)
            const nameMap = new Map<number, string>()
            for (const r of Object.values(schoolResolutions)) {
              if (r.schoolId !== null && inactiveSet.has(r.schoolId)) {
                nameMap.set(r.schoolId, r.displayName ?? String(r.schoolId))
              }
            }
            for (const [raw, ovr] of Object.entries(schoolOverrides)) {
              if (ovr.schoolId && inactiveSet.has(ovr.schoolId) && !nameMap.has(ovr.schoolId)) {
                nameMap.set(ovr.schoolId, raw)
              }
            }
            setInactiveSchools(nameMap)
          }
        } catch { /* non-fatal */ }
      }
    } catch (e) {
      setError(String(e))
      setPhase('school_review')
      return
    }

    setPhase('review')
  }

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
          gender:             GENDER,
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

  async function handleDeleteDraft(id: string) {
    try {
      await fetch(`/api/admin/dual-import-draft?id=${id}`, { method: 'DELETE' })
      setDrafts(prev => prev.filter(d => d.id !== id))
    } catch {}
  }

  async function handleImport() {
    setError(null)
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null }

    const { rawText: rt, draftId: did, draftLabel: dl, meets: ms, schoolOverrides: so, wrestlerOverrides: wo } = autoSaveDataRef.current
    if (ms.length === 0) return

    setPhase('importing')
    try {
      const saveResp = await fetch('/api/admin/dual-import-draft', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id:                 did ?? undefined,
          label:              dl,
          raw_text:           rt,
          gender:             GENDER,
          school_overrides:   so,
          wrestler_overrides: wo,
          meet_count:         ms.length,
        }),
      })
      if (!saveResp.ok) {
        const j = await saveResp.json().catch(() => ({}))
        throw new Error(`Could not save draft before import: ${j.error ?? saveResp.status}`)
      }
      const { draft: savedDraft } = await saveResp.json()
      const importDraftId = savedDraft.id as string
      setDraftId(importDraftId)

      const resp = await fetch('/api/admin/import-meets-girls', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ draftId: importDraftId, skipped: [...skipped] }),
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error ?? `HTTP ${resp.status}`)
      }
      const json = await resp.json()
      setImportResult(json as ImportResult)
      setPhase('done')

      await fetch('/api/admin/dual-import-draft', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: importDraftId }),
      })
      setDraftId(null)
      loadDrafts()
    } catch (e) {
      setError(String(e))
      setPhase('review')
    }
  }

  const { blockingSchools, unresolvedWrestlers, readyCount, skippedCount, newWrestlerCount } = useMemo(() => {
    let blocking = 0, ready = 0, newW = 0, unresolvedW = 0
    const seenNew = new Set<string>()
    const seenUnresolved = new Set<string>()

    for (let i = 0; i < meets.length; i++) {
      const meet = meets[i]
      const isSkipped = skipped.has(i)

      let meetBlocked = false
      for (const rawName of [meet.team1Name, meet.team2Name]) {
        const res = resolveSchool(rawName, schoolResolutions, schoolOverrides)
        if (res.confidence === 'none') {
          meetBlocked = true
          if (!isSkipped) blocking++
          break
        }
      }

      if (!isSkipped && !meetBlocked) ready++

      if (!isSkipped) {
        for (const m of meet.matches) {
          if (m.isDoubleForfeit || m.isForfeitWin) continue
          for (const [name, schoolRaw] of [
            [m.winnerName, m.winnerSchoolRaw] as const,
            [m.loserName,  m.loserSchoolRaw]  as const,
          ]) {
            if (!name || isPlaceholderName(name)) continue
            const schoolRes = resolveSchool(schoolRaw ?? '', schoolResolutions, schoolOverrides)
            if (schoolRes.isOutOfState) continue
            const key = makeWrestlerKey(name, schoolRes.schoolId, m.weightClass)

            if (!seenNew.has(key)) {
              seenNew.add(key)
              const res = wrestlerResolutions[key]
              const ovr = wrestlerOverrides[key]
              const isNew = ovr ? ovr.confirmedNew : (res?.isNew ?? true)
              if (isNew) newW++
            }

            if (!seenUnresolved.has(key)) {
              seenUnresolved.add(key)
              const res = wrestlerResolutions[key]
              const ovr = wrestlerOverrides[key]
              if (!ovr) {
                const needsAction = !res || res.isNew || res.confidence === 'low'
                if (needsAction) unresolvedW++
              }
            }
          }
        }
      }
    }

    return {
      blockingSchools:     blocking,
      unresolvedWrestlers: unresolvedW,
      readyCount:          ready,
      skippedCount:        skipped.size,
      newWrestlerCount:    newW,
    }
  }, [meets, skipped, schoolResolutions, schoolOverrides, wrestlerResolutions, wrestlerOverrides])

  function formatDraftDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' })
  }

  function resetAll() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    setAutoSaveState(null)
    setPhase('idle'); setMeets([]); setError(null); setDraftId(null); setDraftLabel('')
  }

  return (
    <div>
      {/* ── Step 1: Paste area ──────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="space-y-4">

          {drafts.length > 0 && (
            <div className="border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-slate-600 mb-1">Saved drafts</p>
              {drafts.map(d => (
                <div key={d.id} className="flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0">
                    <span className="font-medium text-slate-800 truncate">{d.label || 'Untitled'}</span>
                    <span className="text-slate-400 ml-2">
                      {d.meet_count} meet{d.meet_count !== 1 ? 's' : ''} · {formatDraftDate(d.updated_at)}
                    </span>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button onClick={() => handleResumeDraft(d.id)} className="text-blue-700 font-medium hover:underline">Resume</button>
                    <button onClick={() => handleDeleteDraft(d.id)} className="text-slate-400 hover:text-red-600">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border border-black bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Jamboree / Round Robin format</p>
            <p>
              Paste the raw bout results — each line should look like:<br />
              <code className="font-mono bg-amber-100 px-1">100 Varsity - Winner Name (School) over Loser Name (School) (Fall 0:42)</code>
            </p>
            <p>
              Duplicate bouts across team sections are automatically de-duplicated.
              Each unique school pairing becomes a separate dual meet in the database.
            </p>
          </div>

          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jamboree Date</label>
              <input
                type="text"
                value={jamboreeDate}
                onChange={e => setJamboreeDate(e.target.value)}
                placeholder="MM/DD/YYYY"
                className="border border-black px-3 py-1.5 text-sm font-mono outline-none focus:ring-1 focus:ring-black bg-white w-36"
              />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1">Season</span>
              <div className="flex border border-black">
                {Object.entries(SEASONS).map(([id, s], i) => (
                  <button
                    key={id}
                    onClick={() => setSeasonId(Number(id))}
                    className={`px-4 py-1.5 text-xs font-bold transition-colors ${i > 0 ? 'border-l border-black' : ''} ${seasonId === Number(id) ? 'bg-black text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Paste raw bout results
            </label>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              rows={18}
              spellCheck={false}
              placeholder="100 Varsity - Kayleigh Karpf (Collingswood) over Kiera Adams (West Deptford) (Fall 0:42)&#10;107 Winner Name (School) over Loser Name (School) (Dec 8-2)&#10;..."
              className="w-full font-mono text-xs border border-black px-3 py-2 outline-none focus:ring-1 focus:ring-black resize-y bg-white"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2">{error}</p>
          )}

          <button
            onClick={() => handleProcess()}
            disabled={!rawText.trim() || !jamboreeDate.trim()}
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
                  {meets.length} pairing{meets.length !== 1 ? 's' : ''} found
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Resolve all school names before wrestler matching.
              </p>
            </div>
            <button onClick={resetAll} className="text-xs text-slate-400 hover:text-slate-700 underline">← Start over</button>
          </div>

          <ReviewPanel
            meets={meets}
            schoolResolutions={schoolResolutions}
            schoolOverrides={schoolOverrides}
            onSchoolOverride={handleSchoolOverride}
            wrestlerResolutions={wrestlerResolutions}
            onWrestlerOverride={handleWrestlerOverride}
            gender={GENDER}
          />

          {error && <p className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2">{error}</p>}

          <div className="border border-black bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                value={draftLabel}
                onChange={e => setDraftLabel(e.target.value)}
                placeholder={`Draft label (e.g. ${jamboreeDate || 'Garnets Jamboree 12/29'})`}
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
              <p className="text-[11px] text-slate-400">Auto-saves 3s after each change.</p>
              {autoSaveState === 'pending' && <span className="text-[11px] text-slate-400">Saving…</span>}
              {autoSaveState === 'saved'   && <span className="text-[11px] text-green-600">Auto-saved</span>}
            </div>
          </div>

          {inactiveSchools.size > 0 && (
            <div className="border border-amber-300 bg-amber-50 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-amber-800">{inactiveSchools.size} matched school{inactiveSchools.size !== 1 ? 's are' : ' is'} inactive this season</p>
              <ul className="text-xs text-amber-700 space-y-0.5 list-disc ml-4">
                {[...inactiveSchools.values()].map(name => <li key={name}>{name}</li>)}
              </ul>
            </div>
          )}

          <button
            onClick={handleMatchWrestlers}
            className="px-5 py-2 bg-black text-white text-sm font-semibold hover:bg-slate-800"
          >
            Schools confirmed — Match Wrestlers →
          </button>
        </div>
      )}

      {/* ── Importing ────────────────────────────────────────────────────────── */}
      {phase === 'importing' && (
        <div className="border border-black bg-white px-6 py-10 text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-sm font-semibold text-slate-700">Writing to database…</p>
          <p className="text-xs text-slate-400 mt-1">Creating meets, matches, and new wrestlers.</p>
        </div>
      )}

      {/* ── Done ─────────────────────────────────────────────────────────────── */}
      {phase === 'done' && importResult && (
        <div className="border border-black bg-white px-6 py-8 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            {importResult.ok ? 'Import complete' : 'Import finished with errors'}
          </h2>
          <ul className="text-sm text-slate-700 space-y-1">
            <li><span className="text-green-700 font-medium">{importResult.meetsImported}</span> team pairings imported as dual meets</li>
            <li><span className="text-green-700 font-medium">{importResult.matchesImported}</span> bouts written</li>
            {importResult.wrestlersCreated > 0 && (
              <li><span className="text-blue-700 font-medium">{importResult.wrestlersCreated}</span> new wrestlers created</li>
            )}
            {importResult.meetsSkippedDup > 0 && (
              <li><span className="text-amber-600 font-medium">{importResult.meetsSkippedDup}</span> pairings skipped — already in system</li>
            )}
          </ul>
          {importResult.errors.length > 0 && (
            <div className="border border-red-300 bg-red-50 px-3 py-2 space-y-1">
              <p className="text-xs font-semibold text-red-700">Errors:</p>
              {importResult.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
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

      {/* ── Step 3: Review ──────────────────────────────────────────────────── */}
      {phase === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Step 3 — Review pairings
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {meets.length} pairing{meets.length !== 1 ? 's' : ''} found
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Green = exact · Yellow = high · Orange = low · Red = none/new
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={handleMatchWrestlers} className="text-xs text-blue-600 hover:text-blue-800 underline">
                Re-match wrestlers
              </button>
              <button onClick={resetAll} className="text-xs text-slate-400 hover:text-slate-700 underline">
                ← Start over
              </button>
            </div>
          </div>

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
                gender={GENDER}
                onSkipChange={skip => handleSkip(i, skip)}
                onWrestlerOverride={handleWrestlerOverride}
              />
            ))}
          </div>

          <ReviewPanel
            meets={meets}
            schoolResolutions={schoolResolutions}
            schoolOverrides={schoolOverrides}
            onSchoolOverride={handleSchoolOverride}
            wrestlerResolutions={wrestlerResolutions}
            onWrestlerOverride={handleWrestlerOverride}
            gender={GENDER}
          />

          <WrestlerReviewPanel
            meets={meets}
            schoolResolutions={schoolResolutions}
            schoolOverrides={schoolOverrides}
            wrestlerResolutions={wrestlerResolutions}
            wrestlerOverrides={wrestlerOverrides}
            onWrestlerOverride={handleWrestlerOverride}
            gender={GENDER}
          />

          {inactiveSchools.size > 0 && (
            <div className="border border-amber-300 bg-amber-50 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-amber-800">{inactiveSchools.size} inactive school{inactiveSchools.size !== 1 ? 's' : ''} in this import</p>
              <ul className="text-xs text-amber-700 space-y-0.5 list-disc ml-4">
                {[...inactiveSchools.values()].map(name => <li key={name}>{name}</li>)}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-red-600 border border-red-300 bg-red-50 px-3 py-2">{error}</p>}

          <div className="border border-black bg-white px-4 py-4 space-y-3 mt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600 space-x-4">
                <span className="text-green-700 font-medium">{readyCount} pairings ready</span>
                {skippedCount > 0 && <span className="text-slate-400">{skippedCount} skipped</span>}
                {newWrestlerCount > 0 && unresolvedWrestlers === 0 && (
                  <span className="text-amber-600">{newWrestlerCount} new wrestler{newWrestlerCount !== 1 ? 's' : ''} to create</span>
                )}
                {unresolvedWrestlers > 0 && (
                  <span className="text-red-700 font-semibold">{unresolvedWrestlers} wrestler{unresolvedWrestlers !== 1 ? 's' : ''} unresolved — review required</span>
                )}
                {blockingSchools > 0 && (
                  <span className="text-red-700 font-semibold">{blockingSchools} unresolved school{blockingSchools !== 1 ? 's' : ''} blocking import</span>
                )}
              </div>
              <button
                onClick={handleImport}
                disabled={blockingSchools > 0 || unresolvedWrestlers > 0}
                className="px-5 py-2 bg-black text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                Import All
              </button>
            </div>

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
                {autoSaveState === 'pending' && <span className="text-[11px] text-slate-400">Saving…</span>}
                {autoSaveState === 'saved'   && <span className="text-[11px] text-green-600">Auto-saved</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
