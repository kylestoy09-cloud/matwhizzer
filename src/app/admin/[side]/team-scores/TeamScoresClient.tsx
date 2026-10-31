'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

type ParsedScore = {
  place: number
  school_name: string
  score: number
  school_id: number | null
  display_name: string | null
  confidence: 'exact' | 'alias' | 'high' | 'low' | 'none'
  alternates: { school_id: number; display_name: string; score: number }[]
}

type MatchedTournament = {
  id: string
  name: string
  start_date: string
  season: string
}

type ParseResult = {
  scores: ParsedScore[]
  tournaments: MatchedTournament[]
}

function ConfBadge({ conf }: { conf: ParsedScore['confidence'] }) {
  if (conf === 'exact' || conf === 'alias' || conf === 'high') {
    return <span className="text-green-600 font-bold text-xs w-3">✓</span>
  }
  if (conf === 'low') return <span className="text-amber-500 font-bold text-xs w-3">?</span>
  return <span className="text-red-500 font-bold text-xs w-3">✗</span>
}

function TournamentAutocomplete({
  value,
  onChange,
  gender,
}: {
  value: string
  onChange: (val: string) => void
  gender: 'M' | 'F'
}) {
  const [suggestions, setSuggestions] = useState<MatchedTournament[]>([])
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setOpen(false); return }
    const res = await fetch(`/api/admin/search-tournaments?q=${encodeURIComponent(q)}&gender=${gender}`)
    const json = await res.json()
    setSuggestions(json.tournaments ?? [])
    setOpen((json.tournaments ?? []).length > 0)
  }, [gender])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    onChange(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSuggestions(v), 250)
  }

  function select(t: MatchedTournament) {
    onChange(t.name)
    setSuggestions([])
    setOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleInput}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="e.g. CVC Wrestling Tournament"
        className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-black"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 border border-slate-200 border-t-0 bg-white shadow-md max-h-60 overflow-y-auto">
          {suggestions.map(t => (
            <button
              key={t.id}
              type="button"
              onMouseDown={() => select(t)}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
            >
              <p className="text-sm text-slate-900">{t.name}</p>
              <p className="text-xs text-slate-400">{t.start_date} · {t.season}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type MissingTournament = { id: string; name: string; start_date: string; season: string }

const SHOW_LIMIT = 15

function MissingList({
  tournaments,
  onSelect,
}: {
  tournaments: MissingTournament[]
  onSelect: (name: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  if (!tournaments.length) return null
  const visible = expanded ? tournaments : tournaments.slice(0, SHOW_LIMIT)

  return (
    <div className="mb-8 border border-slate-200">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <p className="text-xs font-semibold text-slate-700">
          Tournaments without scores
          <span className="ml-2 text-slate-400 font-normal">({tournaments.length})</span>
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {visible.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.name)}
            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
          >
            <span className="text-sm text-slate-800">{t.name}</span>
            <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{t.start_date}</span>
          </button>
        ))}
      </div>
      {tournaments.length > SHOW_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="w-full text-xs text-slate-500 hover:text-slate-800 px-4 py-2.5 border-t border-slate-100 text-left"
        >
          {expanded ? 'Show less ▲' : `Show ${tournaments.length - SHOW_LIMIT} more ▾`}
        </button>
      )}
    </div>
  )
}

