'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import type {
  TournamentSummary,
  TournamentType,
  ReviewedTournament,
  SchoolFlag,
  SchoolOverride,
  WrestlerOverride,
  TournamentOverride,
  MsProfileLink,
  ImportResult,
} from './types'
import { SchoolFlagCard } from './SchoolFlagCard'
import { WrestlerFlagCard } from './WrestlerFlagCard'
import { BoutReviewPanel } from './BoutReviewPanel'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

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
  try {
    return await res.json()
  } catch {
    return { error: `Server error (${res.status})` } as T & { error?: string }
  }
}

function getSessionData(type: 'dual' | 'tournament'): { text: string; gender: 'M' | 'F'; tournament_id?: string; tournament_name?: string; registry_id?: string } {
  if (typeof window === 'undefined') return { text: '', gender: 'M' }
  try {
    const raw = sessionStorage.getItem('mw_pending_import')
    if (!raw) return { text: '', gender: 'M' }
    const parsed = JSON.parse(raw)
    const gender: 'M' | 'F' = parsed.gender === 'F' ? 'F' : 'M'
    if (parsed.type === type && parsed.text) {
      sessionStorage.removeItem('mw_pending_import')
      return {
        text: parsed.text as string,
        gender,
        tournament_id:   parsed.tournament_id as string | undefined,
        tournament_name: parsed.tournament_name as string | undefined,
        registry_id:     parsed.registry_id as string | undefined,
      }
    }
    return { text: '', gender }
  } catch { return { text: '', gender: 'M' } }
}

type TSearchResult = { id: string; name: string; start_date: string | null; season: string }

