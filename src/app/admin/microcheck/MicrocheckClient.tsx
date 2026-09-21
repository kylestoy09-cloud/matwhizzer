'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSeasons } from '@/components/SeasonsProvider'

type SchoolProfileTask = {
  task_type:   'school_profile'
  school_id:   number
  school_name: string
  gender:      'M' | 'F'
  field:       string
  label:       string
  input_type:  'text' | 'url' | 'email' | 'roster'
  placeholder: string
}

type TieResolutionTask = {
  task_type:       'tie_resolution'
  task_id:         string
  entity_id:       string
  gender:          'M' | 'F'
  team1_school_id: number
  team2_school_id: number
  team1_name:      string
  team2_name:      string
  score:           number
  meet_date:       string
  season_id:       number
  dual_table:      string
}

type TaskInfo = SchoolProfileTask | TieResolutionTask

type ScoreEntry = { admin_id: string; name: string; completed: number }

const FIELD_LABELS: Record<string, string> = {
  address:        'Address',
  website_url:    'Website',
  twitter_handle: 'Twitter / X',
  facebook_url:   'Facebook',
  coach_name:     'Coach Name',
  coach_email:    'Coach Email',
  ad_name:        'AD Name',
  ad_email:       'AD Email',
  roster_match:   'Roster Match',
}

