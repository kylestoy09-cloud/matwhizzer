'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AdminSeasonToggle } from '@/components/admin/AdminSeasonToggle'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import type { TeamStats, IndividualStats } from './PostseasonHeader'

type AllStats = TeamStats & IndividualStats

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
  { label: 'Playoff Seeds',  href: '/admin/playoff-seeds' },
  { label: 'Import Hub',     href: '/admin/import-hub' },
  { label: 'Region Seeds',   href: '/admin/region-seeds' },
  { label: 'Bracket Editor', href: '/admin/bracket' },
  { label: 'Team Scores',    href: '/admin/team-scores' },
  { label: 'PP Audit',       href: '/admin/pp-audit' },
]

type ChecklistRow = {
  id: number
  season_id: number
  side: string
  step_key: string
  status: string
  completed_at: string | null
}

type Season = { id: number; year_label: string | null }

type GenderState = { stage: string; is_public_default: boolean; finalized_at: string | null } | null
type SeasonWithState = Season & { genderState: { M: GenderState; F: GenderState } }

const TEAM_STEP_CONFIG: Record<string, { label: string; href: string }> = {
  seeds_set:        { label: 'Set playoff seeds',     href: '/admin/playoff-seeds' },
  results_imported: { label: 'Import team results',   href: '/admin/import-hub' },
  finalized:        { label: 'Finalize team bracket', href: '/admin/bracket' },
}