export function TeamScoresClient() {
  const searchParams = useSearchParams()
  const { gender } = useAdminGender()
  const [step, setStep] = useState<'input' | 'review' | 'done'>('input')
  const [tournamentQuery, setTournamentQuery] = useState(() => searchParams.get('tournament') ?? '')
  const [scoresText, setScoresText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missingTournaments, setMissingTournaments] = useState<MissingTournament[]>([])

  const [result, setResult] = useState<ParseResult | null>(null)
  const [selectedTournament, setSelectedTournament] = useState<string>('')
  const [overrides, setOverrides] = useState<Record<string, number | null>>({})

  // Fetch missing tournaments client-side so gender is known
  useEffect(() => {
    fetch(`/api/admin/team-scores-missing?gender=${gender}`)
      .then(r => r.json())
      .then(d => setMissingTournaments(d.tournaments ?? []))
      .catch(() => {})
  }, [gender])

  const [inserted, setInserted] = useState(0)

  async function handleParse() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/parse-team-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, text: scoresText, tournament_query: tournamentQuery }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error ?? 'Parse failed')
      setResult(json)
      setSelectedTournament(json.tournaments[0]?.id ?? '')
      const init: Record<string, number | null> = {}
      for (const s of json.scores) init[s.school_name] = s.school_id
      setOverrides(init)
      setStep('review')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!selectedTournament || !result) return
    setLoading(true)
    setError(null)
    try {
      const scores = result.scores.map(s => ({
        place: s.place,
        school_name: s.school_name,
        score: s.score,
        school_id: overrides[s.school_name] ?? null,
      }))
      const res = await fetch('/api/admin/save-team-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_id: selectedTournament, scores }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error ?? 'Import failed')
      setInserted(json.inserted)
      setStep('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep('input')
    setResult(null)
    setError(null)
    setTournamentQuery(searchParams.get('tournament') ?? '')
    setScoresText('')
    setOverrides({})
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  if (step === 'input') {
    return (
      <div className="space-y-6">
        <MissingList
          tournaments={missingTournaments}
          onSelect={name => setTournamentQuery(name)}
        />
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Tournament Name</label>
          <TournamentAutocomplete value={tournamentQuery} onChange={setTournamentQuery} gender={gender} />
          <p className="text-xs text-slate-400 mt-1">Start typing to search — used to find the matching tournament in the database</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Team Scores</label>
          <textarea
            value={scoresText}
            onChange={e => setScoresText(e.target.value)}
            rows={16}
            placeholder={`Single-line format:\n1 Robbinsville 236.0\n2 Steinert 235.0\n\nOr multi-line (textutil output):\n1\nRobbinsville\n236.0\n2\nSteinert\n235.0`}
            className="w-full border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-black"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          onClick={handleParse}
          disabled={loading || !scoresText.trim() || !tournamentQuery.trim()}
          className="px-5 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
        >
          {loading ? 'Parsing…' : 'Parse & Review →'}
        </button>
      </div>
    )
  }

  // ── Review ─────────────────────────────────────────────────────────────────
  if (step === 'review' && result) {
    const needsAttention = result.scores.filter(s => s.confidence === 'low' || s.confidence === 'none').length

    return (
      <div className="space-y-8">
        {/* Tournament picker */}
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Tournament</h2>
          {result.tournaments.length === 0 ? (
            <div className="border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">No tournament found matching <span className="font-medium">"{tournamentQuery}"</span>.</p>
              <p className="text-xs text-red-500 mt-1">Check the name and go back to try again.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {result.tournaments.map(t => (
                <label
                  key={t.id}
                  className={`flex items-start gap-3 px-4 py-3 border cursor-pointer transition-colors ${
                    selectedTournament === t.id ? 'border-black bg-slate-50' : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="tournament"
                    value={t.id}
                    checked={selectedTournament === t.id}
                    onChange={() => setSelectedTournament(t.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.start_date} · {t.season}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Score rows */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Team Scores <span className="text-slate-400 font-normal">({result.scores.length})</span>
            </h2>
            {needsAttention > 0 && (
              <span className="text-xs font-medium text-amber-600">
                {needsAttention} school{needsAttention !== 1 ? 's' : ''} need attention
              </span>
            )}
          </div>

          <div className="border border-slate-200 divide-y divide-slate-100">
            {result.scores.map(s => {
              const isUncertain = s.confidence === 'low' || s.confidence === 'none'
              const currentId = overrides[s.school_name]

              return (
                <div
                  key={`${s.place}|${s.school_name}`}
                  className={`flex items-center gap-3 px-4 py-2.5 ${isUncertain ? 'bg-amber-50' : ''}`}
                >
                  <span className="text-xs text-slate-400 w-6 text-right tabular-nums">{s.place}</span>
                  <ConfBadge conf={s.confidence} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-900">{s.school_name}</span>
                    {!isUncertain && s.display_name && s.display_name !== s.school_name && (
                      <span className="text-xs text-slate-400 ml-2">→ {s.display_name}</span>
                    )}
                    {isUncertain && (
                      <div className="mt-1">
                        <select
                          value={currentId ?? ''}
                          onChange={e => setOverrides(prev => ({
                            ...prev,
                            [s.school_name]: e.target.value ? parseInt(e.target.value) : null,
                          }))}
                          className="text-xs border border-amber-300 bg-white px-2 py-1 text-slate-800 focus:outline-none focus:border-black"
                        >
                          <option value="">— skip (no school link) —</option>
                          {s.school_id != null && !s.alternates.find(a => a.school_id === s.school_id) && (
                            <option value={s.school_id}>{s.display_name}</option>
                          )}
                          {s.alternates.map(a => (
                            <option key={a.school_id} value={a.school_id}>{a.display_name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <span className="text-sm tabular-nums text-slate-700 font-mono">{s.score}</span>
                </div>
              )
            })}
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => { setStep('input'); setError(null) }}
            className="px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !selectedTournament || result.tournaments.length === 0}
            className="px-5 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
          >
            {loading ? 'Saving…' : `Import ${result.scores.length} Scores`}
          </button>
        </div>
      </div>
    )
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="border border-green-200 bg-green-50 px-4 py-3">
        <p className="text-sm font-semibold text-green-800">
          Done — {inserted} team score{inserted !== 1 ? 's' : ''} saved
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Import another
        </button>
        <Link
          href="/admin"
          className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors"
        >
          Back to Admin
        </Link>
      </div>
    </div>
  )
}
