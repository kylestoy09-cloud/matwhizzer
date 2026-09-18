'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AdminSeasonToggle } from '@/components/admin/AdminSeasonToggle'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

function Ring({ pct }: { pct: number }) {
  const r = 26, circ = 2 * Math.PI * r, dash = (pct / 100) * circ
  return (
    <svg width={64} height={64} className="shrink-0 -rotate-90">
      <circle cx={32} cy={32} r={r} fill="none" stroke="currentColor" strokeWidth={5} className="text-slate-200" />
      <circle cx={32} cy={32} r={r} fill="none" stroke="currentColor" strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        className={pct >= 80 ? 'text-green-500' : pct >= 40 ? 'text-blue-500' : 'text-slate-400'} />
      <text x={32} y={32} textAnchor="middle" dominantBaseline="central" fill="currentColor"
        className="text-slate-800"
        style={{ fontSize: 13, fontWeight: 700, transform: 'rotate(90deg)', transformOrigin: '32px 32px' }}>
        {pct}%
      </text>
    </svg>
  )
}

const TOOL_LINKS = [
  { label: 'Alignment Import',      href: '/admin/alignment-import' },
  { label: 'Groups & Alignment',    href: '/admin/groups' },
  { label: 'School Profiles',       href: '/admin/schools' },
  { label: 'Seasons & Roster',      href: '/admin/seasons' },
  { label: 'Bulk Schedule',         href: '/admin/schedule/bulk-import' },
  { label: 'Tournament Rollover',   href: '/admin/tournaments/rollover' },
  { label: 'Rankings Hub (Boys)',   href: '/admin/rankings-hub' },
  { label: 'Rankings Hub (Girls)',  href: '/admin/rankings-hub-girls' },
]

type AutoCheck = {
  key: string
  label: string
  done: boolean
  autoOk: boolean
  overridden: boolean
  overrideId: number | null
  detail: string
}

type Season = { id: number; year_label: string | null }

type GenderState = {
  stage: string
  is_public_default: boolean
  finalized_at: string | null
} | null

type SeasonWithState = Season & { genderState: { M: GenderState; F: GenderState } }

type ChecklistRow = {
  id: number
  season_id: number
  step_key: string
  status: string
  completed_at: string | null
}

const STEP_CONFIG: Record<string, { label: string; href: string }> = {
  alignment:           { label: 'Import district & region alignment CSV',            href: '/admin/alignment-import' },
  school_review:       { label: 'Review schools, districts, regions & merges',       href: '/admin/school-review' },
  coaches:             { label: 'Add / verify head coaches per school',              href: '/admin/schools' },
  roster_rollover:     { label: 'Advance wrestler grades',                           href: '/admin/seasons' },
  schedule_import:     { label: 'Import bulk schedule',                              href: '/admin/schedule/bulk-import' },
  school_list:         { label: 'Verify active school list',                         href: '/admin/schools' },
  tournament_rollover: { label: 'Roll over tournament list',                         href: '/admin/tournaments/rollover' },
  rankings_setup:      { label: 'Configure individual rankings',                     href: '/admin/rankings-hub' },
}

const STATUS_STYLES = {
  complete:    'bg-green-100 text-green-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  not_started: 'bg-slate-100 text-slate-500',
}
const STATUS_LABELS = {
  complete:    'Complete',
  in_progress: 'In Progress',
  not_started: 'Not Started',
}

type Props = {
  seasons: Season[]
  defaultSeasonId: number
}