function TournamentDbMatchCell({
  tkey, autoMatch, alternates, tov, gender,
  onChange,
}: {
  tkey: string
  autoMatch: { tournament_id: string; tournament_name: string; confidence: string } | null
  alternates: { tournament_id: string; tournament_name: string; confidence: string }[]
  tov: TournamentOverride | undefined
  gender: 'M' | 'F'
  onChange: (ov: TournamentOverride | null) => void
}) {
  const [searchMode, setSearchMode] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!searchMode || query.length < 2) { setResults([]); return }
    const ctrl = new AbortController()
    setSearching(true)
    fetch(`/api/admin/search-tournaments?q=${encodeURIComponent(query)}&gender=${gender}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => { setResults(d.tournaments ?? []); setSearching(false) })
      .catch(() => setSearching(false))
    return () => ctrl.abort()
  }, [query, searchMode, gender])

  function select(id: string, name: string) {
    onChange({ type: 'existing', tournament_id: id, tournament_name: name })
    setSearchMode(false)
    setQuery('')
    setResults([])
  }

  const confColor = (c: string) =>
    c === 'exact' ? 'text-green-700 bg-green-50' :
    c === 'high'  ? 'text-blue-700 bg-blue-50' :
    c === 'low'   ? 'text-amber-700 bg-amber-50' :
    'text-slate-500 bg-slate-100'

  // Any confirmed existing override — locked green badge
  if (tov?.type === 'existing' && !searchMode) {
    return (
      <div className="space-y-1 min-w-[180px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-50 font-medium">
            ⟵ {tov.tournament_name}
          </span>
          <button onClick={() => setSearchMode(true)} className="text-[10px] text-slate-400 hover:text-slate-700 underline">change</button>
        </div>
      </div>
    )
  }

  // "Create new" override
  if (tov?.type === 'new' && !searchMode) {
    return (
      <div className="flex items-center gap-1.5 min-w-[180px]">
        <span className="text-xs px-1.5 py-0.5 rounded text-slate-700 bg-slate-100">Creating new</span>
        <button onClick={() => { onChange(null); setSearchMode(false) }} className="text-[10px] text-slate-400 hover:text-red-600">×</button>
      </div>
    )
  }

  // Auto-match suggestion (no override yet, not in search mode)
  if (autoMatch && !searchMode) {
    return (
      <div className="space-y-1.5 min-w-[180px]">
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`text-xs px-1.5 py-0.5 rounded ${confColor(autoMatch.confidence)}`}>
            {autoMatch.tournament_name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => select(autoMatch.tournament_id, autoMatch.tournament_name)}
            className="text-[11px] px-1.5 py-0.5 bg-black text-white hover:bg-slate-700"
          >✓ Use</button>
          <button
            onClick={() => setSearchMode(true)}
            className="text-[11px] px-1.5 py-0.5 border border-slate-300 hover:border-black text-slate-600"
          >Search</button>
          {alternates.map(a => (
            <button
              key={a.tournament_id}
              onClick={() => select(a.tournament_id, a.tournament_name)}
              className={`text-[10px] px-1 py-0.5 rounded ${confColor(a.confidence)}`}
            >{a.tournament_name}</button>
          ))}
        </div>
      </div>
    )
  }

  // Search mode (no override, no auto-match, or "change" clicked)
  return (
    <div className="space-y-1 min-w-[200px]">
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search tournament…"
          className="text-xs border border-slate-300 px-1.5 py-1 focus:outline-none focus:border-black w-full max-w-[180px]"
        />
        {searching && <span className="text-[10px] text-slate-400">…</span>}
        {(autoMatch || tov) && (
          <button onClick={() => setSearchMode(false)} className="text-[10px] text-slate-400 hover:text-slate-700">↩</button>
        )}
      </div>
      {results.length > 0 && (
        <div className="border border-slate-200 bg-white shadow-sm max-h-40 overflow-y-auto">
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => select(r.id, r.name)}
              className="w-full text-left text-xs px-2 py-1 hover:bg-slate-50 border-b border-slate-100 last:border-0"
            >
              <span className="font-medium">{r.name}</span>
              {r.start_date && <span className="text-slate-400 ml-1">{r.start_date.slice(0, 7)}</span>}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => { onChange({ type: 'new' }); setSearchMode(false) }}
        className="text-[10px] text-slate-400 hover:text-slate-700 underline"
      >Create new record</button>
    </div>
  )
}

export function RtfImportClient() {
  const { gender } = useAdminGender()
  const [step, setStep] = useState<Step>('input')
  const [sessionData]   = useState(() => getSessionData('tournament'))
  const [text, setText] = useState(sessionData.text)
  const [year, setYear] = useState(new Date().getFullYear())
  const [isPending, startTransition] = useTransition()

  const [summaries, setSummaries] = useState<TournamentSummary[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [parseError, setParseError] = useState<string | null>(null)

  const [reviewed, setReviewed] = useState<ReviewedTournament[]>([])
  const [schoolOverrides, setSchoolOverrides] = useState<Record<string, SchoolOverride>>({})
  // Wrestlers are only matched at confirmed schools, so any school decision needs a re-match
  const [wrestlersStale, setWrestlersStale] = useState(false)
  const [wrestlerOverrides, setWrestlerOverrides] = useState<Record<string, WrestlerOverride>>({})
  const [dates, setDates] = useState<Record<string, { start_date: string; end_date: string | null }>>({})
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null)
  const [matchError, setMatchError] = useState<string | null>(null)

  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [force, setForce] = useState(false)
  const [deferredTournaments, setDeferredTournaments] = useState<Set<string>>(new Set())
  const [tournamentTypes, setTournamentTypes] = useState<Record<string, TournamentType>>({})
  const [venues, setVenues] = useState<Record<string, { venue_name: string; venue_address: string }>>({})
  const [tournamentOverrides, setTournamentOverrides] = useState<Record<string, TournamentOverride>>({})
  const [hubPinnedTkey, setHubPinnedTkey] = useState<string | null>(null)
  const [msProfileLinks, setMsProfileLinks] = useState<Record<string, MsProfileLink>>({})

  // Bout review state: tkey → boutKey → confirmed round
  const [boutRounds, setBoutRounds] = useState<Record<string, Record<string, string>>>({})
  // tkey → uid → isDuplicate override
  const [boutDuplicates, setBoutDuplicates] = useState<Record<string, Record<string, boolean>>>({})
  // tkey → seedKey → seed number
  const [boutSeeds, setBoutSeeds] = useState<Record<string, Record<string, number>>>({})

  // ── Draft state ───────────────────────────────────────────────────────────
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftLabel, setDraftLabel] = useState('')
  const [drafts, setDrafts] = useState<DraftSummary[]>([])
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Keep a ref of current state for auto-save without stale closures
  const stateRef = useRef({ text, year, selected, schoolOverrides, wrestlerOverrides, dates, tournamentTypes, reviewed, step, draftId, draftLabel })
  stateRef.current = { text, year, selected, schoolOverrides, wrestlerOverrides, dates, tournamentTypes, reviewed, step, draftId, draftLabel }


  // Load draft list on mount
  useEffect(() => {
    fetch('/api/admin/rtf-import-draft')
      .then(r => r.json())
      .then(d => setDrafts(d.drafts ?? []))
      .catch(() => {})
  }, [])

  // Auto-detect when arriving from the tournament hub row
  useEffect(() => {
    if (!sessionData.text.trim()) return
    startTransition(async () => {
      try {
        const data = await apiPost<{ tournaments: TournamentSummary[] }>(
          '/api/admin/rtf/parse', { text: sessionData.text, year },
        )
        if (data.error || !data.tournaments) return
        setSummaries(data.tournaments)
        setSelected(new Set(data.tournaments.filter(t => !t.has_existing_bouts).map(t => `${t.name}|${t.date_raw}`)))
        // Pre-pin to the hub tournament — hub rows always contain a single tournament's data.
        // Try sources in priority order until one works:
        //   1. Explicit tournament_id passed from hub (hub row was already linked)
        //   2. Exact name match found in DB (existing_id from parse route)
        //   3. High/exact fuzzy match (tournament_match from parse route)
        //   4. Direct name search against the hub row's tournament_name (most reliable fallback)
        if (sessionData.tournament_name && data.tournaments.length > 0) {
          const first = data.tournaments[0]
          const tkey = `${first.name}|${first.date_raw}`
          setHubPinnedTkey(tkey)
          let pinOv: TournamentOverride | undefined
          if (sessionData.tournament_id) {
            pinOv = { type: 'existing', tournament_id: sessionData.tournament_id, tournament_name: sessionData.tournament_name }
          } else if (first.existing_id) {
            pinOv = { type: 'existing', tournament_id: first.existing_id, tournament_name: first.name }
          } else if (first.tournament_match && (first.tournament_match.confidence === 'exact' || first.tournament_match.confidence === 'high')) {
            pinOv = { type: 'existing', tournament_id: first.tournament_match.tournament_id, tournament_name: first.tournament_match.tournament_name }
          } else {
            // Fallback: search registry by hub row name + gender
            const sr = await fetch(`/api/admin/search-tournaments?q=${encodeURIComponent(sessionData.tournament_name)}&gender=${sessionData.gender}`)
            const sd = await sr.json()
            if (sd.tournaments?.length >= 1) {
              pinOv = { type: 'existing', tournament_id: sd.tournaments[0].id, tournament_name: sd.tournaments[0].name }
            }
          }
          if (pinOv) setTournamentOverrides({ [tkey]: pinOv })
        }
        setStep('select')
      } catch { /* fall through to manual input */ }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Save draft ────────────────────────────────────────────────────────────

  const saveDraft = useCallback(async (auto = false) => {
    const { text: t, year: y, selected: sel, schoolOverrides: so, wrestlerOverrides: wo, dates: dt, tournamentTypes: tt, reviewed: rev, step: st, draftId: did, draftLabel: dl } = stateRef.current
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
          tournament_types: tt,
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
  }, [schoolOverrides, wrestlerOverrides, dates, tournamentTypes, step, saveDraft])

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
    setTournamentTypes(draft.tournament_types ?? {})
    setReviewed(draft.reviewed ?? [])
    setDraftId(draft.id)
    setDraftLabel(draft.label ?? '')
    const s = draft.step as Step
    setStep(s)
    if (s === 'review') {
      const rev: ReviewedTournament[] = draft.reviewed ?? []
      const firstFlagR = rev.find((t: ReviewedTournament) => t.school_flags.length > 0 || (t.team_score_flags ?? []).length > 0 || t.wrestler_flags.length > 0)
      const firstAnyR = rev[0]
      setExpandedTournament(
        firstFlagR ? `${firstFlagR.name}|${firstFlagR.date_raw}` :
        firstAnyR  ? `${firstAnyR.name}|${firstAnyR.date_raw}` : null,
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
      try {
        const data = await apiPost<{ tournaments: TournamentSummary[] }>(
          '/api/admin/rtf/parse', { text, year },
        )
        if (data.error) { setParseError(data.error); return }
        setSummaries(data.tournaments)
        setSelected(new Set(data.tournaments.filter(t => !t.has_existing_bouts).map(t => `${t.name}|${t.date_raw}`)))
        setStep('select')
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'Unexpected error — try again')
      }
    })
  }

  // ── Step 2 → 3: match ────────────────────────────────────────────────────

  function handleMatch() {
    setMatchError(null)
    startTransition(async () => {
      try {
      const data = await apiPost<{ reviewed: ReviewedTournament[] }>(
        '/api/admin/rtf/match', { text, year, selected: [...selected], schoolOverrides, tournamentTypes, gender },
      )
      if (data.error) { setMatchError(data.error); return }
      setReviewed(data.reviewed)
      setWrestlersStale(false)
      const d: Record<string, { start_date: string; end_date: string | null }> = {}
      const tt: Record<string, TournamentType> = {}
      const vv: Record<string, { venue_name: string; venue_address: string }> = {}
      const br: Record<string, Record<string, string>> = {}
      const bd: Record<string, Record<string, boolean>> = {}
      for (const t of data.reviewed) {
        const k = `${t.name}|${t.date_raw}`
        d[k] = { start_date: t.start_date, end_date: t.end_date }
        tt[k] = t.tournament_type ?? 'inside'
        vv[k] = { venue_name: t.venue_name ?? '', venue_address: t.venue_address ?? '' }
        br[k] = {}
        bd[k] = {}
        for (const b of t.bouts_for_review ?? []) {
          br[k][b.key] = b.inferred_round
          if (b.is_duplicate) bd[k][String(b.uid)] = true
        }
      }
      setDates(d)
      setTournamentTypes(prev => ({ ...tt, ...prev }))
      setVenues(prev => ({ ...vv, ...prev }))
      setBoutRounds(br)
      setBoutDuplicates(bd)
      const firstFlag = data.reviewed.find(t => t.school_flags.length > 0 || (t.team_score_flags ?? []).length > 0 || t.wrestler_flags.length > 0)
      const firstAny = data.reviewed[0]
      setExpandedTournament(
        firstFlag ? `${firstFlag.name}|${firstFlag.date_raw}` :
        firstAny  ? `${firstAny.name}|${firstAny.date_raw}` : null,
      )
      setStep('review')
      } catch (e) {
        setMatchError(e instanceof Error ? e.message : 'Unexpected error — try again')
      }
    })
  }

  // ── Re-match wrestlers only (keeps school flags + dates + all overrides) ─

  function handleRematchWrestlers() {
    setMatchError(null)
    startTransition(async () => {
      try {
        const data = await apiPost<{ reviewed: ReviewedTournament[] }>(
          '/api/admin/rtf/match', { text, year, selected: [...selected], schoolOverrides, tournamentTypes, gender },
        )
        if (data.error) { setMatchError(data.error); return }
        // Take fresh wrestler_flags; add any new school flags (e.g. a tournament switched to
        // Outside now needs every school confirmed) while keeping existing cards and dates
        const mergeFlags = (prev: SchoolFlag[], next: SchoolFlag[]) =>
          [...prev, ...next.filter(f => !prev.some(p => p.raw === f.raw))]
        setWrestlersStale(false)
        setReviewed(prev => prev.map(t => {
          const fresh = data.reviewed.find(r => r.name === t.name && r.date_raw === t.date_raw)
          return fresh ? {
            ...t,
            wrestler_flags: fresh.wrestler_flags,
            school_flags: mergeFlags(t.school_flags, fresh.school_flags),
            team_score_flags: mergeFlags(t.team_score_flags ?? [], fresh.team_score_flags ?? []),
          } : t
        }))
      } catch (e) {
        setMatchError(e instanceof Error ? e.message : 'Unexpected error — try again')
      }
    })
  }

  // ── Step 3 → 4: import ──────────────────────────────────────────────────

  function handleImport() {
    startTransition(async () => {
      try {
        const toImport = [...selected].filter(tkey => !deferredTournaments.has(tkey))
        const boutReview: Record<string, Record<string, string>> = {}
        for (const tkey of toImport) {
          boutReview[tkey] = { ...(boutRounds[tkey] ?? {}) }
        }
        const data = await apiPost<{ results: ImportResult[] }>(
          '/api/admin/rtf/import', { text, year, selected: toImport, schoolOverrides, wrestlerOverrides, tournamentDates: dates, tournamentTypes, tournamentVenues: venues, tournamentOverrides, msProfileLinks, boutReview, force, gender, registry_id: sessionData.registry_id },
        )
        if (data.error) { setMatchError(data.error); return }
        if (draftId && deferredTournaments.size === 0) {
          fetch('/api/admin/rtf-import-draft', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: draftId }),
          }).catch(() => {})
        }
        setImportResults(data.results)
        setStep('done')
      } catch (e) {
        setMatchError(e instanceof Error ? e.message : 'Unexpected error — try again')
      }
    })
  }

  function handleOverride(raw: string, o: SchoolOverride | undefined) {
    setWrestlersStale(true)
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

  function handleMsLink(key: string, link: MsProfileLink | undefined) {
    setMsProfileLinks(prev => {
      const next = { ...prev }
      if (link === undefined) delete next[key]
      else next[key] = link
      return next
    })
  }

  function resetAll() {
    setText(''); setSummaries([]); setSelected(new Set())
    setReviewed([]); setSchoolOverrides({}); setWrestlersStale(false); setWrestlerOverrides({}); setDates({}); setTournamentTypes({})
    setTournamentOverrides({}); setHubPinnedTkey(null); setMsProfileLinks({})
    setBoutRounds({}); setBoutDuplicates({}); setBoutSeeds({})
    setImportResults([]); setDraftId(null); setDraftLabel('')
    setSaveState('idle'); setStep('input')
  }

  // A tournament switched to Outside after matching has no school cards yet for its
  // exact matches — block import until a re-match loads them.
  function needsOosRematch(t: ReviewedTournament) {
    const tkey = `${t.name}|${t.date_raw}`
    return tournamentTypes[tkey] === 'outside' && !deferredTournaments.has(tkey) &&
      ![...t.school_flags, ...(t.team_score_flags ?? [])].some(f => f.oos_event)
  }
  const oosRematchCount = reviewed.filter(needsOosRematch).length

  const totalSchoolFlags = reviewed.reduce(
    (n, t) =>
      n +
      t.school_flags.filter(f => !schoolOverrides[f.raw]).length +
      (t.team_score_flags ?? []).filter(f => !schoolOverrides[f.raw]).length,
    0,
  )
  const totalWrestlerFlags = reviewed.reduce(
    (n, t) => n + t.wrestler_flags.filter(f => {
      // Hide NJ wrestler flags where user re-tagged their school as OOS (not is_oos — those need review)
      if (!f.is_oos && schoolOverrides[f.school_raw]?.type === 'oos') return false
      const o = wrestlerOverrides[f.key]
      if (o?.type === 'skip' || o?.type === 'existing' || o?.type === 'accept') return false
      // Full name creates (2+ letter first name, not "C." format) are auto-confirmed from RTF
      if (o?.type === 'create' && o.first_name.trim().length >= 2 && !/^[A-Za-z]\.?$/.test(o.first_name.trim())) return false
      return true  // initial-format OOS name or no action taken yet
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

          <div className="flex items-center gap-6">
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
            <h2 className="text-base font-semibold text-slate-800">{summaries.length} tournament{summaries.length !== 1 ? 's' : ''} detected</h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                Year
                <input
                  type="number"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-16 border border-slate-300 px-1.5 py-0.5 text-xs focus:outline-none focus:border-black"
                />
              </label>
              <div className="flex gap-2 text-xs">
                <button onClick={() => setSelected(new Set(summaries.map(t => `${t.name}|${t.date_raw}`)))} className="text-slate-500 hover:text-black">Select all</button>
                <span className="text-slate-300">|</span>
                <button onClick={() => setSelected(new Set())} className="text-slate-500 hover:text-black">None</button>
              </div>
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
                  <th className="text-right px-3 py-2 font-medium text-slate-500">Scores</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Status</th>
                  <th className="px-3 py-2 font-medium text-slate-500">DB Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaries.map(t => {
                  const tkey = `${t.name}|${t.date_raw}`
                  const on = selected.has(tkey)
                  return (
                    <tr
                      key={tkey}
                      onClick={() => setSelected(prev => {
                        const n = new Set(prev); on ? n.delete(tkey) : n.add(tkey); return n
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
                      <td className="px-3 py-2 text-right text-slate-600">{t.team_score_count > 0 ? t.team_score_count : '—'}</td>
                      <td className="px-3 py-2">
                        {t.has_existing_bouts
                          ? <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">in DB</span>
                          : t.existing_id
                          ? <span className="text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">row exists</span>
                          : <span className="text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">new</span>}
                      </td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <TournamentDbMatchCell
                          tkey={tkey}
                          autoMatch={t.tournament_match ?? null}
                          alternates={t.tournament_alternates ?? []}
                          tov={tournamentOverrides[tkey]}
                          gender={gender}
                          onChange={ov => setTournamentOverrides(prev => {
                            const n = { ...prev }
                            if (ov) n[tkey] = ov; else delete n[tkey]
                            return n
                          })}
                        />
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
            <button
              onClick={handleRematchWrestlers}
              disabled={isPending}
              className="ml-auto px-3 py-1 border border-slate-300 text-slate-600 hover:border-black disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              {isPending ? <><Spinner /> Re-matching…</> : '↺ Re-match wrestlers'}
            </button>
          </div>

          {reviewed.map(t => {
            const tkey = `${t.name}|${t.date_raw}`
            const open = expandedTournament === tkey
            const unresolvedSchools = t.school_flags.filter(f => !schoolOverrides[f.raw])
            const unresolvedTsSchools = (t.team_score_flags ?? []).filter(f => !schoolOverrides[f.raw])
            const td = dates[tkey] ?? { start_date: t.start_date, end_date: t.end_date }
            const deferred = deferredTournaments.has(tkey)

            return (
              <div key={tkey} className={`border bg-white ${deferred ? 'border-slate-300 opacity-60' : 'border-black'}`}>
                <div className="w-full flex items-center justify-between px-4 py-3 text-left">
                  <label className="flex items-center gap-2 cursor-pointer shrink-0" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={!deferred}
                      onChange={e => setDeferredTournaments(prev => {
                        const next = new Set(prev)
                        if (e.target.checked) next.delete(tkey)
                        else next.add(tkey)
                        return next
                      })}
                      className="accent-black"
                    />
                  </label>
                  <button
                    onClick={() => setExpandedTournament(open ? null : tkey)}
                    className="flex-1 flex items-center justify-between hover:bg-slate-50 transition-colors text-left min-w-0"
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
                    {(unresolvedSchools.length + unresolvedTsSchools.length) > 0 && <span className="text-amber-700 font-medium">⚠ {unresolvedSchools.length + unresolvedTsSchools.length}</span>}
                    {t.wrestler_flags.length > 0 && <span className="text-blue-700">{t.wrestler_flags.length} wrestlers</span>}
                    <span>{open ? '▲' : '▼'}</span>
                  </div>
                  </button>
                </div>

                {open && (
                  <div className="border-t border-slate-200 p-4 space-y-5">
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      <label className="text-slate-500 text-xs">Start</label>
                      <input type="date" value={td.start_date}
                        onChange={e => setDates(prev => ({ ...prev, [tkey]: { ...td, start_date: e.target.value } }))}
                        className="border border-slate-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" />
                      <label className="text-slate-500 text-xs">End</label>
                      <input type="date" value={td.end_date ?? ''}
                        onChange={e => setDates(prev => ({ ...prev, [tkey]: { ...td, end_date: e.target.value || null } }))}
                        className="border border-slate-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" />
                      <label className="text-slate-500 text-xs">Type</label>
                      <select
                        value={tournamentTypes[tkey] ?? 'inside'}
                        onChange={e => setTournamentTypes(prev => ({ ...prev, [tkey]: e.target.value as TournamentType }))}
                        className="border border-slate-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                      >
                        <option value="inside">Inside (NJ only)</option>
                        <option value="inside_outside">Inside/Outside (NJ host + OOS)</option>
                        <option value="outside">Outside (NJ teams travel out of state)</option>
                      </select>
                    </div>
                    {needsOosRematch(t) && (
                      <p className="text-xs text-red-600">
                        Outside events need every school confirmed — click ↺ Re-match wrestlers to load the school review.
                      </p>
                    )}

                    {/* Venue */}
                    {(() => {
                      const vd = venues[tkey] ?? { venue_name: '', venue_address: '' }
                      return (
                        <div className="flex items-start gap-4 text-sm flex-wrap">
                          <label className="text-slate-500 text-xs pt-1 shrink-0">Venue</label>
                          <input
                            type="text"
                            placeholder="Venue name"
                            value={vd.venue_name}
                            onChange={e => setVenues(prev => ({ ...prev, [tkey]: { ...vd, venue_name: e.target.value } }))}
                            className="border border-slate-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-black min-w-[220px] flex-1"
                          />
                          <input
                            type="text"
                            placeholder="Address"
                            value={vd.venue_address}
                            onChange={e => setVenues(prev => ({ ...prev, [tkey]: { ...vd, venue_address: e.target.value } }))}
                            className="border border-slate-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-black min-w-[260px] flex-1"
                          />
                        </div>
                      )
                    })()}

                    {(() => {
                      // Bulk-confirm only existing OOS schools whose names are distinct from
                      // every NJ school; NJ matches and lookalikes (Dover, DE) stay one by one.
                      const bulk = [...t.school_flags, ...(t.team_score_flags ?? [])]
                        .filter((f, i, all) => f.bulk_ok && !schoolOverrides[f.raw] && all.findIndex(g => g.raw === f.raw) === i)
                      if (bulk.length === 0) return null
                      return (
                        <button
                          onClick={() => {
                            setWrestlersStale(true)
                            setSchoolOverrides(prev => {
                              const next = { ...prev }
                              for (const f of bulk) next[f.raw] = { type: 'oos', school_id: f.school_id!, display_name: f.display_name! }
                              return next
                            })
                          }}
                          className="text-xs px-2 py-1 border border-amber-300 text-amber-800 hover:border-amber-500 hover:bg-amber-50 transition-colors"
                        >
                          ✓ Confirm all {bulk.length} known out-of-state school{bulk.length !== 1 ? 's' : ''} (names unlike any NJ school)
                        </button>
                      )
                    })()}
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

                    {(t.team_score_flags ?? []).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Team score schools ({(t.team_score_flags ?? []).length})</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(t.team_score_flags ?? []).map(flag => (
                            <SchoolFlagCard
                              key={flag.raw}
                              flag={flag}
                              override={schoolOverrides[flag.raw]}
                              onOverride={handleOverride}
                              countLabel={`Place ${flag.bout_count}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {(() => {
                      const visibleFlags = t.wrestler_flags.filter(
                        // Keep OOS wrestler flags (dedup review); hide NJ flags for OOS-tagged schools
                        f => f.is_oos || schoolOverrides[f.school_raw]?.type !== 'oos',
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
                                  gender={gender}
                                  msProfileLink={msProfileLinks[f.key]}
                                  onMsLink={handleMsLink}
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">All wrestler flags resolved via school overrides.</p>
                          )}
                        </div>
                      )
                    })()}

                    {t.school_flags.length === 0 && (t.team_score_flags ?? []).length === 0 && t.wrestler_flags.length === 0 && (
                      <p className="text-sm text-slate-400">No flags — all schools and wrestlers matched cleanly.</p>
                    )}

                    {t.source_format === 'school_tracking' && t.bouts_for_review.length > 0 && (() => {
                      const schoolsOk = unresolvedSchools.length === 0
                      const wrestlersOk = t.wrestler_flags.filter(f => {
                        if (schoolOverrides[f.school_raw]?.type === 'oos') return false
                        const o = wrestlerOverrides[f.key]
                        if (o?.type === 'skip' || o?.type === 'existing' || o?.type === 'accept') return false
                        if (o?.type === 'create' && o.first_name.trim() && o.last_name.trim()) return false
                        return true
                      }).length === 0
                      const ready = schoolsOk && wrestlersOk
                      return (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                            Bout rounds — {t.bouts_for_review.filter(b => !b.is_duplicate).length} unique · {t.bouts_for_review.filter(b => b.is_duplicate).length} duplicate
                          </p>
                          {!ready ? (
                            <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-3 py-2">
                              {!schoolsOk
                                ? 'Resolve all school flags above before reviewing bout rounds.'
                                : 'Confirm all wrestler profiles above before reviewing bout rounds.'}
                            </p>
                          ) : (
                            <BoutReviewPanel
                              bouts={t.bouts_for_review}
                              rounds={boutRounds[tkey] ?? {}}
                              duplicates={boutDuplicates[tkey] ?? {}}
                              schoolOverrides={schoolOverrides}
                              seeds={boutSeeds[tkey] ?? {}}
                              onRoundChange={(key, round) => setBoutRounds(prev => ({
                                ...prev,
                                [tkey]: { ...(prev[tkey] ?? {}), [key]: round },
                              }))}
                              onDuplicateToggle={uid => setBoutDuplicates(prev => {
                                const cur = { ...(prev[tkey] ?? {}) }
                                cur[uid] = !cur[uid]
                                return { ...prev, [tkey]: cur }
                              })}
                              onSeedChange={(seedKey, seed) => setBoutSeeds(prev => {
                                const cur = { ...(prev[tkey] ?? {}) }
                                if (seed === undefined) delete cur[seedKey]
                                else cur[seedKey] = seed
                                return { ...prev, [tkey]: cur }
                              })}
                            />
                          )}
                        </div>
                      )
                    })()}
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
              <p className="text-sm text-red-600">
                {totalSchoolFlags} school{totalSchoolFlags !== 1 ? 's' : ''} unresolved — resolve before importing.
              </p>
            )}
            {wrestlersStale && totalSchoolFlags === 0 && (
              <p className="text-sm text-red-600">
                School decisions changed — click ↺ Re-match wrestlers so wrestlers at those schools get reviewed.
              </p>
            )}
            {oosRematchCount > 0 && (
              <p className="text-sm text-red-600">
                {oosRematchCount} outside tournament{oosRematchCount !== 1 ? 's' : ''} need{oosRematchCount === 1 ? 's' : ''} a re-match so every school can be confirmed.
              </p>
            )}
            {totalWrestlerFlags > 0 && (
              <p className="text-sm text-red-600">
                {totalWrestlerFlags} wrestler{totalWrestlerFlags !== 1 ? 's' : ''} unresolved — every bout needs both wrestler IDs before import.
              </p>
            )}
            {deferredTournaments.size > 0 && (
              <p className="text-sm text-slate-500">
                {deferredTournaments.size} tournament{deferredTournaments.size !== 1 ? 's' : ''} unchecked — will be skipped and remain in the draft.
              </p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setStep('select')} className="px-3 py-1.5 text-sm border border-slate-300 hover:border-black transition-colors">← Back</button>
              <button
                onClick={handleRematchWrestlers}
                disabled={isPending}
                className="px-3 py-1.5 text-sm border border-slate-300 text-slate-600 hover:border-black disabled:opacity-40 transition-colors flex items-center gap-2"
              >
                {isPending ? <><Spinner /> Re-matching…</> : '↺ Re-match wrestlers'}
              </button>
              <button
                onClick={handleImport}
                disabled={isPending || deferredTournaments.size === reviewed.length || totalWrestlerFlags > 0 || totalSchoolFlags > 0 || oosRematchCount > 0 || wrestlersStale}
                className="px-4 py-2 bg-black text-white text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                {isPending ? <><Spinner /> Importing…</> : `Import ${reviewed.length - deferredTournaments.size} Tournament${reviewed.length - deferredTournaments.size !== 1 ? 's' : ''}`}
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
                  <th className="text-right px-4 py-2 font-medium text-slate-500">Scores</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-500">New wrestlers</th>
                  <th className="px-4 py-2 font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importResults.map(r => (
                  <tr key={r.tournament} className={r.error ? 'bg-red-50' : ''}>
                    <td className="px-4 py-2 font-medium text-slate-900">{r.tournament}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{r.bouts_inserted}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{r.placements_upserted}{r.placements_parsed != null && r.placements_parsed !== r.placements_upserted ? <span className="text-xs text-amber-600 ml-1">(parsed: {r.placements_parsed})</span> : null}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{r.team_scores_inserted > 0 ? r.team_scores_inserted : '—'}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{r.wrestlers_created}</td>
                    <td className="px-4 py-2">
                      {r.error
                        ? <span className="text-xs text-red-700">{r.error}</span>
                        : r.skipped
                        ? <span className="text-xs text-amber-700">skipped (bouts existed)</span>
                        : <span className="text-xs text-green-700 font-medium">✓ imported</span>}
                      {r.pl_error && <div className="text-xs text-red-600 mt-1">placement error: {r.pl_error}</div>}
                      {r.ts_error && <div className="text-xs text-red-600 mt-1">team score error: {r.ts_error}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td className="px-4 py-2 font-semibold text-slate-700">Total</td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-800">{importResults.reduce((n, r) => n + r.bouts_inserted, 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-800">{importResults.reduce((n, r) => n + r.placements_upserted, 0)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-800">{importResults.reduce((n, r) => n + r.team_scores_inserted, 0) || '—'}</td>
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
