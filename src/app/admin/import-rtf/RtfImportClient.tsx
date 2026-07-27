'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import type {
  TournamentSummary,
  ReviewedTournament,
  SchoolOverride,
  WrestlerOverride,
  ImportResult,
} from './types'
import { SchoolFlagCard } from './SchoolFlagCard'
import { WrestlerFlagCard } from './WrestlerFlagCard'

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

type Step = 'input' | 'select' | 'review' | 'done'

type DraftSummary = {
  id: string
  label: string
  tournament_count: number
  step: string
  updated_at: string
}

async function apiPost<T>(path: string, body: unknown): Promise<T & { error?: string }> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export function RtfImportClient() {
  const [step, setStep] = useState<Step>('input')
  const [text, setText] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [isPending, startTransition] = useTransition()

  const [summaries, setSummaries] = useState<TournamentSummary[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [parseError, setParseError] = useState<string | null>(null)

  const [reviewed, setReviewed] = useState<ReviewedTournament[]>([])
  const [schoolOverrides, setSchoolOverrides] = useState<Record<string, SchoolOverride>>({})
  const [wrestlerOverrides, setWrestlerOverrides] = useState<Record<string, WrestlerOverride>>({})
  const [dates, setDates] = useState<Record<string, { start_date: string; end_date: string | null }>>({})
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null)
  const [matchError, setMatchError] = useState<string | null>(null)

  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [force, setForce] = useState(false)

  // ── Draft state ───────────────────────────────────────────────────────────
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState('')
  const [drafts, setDrafts] = useState<DraftSummary[]>([])
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Keep a ref of current state for auto-save without stale closures
  const stateRef = useRef({ text, year, selected, schoolOverrides, wrestlerOverrides, dates, reviewed, step, draftId, draftLabel })
  stateRef.current = { text, year, selected, schoolOverrides, wrestlerOverrides, dates, reviewed, step, draftId, draftLabel }

  // Load draft list on mount
  useEffect(() => {
    fetch('/api/admin/rtf-import-draft')
      .then(r => r.json())
      .then(d => setDrafts(d.drafts ?? []))
      .catch(() => {})
  }, [])

  // ── Save draft ────────────────────────────────────────────────────────────

  const saveDraft = useCallback(async (auto = false) => {
    const { text: t, year: y, selected: sel, schoolOverrides: so, wrestlerOverrides: wo, dates: dt, reviewed: rev, step: st, draftId: did, draftLabel: dl } = stateRef.current
    if (!t.trim()) return
    if (!auto) setSaveState('saving')
    try {
      const res = await fetch('/api/admin/rtf-import-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: did ?? undefined,
          label: dl,
          text: t,
          year: y,
          selected: [...sel],
          school_overrides: so,
          wrestler_overrides: wo,
          dates: dt,
          reviewed: rev,
          step: st,
        }),
      })
      const data = await res.json()
      if (data.draft?.id) {
        setDraftId(data.draft.id)
        if (!auto) setSaveState('saved')
        // Refresh summary list
        fetch('/api/admin/rtf-import-draft')
          .then(r => r.json())
          .then(d => setDrafts(d.drafts ?? []))
          .catch(() => {})
      }
    } catch {
      if (!auto) setSaveState('error')
    }
  }, [])

  // Auto-save when overrides or dates change while in review step
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (step !== 'review') return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => saveDraft(true), 2000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [schoolOverrides, wrestlerOverrides, dates, step, saveDraft])

  // Reset save state badge after 3 s
  useEffect(() => {
    if (saveState !== 'saved') return
    const t = setTimeout(() => setSaveState('idle'), 3000)
    return () => clearTimeout(t)
  }, [saveState])

  // ── Resume draft ──────────────────────────────────────────────────────────

  async function handleResume(id: string) {
    const res = await fetch(`/api/admin/rtf-import-draft?id=${id}`)
    const { draft } = await res.json()
    if (!draft) return
    setText(draft.text)
    setYear(draft.year)
    setSelected(new Set(draft.selected ?? []))
    setSchoolOverrides(draft.school_overrides ?? {})
    setWrestlerOverrides(draft.wrestler_overrides ?? {})
    setDates(draft.dates ?? {})
    setReviewed(draft.reviewed ?? [])
    setDraftId(draft.id)
    setDraftLabel(draft.label ?? '')
    const s = draft.step as Step
    setStep(s)
    if (s === 'review') {
      const rev: ReviewedTournament[] = draft.reviewed ?? []
      setExpandedTournament(
        rev.find((t: ReviewedTournament) => t.school_flags.length > 0 || t.wrestler_flags.length > 0)?.name
        ?? rev[0]?.name ?? null,
      )
    }
  }

  async function handleDeleteDraft(id: string) {
    await fetch(`/api/admin/rtf-import-draft?id=${id}`, { method: 'DELETE' })
    setDrafts(prev => prev.filter(d => d.id !== id))
    if (draftId === id) setDraftId(null)
  }

  // ── Step 1 → 2: parse ────────────────────────────────────────────────────

  function handleParse() {
    if (!text.trim()) return
    setParseError(null)
    startTransition(async () => {
      const data = await apiPost<{ tournaments: TournamentSummary[] }>(
        '/api/admin/rtf/parse', { text, year },
      )
      if (data.error) { setParseError(data.error); return }
      setSummaries(data.tournaments)
      setSelected(new Set(data.tournaments.filter(t => !t.has_existing_bouts).map(t => t.name)))
      setStep('select')
    })
  }

  // ── Step 2 → 3: match ────────────────────────────────────────────────────

  function handleMatch() {
    setMatchError(null)
    startTransition(async () => {
      const data = await apiPost<{ reviewed: ReviewedTournament[] }>(
        '/api/admin/rtf/match', { text, year, selected: [...selected], schoolOverrides },
      )
      if (data.error) { setMatchError(data.error); return }
      setReviewed(data.reviewed)
      const d: Record<string, { start_date: string; end_date: string | null }> = {}
      for (const t of data.reviewed) d[t.name] = { start_date: t.start_date, end_date: t.end_date }
      setDates(d)
      setExpandedTournament(
        data.reviewed.find(t => t.school_flags.length > 0 || t.wrestler_flags.length > 0)?.name
        ?? data.reviewed[0]?.name ?? null,
      )
      setStep('review')
    })
  }

  // ── Step 3 → 4: import ──────────────────────────────────────────────────

  function handleImport() {
    startTransition(async () => {
      const data = await apiPost<{ results: ImportResult[] }>(
        '/api/admin/rtf/import', { text, year, selected: [...selected], schoolOverrides, wrestlerOverrides, tournamentDates: dates, force },
      )
      if (data.error) { setMatchError(data.error); return }
      // Mark draft as imported
      if (draftId) {
        fetch('/api/admin/rtf-import-draft', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: draftId }),
        }).catch(() => {})
      }
      setImportResults(data.results)
      setStep('done')
    })
  }

  function handleOverride(raw: string, o: SchoolOverride | undefined) {
    setSchoolOverrides(prev => {
      const next = { ...prev }
      if (o === undefined) delete next[raw]
      else next[raw] = o
      return next
    })
  }

  function handleWrestlerOverride(key: string, o: WrestlerOverride | undefined) {
    setWrestlerOverrides(prev => {
      const next = { ...prev }
      if (o === undefined) delete next[key]
      else next[key] = o
      return next
    })
  }

  function resetAll() {
    setText(''); setSummaries([]); setSelected(new Set())
    setReviewed([]); setSchoolOverrides({}); setWrestlerOverrides({}); setDates({})
    setImportResults([]); setDraftId(null); setDraftLabel('')
    setSaveState('idle'); setStep('input')
  }

  const totalSchoolFlags = reviewed.reduce(
    (n, t) => n + t.school_flags.filter(f => !schoolOverrides[f.raw]).length, 0,
  )
  const totalWrestlerFlags = reviewed.reduce(
    (n, t) => n + t.wrestler_flags.filter(f => {
      if (schoolOverrides[f.school_raw]?.type === 'oos') return false
      const o = wrestlerOverrides[f.key]
      if (o?.type === 'skip' || o?.type === 'existing' || o?.type === 'accept') return false
      return true  // create (needs name confirmation) or unresolved
    }).length, 0,
  )

  const saveBar = (
    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 text-sm mb-2">
      <input
        type="text"
        placeholder="Draft name (optional)"
        value={draftLabel}
        onChange={e => setDraftLabel(e.target.value)}
        className="flex-1 text-xs border border-slate-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black"
      />
      <button
        onClick={() => saveDraft(false)}
        disabled={saveState === 'saving'}
        className="px-3 py-1 text-xs border border-slate-400 hover:border-black transition-colors flex items-center gap-1.5 disabled:opacity-50"
      >
        {saveState === 'saving' ? <><Spinner /> Saving…</> : 'Save progress'}
      </button>
      {saveState === 'saved' && <span className="text-xs text-green-700">✓ Saved</span>}
      {saveState === 'error' && <span className="text-xs text-red-600">Save failed</span>}
      {draftId && saveState === 'idle' && <span className="text-xs text-slate-400">Auto-saves as you review</span>}
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Step 1: Input ─────────────────────────────────────────────────── */}
      {step === 'input' && (
        <div className="space-y-4">
          {drafts.length > 0 && (
            <div className="border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Saved drafts</p>
              {drafts.map(d => (
                <div key={d.id} className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-slate-800">{d.label || 'Untitled'}</span>
                    <span className="text-xs text-slate-400 ml-2">{d.tournament_count} tournaments · step: {d.step}</span>
                    <span className="text-xs text-slate-400 ml-2">{new Date(d.updated_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleResume(d.id)} className="text-xs px-2 py-1 bg-black text-white hover:bg-slate-800 transition-colors">Resume</button>
                    <button onClick={() => handleDeleteDraft(d.id)} className="text-xs px-2 py-1 border border-slate-300 hover:border-red-400 hover:text-red-600 transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700">Calendar year</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="text-sm border border-slate-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-black"
            >
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <textarea
            className="w-full h-80 text-xs font-mono border border-slate-300 p-3 focus:outline-none focus:ring-1 focus:ring-black resize-y placeholder-slate-300"
            placeholder={`Paste plain-text RTF content here…\n\nConvert first with:\n  textutil -convert txt -stdout "Dec 2025 Tournaments.rtf" | pbcopy`}
            value={text}
            onChange={e => setText(e.target.value)}
          />
          {parseError && <pre className="text-sm text-red-600 whitespace-pre-wrap">{parseError}</pre>}
          <button
            onClick={handleParse}
            disabled={!text.trim() || isPending}
            className="px-4 py-2 bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            {isPending ? <><Spinner /> Detecting…</> : 'Detect Tournaments'}
          </button>
        </div>
      )}

      {/* ── Step 2: Select ─────────────────────────────────────────────────── */}
      {step === 'select' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">{summaries.length} tournaments detected</h2>
            <div className="flex gap-2 text-xs">
              <button onClick={() => setSelected(new Set(summaries.map(t => t.name)))} className="text-slate-500 hover:text-black">Select all</button>
              <span className="text-slate-300">|</span>
              <button onClick={() => setSelected(new Set())} className="text-slate-500 hover:text-black">None</button>
            </div>
          </div>

          <div className="border border-black bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="w-8 px-3 py-2" />
                  <th className="text-left px-3 py-2 font-medium text-slate-500">Tournament</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-500">Date</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-500">Format</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-500">Bouts</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-500">Places</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaries.map(t => {
                  const on = selected.has(t.name)
                  return (
                    <tr
                      key={t.name}
                      onClick={() => setSelected(prev => {
                        const n = new Set(prev); on ? n.delete(t.name) : n.add(t.name); return n
                      })}
                      className={`cursor-pointer ${on ? 'bg-white' : 'bg-slate-50 opacity-60'} hover:bg-blue-50 transition-colors`}
                    >
                      <td className="px-3 py-2"><input type="checkbox" readOnly checked={on} className="accent-black" /></td>
                      <td className="px-3 py-2 font-medium text-slate-900">{t.name}</td>
                      <td className="px-3 py-2 text-slate-500 text-xs">{t.start_date}{t.end_date ? ` – ${t.end_date}` : ''}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${t.source_format === 'full_bracket' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                          {t.source_format === 'full_bracket' ? 'full bracket' : 'school tracking'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">{t.bout_count}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{t.placement_count}</td>
                      <td className="px-3 py-2">
                        {t.has_existing_bouts
                          ? <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">in DB</span>
                          : t.existing_id
                          ? <span className="text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">row exists</span>
                          : <span className="text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">new</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {matchError && <p className="text-sm text-red-600">{matchError}</p>}
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('input')} className="px-3 py-1.5 text-sm border border-slate-300 hover:border-black transition-colors">← Back</button>
            <button
              onClick={handleMatch}
              disabled={selected.size === 0 || isPending}
              className="px-4 py-2 bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              {isPending ? <><Spinner /> Matching…</> : `Match & Review ${selected.size} Tournament${selected.size !== 1 ? 's' : ''}`}
            </button>
            {isPending && <p className="text-xs text-slate-400">Running school and wrestler matching — may take 20–40 s…</p>}
          </div>
        </div>
      )}

      {/* ── Step 3: Review ────────────────────────────────────────────────── */}
      {step === 'review' && (
        <div className="space-y-5">
          {saveBar}

          <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 border border-slate-200 text-sm">
            <span className="font-semibold text-slate-800">{reviewed.length} tournaments</span>
            <span className="text-slate-500">{reviewed.reduce((n, t) => n + t.bout_count, 0).toLocaleString()} bouts</span>
            {totalSchoolFlags > 0
              ? <span className="text-amber-700 font-medium">⚠ {totalSchoolFlags} unresolved school{totalSchoolFlags !== 1 ? 's' : ''}</span>
              : <span className="text-green-700">✓ All schools resolved</span>}
            {totalWrestlerFlags > 0
              ? <span className="text-blue-700">{totalWrestlerFlags} wrestler flag{totalWrestlerFlags !== 1 ? 's' : ''}</span>
              : <span className="text-green-700">✓ No wrestler flags</span>}
          </div>

          {reviewed.map(t => {
            const open = expandedTournament === t.name
            const unresolvedSchools = t.school_flags.filter(f => !schoolOverrides[f.raw])
            const td = dates[t.name] ?? { start_date: t.start_date, end_date: t.end_date }

            return (
              <div key={t.name} className="border border-black bg-white">
                <button
                  onClick={() => setExpandedTournament(open ? null : t.name)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-slate-900">{t.name}</span>
                    <span className="text-xs text-slate-400">{td.start_date}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${t.source_format === 'full_bracket' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                      {t.source_format === 'full_bracket' ? 'full bracket' : 'school tracking'}
                    </span>
                    {t.has_existing_bouts && <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">bouts already in DB</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                    <span>{t.bout_count} bouts</span>
                    {t.placement_count > 0 && <span>{t.placement_count} places</span>}
                    {unresolvedSchools.length > 0 && <span className="text-amber-700 font-medium">⚠ {unresolvedSchools.length}</span>}
                    {t.wrestler_flags.length > 0 && <span className="text-blue-700">{t.wrestler_flags.length} wrestlers</span>}
                    <span>{open ? '▲' : '▼'}</span>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-slate-200 p-4 space-y-5">
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      <label className="text-slate-500 text-xs">Start</label>
                      <input type="date" value={td.start_date}
                        onChange={e => setDates(prev => ({ ...prev, [t.name]: { ...td, start_date: e.target.value } }))}
                        className="border border-slate-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" />
                      <label className="text-slate-500 text-xs">End</label>
                      <input type="date" value={td.end_date ?? ''}
                        onChange={e => setDates(prev => ({ ...prev, [t.name]: { ...td, end_date: e.target.value || null } }))}
                        className="border border-slate-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" />
                    </div>

                    {t.school_flags.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">School flags ({t.school_flags.length})</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {t.school_flags.map(flag => (
                            <SchoolFlagCard key={flag.raw} flag={flag} override={schoolOverrides[flag.raw]} onOverride={handleOverride} />
                          ))}
                        </div>
                      </div>
                    )}

                    {(() => {
                      const visibleFlags = t.wrestler_flags.filter(
                        f => schoolOverrides[f.school_raw]?.type !== 'oos',
                      )
                      const oosHidden = t.wrestler_flags.length - visibleFlags.length
                      if (t.wrestler_flags.length === 0) return null
                      return (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                            Wrestler flags — {visibleFlags.filter(f => f.is_new).length} new · {visibleFlags.filter(f => !f.is_new).length} low-conf
                            {oosHidden > 0 && <span className="text-slate-300 font-normal ml-2">({oosHidden} hidden — school marked OOS)</span>}
                          </p>
                          {visibleFlags.length > 0 ? (
                            <div className="space-y-1.5">
                              {visibleFlags.map(f => (
                                <WrestlerFlagCard
                                  key={f.key}
                                  flag={f}
                                  override={wrestlerOverrides[f.key]}
                                  onOverride={handleWrestlerOverride}
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">All wrestler flags resolved via school overrides.</p>
                          )}
                        </div>
                      )
                    })()}

                    {t.school_flags.length === 0 && t.wrestler_flags.length === 0 && (
                      <p className="text-sm text-slate-400">No flags — all schools and wrestlers matched cleanly.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <div className="border-t border-slate-200 pt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} className="accent-black" />
              Force re-import tournaments already in DB (overwrites existing bouts)
            </label>
            {totalSchoolFlags > 0 && (
              <p className="text-sm text-amber-700">
                {totalSchoolFlags} school{totalSchoolFlags !== 1 ? 's' : ''} still unresolved — those wrestlers will import without a school link.
              </p>
            )}
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('select')} className="px-3 py-1.5 text-sm border border-slate-300 hover:border-black transition-colors">← Back</button>
              <button
                onClick={handleImport}
                disabled={isPending}
                className="px-4 py-2 bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                {isPending ? <><Spinner /> Importing…</> : `Import ${reviewed.length} Tournament${reviewed.length !== 1 ? 's' : ''}`}
              </button>
              {isPending && <p className="text-xs text-slate-400">Writing to database…</p>}
            </div>
            {matchError && <p className="text-sm text-red-600">{matchError}</p>}
          </div>
        </div>
      )}

      {/* ── Step 4: Done ─────────────────────────────────────────────────── */}
      {step === 'done' && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Import complete</h2>
          <div className="border border-black bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">Tournament</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-500">Bouts</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-500">Placements</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-500">New wrestlers</th>
                  <th className="px-4 py-2 font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importResults.map(r => (
                  <tr key={r.tournament} className={r.error ? 'bg-red-50' : ''}>
                    <td className="px-4 py-2 font-medium text-slate-900">{r.tournament}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{r.bouts_inserted}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{r.placements_upserted}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{r.wrestlers_created}</td>
                    <td className="px-4 py-2">
                      {r.error
                        ? <span className="text-xs text-red-700">{r.error}</span>
                        : r.skipped
                        ? <span className="text-xs text-amber-700">skipped (bouts existed)</span>
                        : <span className="text-xs text-green-700 font-medium">✓ imported</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td className="px-4 py-2 font-semibold text-slate-700">Total</td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-800">{importResults.reduce((n, r) => n + r.bouts_inserted, 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-800">{importResults.reduce((n, r) => n + r.placements_upserted, 0)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-800">{importResults.reduce((n, r) => n + r.wrestlers_created, 0)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex gap-3">
            <a href="/tournaments" className="px-4 py-2 bg-black text-white text-sm font-medium hover:bg-slate-800 transition-colors">View tournaments →</a>
            <button onClick={resetAll} className="px-4 py-2 text-sm border border-slate-300 hover:border-black transition-colors">
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
