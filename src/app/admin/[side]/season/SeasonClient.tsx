'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AdminSeasonToggle } from '@/components/admin/AdminSeasonToggle'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { RATING_NAME } from '@/lib/rating'

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
  { label: 'Tournament Hub',      href: '/admin/tournament-hub' },
  { label: 'Bout Audit',          href: '/admin/bout-audit' },
  { label: 'Dual Audit',          href: '/admin/dual-audit' },
  { label: 'PP Audit',            href: '/admin/pp-audit' },
  { label: 'Team Scores',         href: '/admin/team-scores' },
  { label: RATING_NAME,       href: '/admin/hammer-scores' },
]

type Progress = {
  seasonId: number
  yearLabel: string
  duals: { total: number; withResults: number; pct: number }
  tournaments: { total: number; withResults: number; pct: number }
}

type GenderState = { stage: string; is_public_default: boolean; finalized_at: string | null } | null
type Season = { id: number; year_label: string | null; genderState: { M: GenderState; F: GenderState } }


export function SeasonClient() {
  const { gender } = useAdminGender()
  const [seasons, setSeasons]       = useState<Season[]>([])
  const [viewSeasonId, setView]     = useState<number | null>(null)
  const [liveSeasonId, setLiveId]   = useState<number | null>(null)
  const [liveYearLabel, setLiveLabel] = useState<string>('')
  const [progress, setProgress]     = useState<Progress | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const genderLabel = gender === 'M' ? 'Boys' : 'Girls'

  // Fetch seasons, find the live one for the selected gender
  useEffect(() => {
    fetch('/api/admin/seasons')
      .then(r => r.json())
      .then(d => {
        const list: Season[] = d.seasons ?? []
        setSeasons(list)
        const live = list.find(s => s.genderState[gender]?.is_public_default)
        const fallback = list[0]
        const picked = live ?? fallback
        setLiveId(picked?.id ?? null)
        setLiveLabel(picked?.year_label ?? `Season ${picked?.id ?? ''}`)
        setView(v => v ?? picked?.id ?? null)
      })
      .catch(() => {})
  }, [gender])

  const loadProgress = useCallback(() => {
    if (!viewSeasonId) return
    setLoading(true)
    setError(null)
    fetch(`/api/admin/season-progress?seasonId=${viewSeasonId}&gender=${gender}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setProgress(d)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [viewSeasonId, gender])

  useEffect(() => { loadProgress() }, [loadProgress])

  // Reset view when gender changes so we re-pick the right live season
  useEffect(() => { setView(null) }, [gender])

  const isViewingLive = viewSeasonId === liveSeasonId

  const combinedPct = progress
    ? Math.round((progress.duals.pct + progress.tournaments.pct) / 2)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Season — {genderLabel}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{progress?.yearLabel ?? liveYearLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {liveSeasonId && !isViewingLive && (
            <span className="text-xs text-indigo-500">Not the live season</span>
          )}
          {viewSeasonId !== null && (
            <AdminSeasonToggle value={viewSeasonId} onChange={setView} gender={gender} />
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}

      {/* Progress card */}
      <div className="border border-slate-200 bg-white">
        <div className="px-5 py-4 flex items-start gap-4 border-b border-slate-100">
          <Ring pct={combinedPct} />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">Import Progress</p>
            <p className="text-xs text-slate-500 mt-0.5">Data imported vs. scheduled for this season</p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : progress ? (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Dual Meets</span>
                  <span className="font-medium text-slate-800">{progress.duals.withResults} / {progress.duals.total} <span className="text-slate-400">({progress.duals.pct}%)</span></span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full">
                  <div className="bg-blue-400 h-2 rounded-full transition-all" style={{ width: `${progress.duals.pct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600">Tournaments</span>
                  <span className="font-medium text-slate-800">{progress.tournaments.withResults} / {progress.tournaments.total} <span className="text-slate-400">({progress.tournaments.pct}%)</span></span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full">
                  <div className="bg-blue-400 h-2 rounded-full transition-all" style={{ width: `${progress.tournaments.pct}%` }} />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">No data found for this season.</p>
          )}
        </div>
      </div>

      {/* Tool links */}
      <div className="border-t border-slate-200 pt-6">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Tools</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