export function PreseasonClient({ seasons: initialSeasons, defaultSeasonId }: Props) {
  const { gender } = useAdminGender()
  const [seasonId, setSeasonId] = useState(defaultSeasonId)
  const [fullSeasons, setFullSeasons] = useState<SeasonWithState[]>([])
  const [checklist, setChecklist] = useState<ChecklistRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [busy,      setBusy]      = useState<number | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [liveMsg,   setLiveMsg]   = useState<string | null>(null)
  const [autoChecks,   setAutoChecks]   = useState<AutoCheck[]>([])
  const [autoPct,      setAutoPct]      = useState(0)
  const [overriding,   setOverriding]   = useState<string | null>(null)

  // Fetch full seasons (with genderState) from the API
  useEffect(() => {
    fetch('/api/admin/seasons')
      .then(r => r.json())
      .then(d => { if (d.seasons) setFullSeasons(d.seasons) })
      .catch(() => {})
  }, [])

  const selectedSeason = fullSeasons.find(s => s.id === seasonId)
    ?? initialSeasons.find(s => s.id === seasonId)
  const gs = (selectedSeason as SeasonWithState | undefined)?.genderState?.[gender] ?? null
  const isArchived = gs?.stage === 'archived'
  const isLive     = gs?.is_public_default ?? false

  const loadChecklist = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/admin/preseason-checklist?seasonId=${seasonId}`)
      .then(r => r.json())
      .then(d => { setChecklist(d.checklist ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [seasonId])

  useEffect(() => { loadChecklist() }, [loadChecklist])

  const loadAutoChecks = useCallback(() => {
    fetch(`/api/admin/home-summary?seasonId=${seasonId}&gender=${gender}`)
      .then(r => r.json())
      .then(d => {
        if (d.preseason) {
          setAutoChecks(d.preseason.checks ?? [])
          setAutoPct(d.preseason.pct ?? 0)
        }
      })
      .catch(() => {})
  }, [seasonId, gender])

  useEffect(() => { loadAutoChecks() }, [loadAutoChecks])

  async function toggleOverride(check: AutoCheck) {
    setOverriding(check.key)
    const newStatus = check.done ? 'not_started' : 'complete'
    try {
      await fetch('/api/admin/preseason-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, step_key: check.key, status: newStatus }),
      })
      loadAutoChecks()
    } catch {}
    setOverriding(null)
  }

  const complete = checklist.filter(r => r.status === 'complete').length
  const pct = checklist.length > 0 ? Math.round((complete / checklist.length) * 100) : 0

  const genderLabel = gender === 'M' ? 'Boys' : 'Girls'

  async function updateStatus(row: ChecklistRow, status: string) {
    setBusy(row.id)
    setError(null)
    try {
      const r = await fetch('/api/admin/preseason-checklist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, status }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      loadChecklist()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(null)
    }
  }

  async function setLive() {
    const yearLabel = selectedSeason?.year_label ?? `Season ${seasonId}`
    if (!confirm(`Set "${yearLabel}" as the live ${genderLabel} season? This changes what visitors see on the site.`)) return
    setError(null)
    try {
      const r = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-live', seasonId, gender }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setLiveMsg(`"${yearLabel}" is now live for ${genderLabel}.`)
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Preseason — {genderLabel}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{selectedSeason?.year_label ?? ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {isLive && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">Live</span>}
          {isArchived && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Archived</span>}
          <AdminSeasonToggle value={seasonId} onChange={setSeasonId} gender={gender} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}
      {liveMsg && <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2">{liveMsg}</p>}

      {/* Progress card */}
      <div className="border border-slate-200 bg-white">
        <div className="px-5 py-4 flex items-start gap-4 border-b border-slate-100">
          <Ring pct={autoPct} />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">Setup Progress</p>
            <p className="text-xs text-slate-500 mt-0.5">Auto-checks based on data in the system</p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          {autoChecks.map(c => (
            <div key={c.key} className="flex items-center gap-2 text-xs">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${c.done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                {c.done ? '✓' : '·'}
              </span>
              <span className="flex-1 text-slate-600">{c.label}</span>
              <span className="text-slate-500">{c.detail}</span>
              {!c.autoOk && (
                <button
                  onClick={() => toggleOverride(c)}
                  disabled={overriding === c.key}
                  className={`shrink-0 px-2 py-0.5 border text-[11px] font-medium transition-colors disabled:opacity-40 ${
                    c.overridden
                      ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {overriding === c.key ? '…' : c.overridden ? 'Undo override' : 'Mark complete'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading checklist…</p>
      ) : checklist.length === 0 ? (
        <p className="text-sm text-slate-500">No checklist found for this season.</p>
      ) : (
        <ul className="space-y-2">
          {checklist.map(row => {
            const cfg = STEP_CONFIG[row.step_key]
            const style = STATUS_STYLES[row.status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.not_started
            const isBusy = busy === row.id
            return (
              <li key={row.id} className="border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${style}`}>
                  {STATUS_LABELS[row.status as keyof typeof STATUS_LABELS] ?? row.status}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{cfg?.label ?? row.step_key}</p>
                  {cfg?.href && (
                    <Link href={cfg.href} className="text-xs text-blue-600 hover:underline">Open tool →</Link>
                  )}
                </div>
                {!isArchived && (
                  <select
                    value={row.status}
                    disabled={isBusy}
                    onChange={e => updateStatus(row, e.target.value)}
                    className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 shrink-0"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="complete">Complete</option>
                  </select>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!isLive && !isArchived && (
        <div className="border-t border-slate-200 pt-6">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-5 py-4">
            <h3 className="text-sm font-semibold text-indigo-900 mb-1">
              Set as Live {genderLabel} Season
            </h3>
            <p className="text-xs text-indigo-700 mb-3">
              This changes what the public site shows for {genderLabel} wrestling. Only do this when ready.
              It does not affect the {gender === 'M' ? 'Girls' : 'Boys'} program.
            </p>
            <button
              onClick={setLive}
              className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded"
            >
              Set {selectedSeason?.year_label ?? 'this season'} as Live ({genderLabel})
            </button>
          </div>
        </div>
      )}

      {/* Tool links */}
      <div className="border-t border-slate-200 pt-6">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Tools</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TOOL_LINKS.map(l => (
            <Link key={l.href} href={l.href}
              className="border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors text-center font-medium">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
