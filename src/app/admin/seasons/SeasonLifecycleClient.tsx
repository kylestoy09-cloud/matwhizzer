'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

type GenderState = {
  stage: string
  is_public_default: boolean
  finalized_at: string | null
} | null

type Season = {
  id: number
  year_label: string | null
  created_at: string | null
  genderState: { M: GenderState; F: GenderState }
}

const STAGES = ['preseason', 'season', 'postseason', 'archived'] as const
type Stage = typeof STAGES[number]

const STAGE_LABELS: Record<Stage, string> = {
  preseason:  'Pre-Season',
  season:     'Season',
  postseason: 'Post-Season',
  archived:   'Archived',
}

const STAGE_COLORS: Record<Stage, string> = {
  preseason:  'bg-yellow-100 text-yellow-800',
  season:     'bg-green-100 text-green-800',
  postseason: 'bg-blue-100 text-blue-800',
  archived:   'bg-slate-100 text-slate-500',
}

type BusyKey = `${number}_${'M' | 'F'}`

export function SeasonLifecycleClient() {
  const { gender } = useAdminGender()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState<BusyKey | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/seasons')
      .then(r => r.json())
      .then(d => { setSeasons(d.seasons ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])

  async function post(body: object) {
    const r = await fetch('/api/admin/seasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Request failed')
    return d
  }

  async function setLive(seasonId: number, gender: 'M' | 'F', label: string) {
    const prog = gender === 'M' ? 'Boys' : 'Girls'
    if (!confirm(`Set "${label}" as the live ${prog} season?`)) return
    const key: BusyKey = `${seasonId}_${gender}`
    setBusy(key); setError(null)
    try { await post({ action: 'set-live', seasonId, gender }); reload() }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setBusy(null) }
  }

  async function setStage(seasonId: number, gender: 'M' | 'F', stage: Stage) {
    if (stage === 'archived' && !confirm('Archive this season for this program? This sets finalized_at to now.')) return
    const key: BusyKey = `${seasonId}_${gender}`
    setBusy(key); setError(null)
    try { await post({ action: 'set-stage', seasonId, stage, gender }); reload() }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setBusy(null) }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading seasons…</p>

  if (seasons.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No seasons found. Run the <code>20260825_season_gender_state.sql</code> migration first.
      </p>
    )
  }

  function GenderRow({ season, gender }: { season: Season; gender: 'M' | 'F' }) {
    const gs = season.genderState[gender]
    const stage = (gs?.stage ?? 'preseason') as Stage
    const key: BusyKey = `${season.id}_${gender}`
    const isBusy = busy === key
    const label = season.year_label ?? `Season ${season.id}`

    return (
      <div className="flex items-center gap-2 flex-wrap py-2">
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
          gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
        }`}>
          {gender === 'M' ? 'Boys' : 'Girls'}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[stage]}`}>
          {STAGE_LABELS[stage]}
        </span>
        {gs?.is_public_default && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
            Live
          </span>
        )}
        {gs?.finalized_at && (
          <span className="text-xs text-slate-400">
            Archived {new Date(gs.finalized_at).toLocaleDateString()}
          </span>
        )}
        {gs ? (
          <div className="flex items-center gap-1.5 ml-auto">
            <select
              value={stage}
              disabled={isBusy}
              onChange={e => setStage(season.id, gender, e.target.value as Stage)}
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {STAGES.map(st => (
                <option key={st} value={st}>{STAGE_LABELS[st]}</option>
              ))}
            </select>
            {!gs.is_public_default && (
              <button
                onClick={() => setLive(season.id, gender, label)}
                disabled={isBusy}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-3 py-1 rounded"
              >
                {isBusy ? 'Saving…' : 'Set Live'}
              </button>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 ml-auto">No state row</span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}
      {seasons.map(s => (
        <div key={s.id} className="border border-slate-200 rounded-lg p-4">
          <p className="font-semibold text-slate-900 mb-2">
            {s.year_label ?? `Season ${s.id}`}
          </p>
          <div className="divide-y divide-slate-100">
            <GenderRow season={s} gender={gender} />
          </div>
        </div>
      ))}
    </div>
  )
}