const INDIVIDUAL_STEP_CONFIG: Record<string, { label: string; href: string }> = {
  district_seeds_forecasted: { label: 'Forecast district seeds', href: '/admin/rankings/individual' },
  district_seeds_set:        { label: 'Set district seeds',      href: '/admin/region-seeds' },
  results_imported:          { label: 'Import individual results', href: '/admin/bracket' },
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

function pct(rows: ChecklistRow[]) {
  if (!rows.length) return 0
  return Math.round((rows.filter(r => r.status === 'complete').length / rows.length) * 100)
}

function ChecklistSection({
  title, rows, stepConfig, isArchived, onUpdate, busy,
}: {
  title: string
  rows: ChecklistRow[]
  stepConfig: Record<string, { label: string; href: string }>
  isArchived: boolean
  onUpdate: (row: ChecklistRow, status: string) => void
  busy: number | null
}) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        <span className="text-sm font-bold text-slate-600">{pct(rows)}%</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 px-4 py-3">No checklist items.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map(row => {
            const cfg = stepConfig[row.step_key]
            const style = STATUS_STYLES[row.status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.not_started
            const isBusy = busy === row.id
            return (
              <li key={row.id} className="px-4 py-3 flex items-center gap-3">
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
                    onChange={e => onUpdate(row, e.target.value)}
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
    </div>
  )
}

function allAt100(s: AllStats) {
  return (
    s.bracketsPct        === 100 &&
    s.firstRoundPct      === 100 &&
    s.playoffMatchesPct  === 100 &&
    s.districtSeedsPct   === 100 &&
    s.districtMatchesPct === 100 &&
    s.regionSeedsPct     === 100 &&
    s.regionMatchesPct   === 100 &&
    s.stateSeedsPct      === 100 &&
    s.stateMatchesPct    === 100
  )
}

export function PostseasonClient({ statsM, statsF }: { statsM?: AllStats; statsF?: AllStats }) {
  const { gender } = useAdminGender()
  const [seasonId, setSeasonId]   = useState<number | null>(null)
  const [fullSeasons, setFull]    = useState<SeasonWithState[]>([])
  const [team,    setTeam]        = useState<ChecklistRow[]>([])
  const [indiv,   setIndiv]       = useState<ChecklistRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [busy,    setBusy]        = useState<number | null>(null)
  const [error,   setError]       = useState<string | null>(null)
  const [finalizing, setFinalizing] = useState(false)

  useEffect(() => {
    fetch('/api/admin/seasons').then(r => r.json())
      .then(d => {
        if (d.seasons) {
          setFull(d.seasons)
          // Auto-select the live (public default) season for this gender
          const live = (d.seasons as SeasonWithState[]).find(s => s.genderState?.[gender]?.is_public_default)
          if (live) setSeasonId(live.id)
        }
      })
      .catch(() => {})
  }, [gender])

  const selectedSeason = fullSeasons.find(s => s.id === seasonId) ?? null
  const gs = (selectedSeason as SeasonWithState | undefined)?.genderState?.[gender] ?? null
  const isArchived = gs?.stage === 'archived'

  const genderLabel = gender === 'M' ? 'Boys' : 'Girls'

  const loadChecklist = useCallback(() => {
    if (seasonId === null) return
    setLoading(true); setError(null)
    fetch(`/api/admin/postseason-checklist?seasonId=${seasonId}`)
      .then(r => r.json())
      .then(d => { setTeam(d.team ?? []); setIndiv(d.individual ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [seasonId])

  useEffect(() => { loadChecklist() }, [loadChecklist])

  async function updateStatus(row: ChecklistRow, status: string) {
    setBusy(row.id); setError(null)
    try {
      const r = await fetch('/api/admin/postseason-checklist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, status }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      loadChecklist()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setBusy(null) }
  }

  async function finalizeSeason() {
    if (seasonId === null) return
    const yearLabel = selectedSeason?.year_label ?? `Season ${seasonId}`
    if (!confirm(
      `This will archive the ${genderLabel} ${yearLabel} season and create next season's ${genderLabel} preseason dashboard.\n\nThe ${gender === 'M' ? 'Girls' : 'Boys'} program is not affected.\n\nThis cannot be undone.`
    )) return

    setFinalizing(true); setError(null)
    try {
      const r = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize-season', seasonId, gender }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      window.location.href = '/admin/preseason'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setFinalizing(false)
    }
  }

  const allRows = [...team, ...indiv]
  const postComplete = allRows.filter(r => r.status === 'complete').length
  const postPct = allRows.length > 0 ? Math.round((postComplete / allRows.length) * 100) : 0

  const currentStats = gender === 'M' ? statsM : statsF
  const checklistAllDone = allRows.length > 0 && postComplete === allRows.length
  const statsAllDone = currentStats ? allAt100(currentStats) : false
  const canFinalize = checklistAllDone && statsAllDone

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Postseason — {genderLabel}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{selectedSeason?.year_label ?? ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {isArchived && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Archived</span>}
          {seasonId !== null && <AdminSeasonToggle value={seasonId} onChange={setSeasonId} gender={gender} />}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}

      {/* Progress card */}
      <div className="border border-slate-200 bg-white">
        <div className="px-5 py-4 flex items-start gap-4 border-b border-slate-100">
          <Ring pct={postPct} />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">Postseason Progress</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {allRows.length > 0
                ? `${postComplete} of ${allRows.length} checklist steps complete`
                : 'Checklist not yet initialized — finalize the season to create it'}
            </p>
          </div>
        </div>
        {allRows.length > 0 && (
          <div className="px-5 py-3">
            <div className="w-full bg-slate-100 h-2 rounded-full">
              <div className={`h-2 rounded-full transition-all ${postPct >= 80 ? 'bg-green-500' : 'bg-blue-400'}`} style={{ width: `${postPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading checklists…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChecklistSection
            title="Team"
            rows={team}
            stepConfig={TEAM_STEP_CONFIG}
            isArchived={isArchived}
            onUpdate={(row, status) => updateStatus(row, status)}
            busy={busy}
          />
          <ChecklistSection
            title="Individual"
            rows={indiv}
            stepConfig={INDIVIDUAL_STEP_CONFIG}
            isArchived={isArchived}
            onUpdate={(row, status) => updateStatus(row, status)}
            busy={busy}
          />
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

      {!isArchived && (
        <div className="border-t border-slate-200 pt-8 mt-4">
          {canFinalize ? (
            <div className="border-2 border-orange-200 bg-orange-50 rounded-lg px-5 py-5">
              <h3 className="text-sm font-bold text-orange-900 mb-1">Finalize {genderLabel} Season</h3>
              <p className="text-sm text-orange-800 mb-1">This is a one-way action. It will:</p>
              <ul className="text-sm text-orange-700 list-disc list-inside space-y-0.5 mb-4">
                <li>Archive <strong>{genderLabel} {selectedSeason?.year_label ?? `Season ${seasonId}`}</strong></li>
                <li>Create the {genderLabel} preseason checklist for next season</li>
                <li>Not affect the {gender === 'M' ? 'Girls' : 'Boys'} program at all</li>
                <li><strong>Not</strong> change the live public season — use &ldquo;Set as Live&rdquo; on the Preseason dashboard when ready</li>
              </ul>
              <button
                onClick={finalizeSeason}
                disabled={finalizing}
                className="text-sm bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded"
              >
                {finalizing ? 'Finalizing…' : `Finalize ${genderLabel} Season`}
              </button>
              {error && (
                <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 bg-slate-50 rounded-lg px-5 py-4 flex items-start gap-3">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-400 shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-slate-700">Finalize {genderLabel} Season</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {!statsAllDone && !checklistAllDone
                    ? 'All header stats must reach 100% and all checklist steps must be complete before you can finalize.'
                    : !statsAllDone
                    ? 'All header stat bars must reach 100% before you can finalize.'
                    : 'All checklist steps must be marked complete before you can finalize.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