export function MicrocheckClient() {
  const { label: seasonLabelOf } = useSeasons()
  const [task,           setTask]           = useState<TaskInfo | null | 'idle' | 'loading' | 'done'>('idle')
  const [value,          setValue]          = useState('')
  const [submitting,     setSubmitting]     = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [scoreboard,     setScoreboard]     = useState<ScoreEntry[]>([])
  const [showScore,      setShowScore]      = useState(false)
  const [scoreLoading,   setScoreLoading]   = useState(false)

  const fetchNext = useCallback(async () => {
    setTask('loading')
    setError(null)
    setValue('')
    try {
      const res  = await fetch('/api/admin/microcheck/next?gender=M')
      const data = await res.json()
      if (data.error) { setError(data.error); setTask(null); return }
      setTask(data.task ?? 'done')
    } catch {
      setError('Network error — try again')
      setTask(null)
    }
  }, [])

  async function submitTie(winner: 'team1' | 'team2') {
    if (typeof task !== 'object' || task === null || task.task_type !== 'tie_resolution') return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/microcheck/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type:  'tie_resolution',
          task_id:    task.task_id,
          entity_id:  task.entity_id,
          gender:     task.gender,
          winner,
          dual_table: task.dual_table,
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setSubmitting(false); return }
      setValue('')
      setTask(data.task ?? 'done')
    } catch {
      setError('Network error — try again')
    } finally {
      setSubmitting(false)
    }
  }

  async function submit(status: 'completed' | 'cant_find') {
    if (typeof task !== 'object' || task === null || task.task_type !== 'school_profile') return
    setSubmitting(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/microcheck/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          task_type: 'school_profile',
          school_id: task.school_id,
          gender:    task.gender,
          field:     task.field,
          status,
          value:     status === 'completed' ? value.trim() || null : null,
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setSubmitting(false); return }
      setValue('')
      setTask(data.task ?? 'done')
    } catch {
      setError('Network error — try again')
    } finally {
      setSubmitting(false)
    }
  }

  async function loadScoreboard() {
    if (scoreLoading) return
    setScoreLoading(true)
    try {
      const res  = await fetch('/api/admin/microcheck/scoreboard')
      const data = await res.json()
      if (!data.error) setScoreboard(data.scoreboard ?? [])
    } finally {
      setScoreLoading(false)
    }
  }

  function toggleScore() {
    if (!showScore) loadScoreboard()
    setShowScore(p => !p)
  }

  // ── Hub / entry screen ────────────────────────────────────────────────────

  if (task === 'idle') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Microcheck</h1>
        <p className="text-slate-500 mb-10">Chip away at open tasks one at a time.</p>
        <button
          onClick={fetchNext}
          className="px-8 py-4 rounded-xl bg-slate-900 text-white text-base font-semibold active:scale-95 transition-transform mb-6"
        >
          Check me in
        </button>
        <a
          href="/admin/microcheck/priorities"
          className="text-xs text-slate-400 hover:text-slate-600 font-medium"
        >
          ⚙ Task order
        </a>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (task === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm animate-pulse">Finding your next task…</div>
      </div>
    )
  }

  // ── All done ───────────────────────────────────────────────────────────────

  if (task === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">All caught up</h1>
        <p className="text-slate-500 mb-8">No more open tasks right now.</p>
        <button
          onClick={fetchNext}
          className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium"
        >
          Check again
        </button>
        {error && <p className="mt-4 text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  // ── Error / null ───────────────────────────────────────────────────────────

  if (task === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <p className="text-red-600 text-sm mb-4">{error ?? 'Something went wrong'}</p>
        <button onClick={fetchNext} className="px-4 py-2 rounded-lg bg-slate-200 text-sm">Retry</button>
      </div>
    )
  }

  // ── Tie resolution card ────────────────────────────────────────────────────

  if (task.task_type === 'tie_resolution') {
    const gLabel  = task.gender === 'F' ? 'Girls' : 'Boys'
    const dateStr = new Date(task.meet_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${task.team1_name} ${gLabel} wrestling schedule results`)}`

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-lg mx-auto px-5 py-10">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            {gLabel} · Tie Resolution
          </div>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-1">
            {task.team1_name} vs {task.team2_name}
          </h1>
          <p className="text-slate-500 mb-2">{seasonLabelOf(task.season_id) ?? `Season ${task.season_id}`} · {dateStr}</p>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline mb-8 inline-block"
          >
            Search {task.team1_name} schedule →
          </a>

          <div className="flex items-center justify-center gap-4 mb-8 mt-4">
            <span className="text-5xl font-bold text-slate-800 tabular-nums">{task.score}</span>
            <span className="text-2xl text-slate-400">–</span>
            <span className="text-5xl font-bold text-slate-800 tabular-nums">{task.score}</span>
          </div>

          <div className="space-y-3">
            <button
              disabled={submitting}
              onClick={() => submitTie('team1')}
              className="w-full py-4 rounded-xl bg-slate-900 text-white text-base font-semibold disabled:opacity-40 active:scale-95 transition-transform"
            >
              {submitting ? '…' : `${task.team1_name} won`}
            </button>
            <button
              disabled={submitting}
              onClick={() => submitTie('team2')}
              className="w-full py-4 rounded-xl bg-slate-900 text-white text-base font-semibold disabled:opacity-40 active:scale-95 transition-transform"
            >
              {submitting ? '…' : `${task.team2_name} won`}
            </button>
            <button
              disabled={submitting}
              onClick={fetchNext}
              className="w-full py-4 rounded-xl bg-slate-100 text-slate-600 text-base font-medium disabled:opacity-40 active:scale-95 transition-transform"
            >
              Skip for now
            </button>
          </div>

          {error && <p className="mt-4 text-xs text-center text-red-600">{error}</p>}
        </div>
      </div>
    )
  }

  // ── School profile task card ───────────────────────────────────────────────

  const isRoster  = task.input_type === 'roster'
  const canSubmit = isRoster || value.trim().length > 0
  const fieldTag  = FIELD_LABELS[task.field] ?? task.field

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-5 py-10">

        {/* Tag line */}
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Boys · {fieldTag}
        </div>

        {/* School name */}
        <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-1">
          {task.task_type === 'school_profile' ? task.school_name : ''}
        </h1>
        <p className="text-slate-500 mb-8">Find their {task.task_type === 'school_profile' ? task.label : ''}</p>

        {/* Input or roster prompt */}
        {!isRoster ? (
          <input
            key={task.school_id + task.field}
            type={task.input_type === 'email' ? 'email' : 'text'}
            inputMode={task.input_type === 'url' ? 'url' : task.input_type === 'email' ? 'email' : 'text'}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && canSubmit && !submitting) submit('completed') }}
            placeholder={task.placeholder}
            autoFocus
            className="w-full text-base border border-slate-300 rounded-xl px-4 py-4 mb-6 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-300"
          />
        ) : (
          <div className="mb-6 p-5 bg-white border border-slate-200 rounded-xl">
            <p className="text-sm text-slate-600 mb-4">
              Match wrestlers in the Roster Importer, then come back and tap Done.
            </p>
            <a
              href="/admin/roster-grade-import"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              Open Roster Importer
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            disabled={submitting || !canSubmit}
            onClick={() => submit('completed')}
            className="w-full py-4 rounded-xl bg-slate-900 text-white text-base font-semibold disabled:opacity-40 active:scale-95 transition-transform"
          >
            {submitting ? '…' : isRoster ? 'Done — Matched' : 'Done'}
          </button>
          <button
            disabled={submitting}
            onClick={() => submit('cant_find')}
            className="w-full py-4 rounded-xl bg-slate-100 text-slate-600 text-base font-medium disabled:opacity-40 active:scale-95 transition-transform"
          >
            Can't Find
          </button>
        </div>

        {error && <p className="mt-4 text-xs text-center text-red-600">{error}</p>}

        {/* Scoreboard toggle */}
        <div className="mt-12">
          <button
            onClick={toggleScore}
            className="w-full text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center justify-center gap-1"
          >
            {showScore ? '▲ Hide' : '▼ Scoreboard'}
          </button>

          {showScore && (
            <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
              {scoreLoading && (
                <p className="text-xs text-slate-400 text-center py-4">Loading…</p>
              )}
              {!scoreLoading && scoreboard.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No completions yet</p>
              )}
              {!scoreLoading && scoreboard.map((entry, i) => (
                <div
                  key={entry.admin_id}
                  className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 w-5 text-right">{i + 1}</span>
                    <span className="text-sm font-medium text-slate-800">{entry.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{entry.completed}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
