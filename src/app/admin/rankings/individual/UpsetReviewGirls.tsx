'use client'

const GENDER = 'F' as const

import { useState, useEffect, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

type UpsetRow = {
  id: number
  winner_id: string
  winner_name: string
  winner_school: string
  winner_grade: string | null
  winner_district: number | null
  winner_district_name: string | null
  winner_region: number | null
  winner_section: string | null
  winner_multi_win: boolean   // beat multiple higher-ranked opponents this week
  winner_multi_loss: boolean  // also suffered an upset themselves this week
  loser_id: string
  loser_name: string
  loser_school: string
  loser_grade: string | null
  loser_district: number | null
  loser_district_name: string | null
  loser_region: number | null
  loser_section: string | null
  loser_multi_loss: boolean   // suffered multiple upsets this week
  loser_multi_win: boolean    // also pulled an upset themselves this week
  winner_pre_hammer: number
  loser_pre_hammer: number
  differential: number
  win_type: string | null
  match_date: string
  match_source: string
  include_in_publish: boolean
  same_district: boolean
  same_region: boolean
  same_section: boolean
}

type Props = {
  weight:     number
  weekId:     number | null
  weekNumber: number
  season:     string
  onSaved?:   () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const WIN_TYPE_LABEL: Record<string, string> = {
  Fall: 'Fall', FALL: 'Fall',
  MD: 'MD', TF: 'TF', 'TF-1.5': 'TF', 'TF-2': 'TF',
  Dec: 'Dec', DEC: 'Dec',
  'SV-1': 'SV', UTB: 'UTB',
}

const WIN_TYPE_COLOR: Record<string, string> = {
  Fall: 'bg-red-100 text-red-700',
  MD:   'bg-orange-100 text-orange-700',
  TF:   'bg-amber-100 text-amber-700',
  Dec:  'bg-slate-100 text-slate-600',
  SV:   'bg-slate-100 text-slate-500',
  UTB:  'bg-slate-100 text-slate-500',
}

function winLabel(raw: string | null) {
  if (!raw) return null
  return WIN_TYPE_LABEL[raw] ?? raw
}
function winColor(raw: string | null) {
  const label = winLabel(raw)
  return label ? (WIN_TYPE_COLOR[label] ?? 'bg-slate-100 text-slate-600') : ''
}

function diffColor(diff: number) {
  if (diff >= 25) return 'bg-red-600 text-white'
  if (diff >= 15) return 'bg-orange-500 text-white'
  if (diff >= 8)  return 'bg-amber-500 text-white'
  return 'bg-slate-200 text-slate-700'
}

function fmtDate(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function WrestlerCell({
  name, school, grade, districtName, multiWin, multiLoss,
}: {
  name: string; school: string; grade: string | null
  districtName: string | null; multiWin: boolean; multiLoss: boolean
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">{name}</span>
        {grade && <span className="text-xs text-slate-400">{grade}</span>}
        {multiWin  && <span title="Multiple upset wins this week"  className="text-yellow-500 text-xs leading-none">⚡</span>}
        {multiLoss && <span title="Multiple upsets suffered this week" className="text-amber-500 text-xs leading-none">⚠</span>}
      </div>
      <div className="text-xs text-slate-400 truncate">
        {school}{districtName ? ` · ${districtName}` : ''}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function UpsetReviewGirls({ weight, weekId, weekNumber, season, onSaved }: Props) {
  const [upsets,      setUpsets]      = useState<UpsetRow[]>([])
  const [selections,  setSelections]  = useState<Record<number, boolean>>({})
  const [isComplete,  setIsComplete]  = useState(false)
  const [completedBy, setCompletedBy] = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [computing,   setComputing]   = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [flash,       setFlash]       = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [editMode,    setEditMode]    = useState(false)
  const [filter,      setFilter]      = useState<'all' | 'included' | 'excluded'>('all')

  // ── Load stored upsets ────────────────────────────────────────────────────────

  const loadUpsets = useCallback(async () => {
    if (!weekId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/individual-upsets?week_id=${weekId}&gender=${GENDER}&weight_class=${weight}`)
      const d   = await res.json()
      const rows = (d.upsets ?? []) as UpsetRow[]
      setUpsets(rows)
      setIsComplete(!!d.is_complete)
      setCompletedBy(d.completed_by ?? null)
      // Seed selections from stored state
      const init: Record<number, boolean> = {}
      for (const u of rows) init[u.id] = u.include_in_publish
      setSelections(init)
    } finally {
      setLoading(false)
    }
  }, [weekId, GENDER, weight])

  useEffect(() => {
    setUpsets([])
    setSelections({})
    setIsComplete(false)
    setFlash(null)
    setEditMode(false)
    setFilter('all')
    loadUpsets()
  }, [loadUpsets])

  // ── Compute (calls backend, then reloads) ────────────────────────────────────

  async function handleCompute() {
    if (!weekId) return
    setComputing(true)
    setFlash(null)
    try {
      const res = await fetch('/api/admin/individual-upsets/compute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ week_id: weekId, gender: GENDER, weight_class: weight }),
      })
      const d = await res.json()
      if (d.error) { setFlash({ kind: 'err', msg: d.error }); return }
      setFlash({ kind: 'ok', msg: d.message ?? `Found ${d.inserted} upset${d.inserted === 1 ? '' : 's'}` })
      await loadUpsets()
    } finally {
      setComputing(false)
    }
  }

  // ── Toggle individual selection ───────────────────────────────────────────────

  function toggle(id: number) {
    setSelections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function selectAll()   { setSelections(Object.fromEntries(upsets.map(u => [u.id, true]))) }
  function selectNone()  { setSelections(Object.fromEntries(upsets.map(u => [u.id, false]))) }

  // ── Save ──────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!weekId) return
    setSaving(true)
    setFlash(null)
    try {
      const res = await fetch('/api/admin/individual-upsets/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ week_id: weekId, gender: GENDER, weight_class: weight, selections }),
      })
      const d = await res.json()
      if (d.error) { setFlash({ kind: 'err', msg: d.error }); return }
      setFlash({ kind: 'ok', msg: `Saved · ${d.included} upset${d.included === 1 ? '' : 's'} marked for publication` })
      setIsComplete(true)
      setEditMode(false)
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  async function handleUnlock() {
    if (!weekId) return
    await fetch('/api/admin/individual-upsets/save', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ week_id: weekId, gender: GENDER, weight_class: weight }),
    })
    setIsComplete(false)
    setEditMode(true)
    onSaved?.()
  }

  // ── Derived display ───────────────────────────────────────────────────────────

  const includedCount = upsets.filter(u => selections[u.id] ?? false).length

  const displayed = upsets.filter(u => {
    const sel = selections[u.id] ?? false
    if (filter === 'included') return sel
    if (filter === 'excluded') return !sel
    return true
  })

  const canEdit = !isComplete || editMode

  // ── No week seeded ────────────────────────────────────────────────────────────

  if (!weekId) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded p-4 text-sm text-amber-700">
        Run the Season 3 seed migration first — week records are required to store upsets.
      </div>
    )
  }

  if (weekNumber === 1) {
    return (
      <div className="border border-slate-200 bg-slate-50 rounded p-6 text-center space-y-1">
        <p className="text-sm font-medium text-slate-600">No upsets for Week 1</p>
        <p className="text-xs text-slate-400">Upset tracking starts Week 2 — there are no prior rankings to define what counts as an upset.</p>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">Loading {weight} lb upsets…</div>
    )
  }

  return (
    <div className="space-y-3">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-800">{weight} lb Upsets</span>
          {upsets.length > 0 && (
            <span className="text-xs text-slate-400">
              {upsets.length} found · {includedCount} included
            </span>
          )}
          {isComplete && !editMode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              ✓ Saved
              {completedBy && <span className="font-normal opacity-70">by {completedBy.split('@')[0]}</span>}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Compute / Refresh */}
          <button
            onClick={handleCompute}
            disabled={computing}
            className="px-3 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-50 disabled:opacity-50"
          >
            {computing ? 'Computing…' : upsets.length === 0 ? 'Compute Upsets' : '↻ Refresh'}
          </button>

          {/* Edit / Lock controls */}
          {isComplete && !editMode ? (
            <button onClick={() => setEditMode(true)} className="px-3 py-1 text-xs border border-slate-300 text-slate-600 rounded hover:bg-slate-50">
              Re-edit
            </button>
          ) : upsets.length > 0 ? (
            <>
              {isComplete && (
                <button onClick={() => setEditMode(false)} className="px-3 py-1 text-xs border border-slate-300 text-slate-400 rounded hover:bg-slate-50">
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : isComplete ? 'Update' : 'Save Upsets'}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* ── Flash ───────────────────────────────────────────────────────────── */}
      {flash && (
        <div className={`rounded px-3 py-2 text-xs flex items-center justify-between ${
          flash.kind === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {flash.msg}
          <button onClick={() => setFlash(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {upsets.length === 0 && (
        <div className="border border-slate-200 rounded p-8 text-center space-y-2">
          <p className="text-sm text-slate-500">No upsets computed yet for {weight} lb.</p>
          <p className="text-xs text-slate-400">Click "Compute Upsets" to scan the week's matches.</p>
        </div>
      )}

      {/* ── Toolbar: filters + bulk selectors ─────────────────────────────── */}
      {upsets.length > 0 && (
        <div className="flex items-center justify-between">
          {/* Filter tabs */}
          <div className="flex gap-0 border border-slate-200 rounded overflow-hidden text-xs">
            {(['all', 'included', 'excluded'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 capitalize transition-colors ${
                  filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {f === 'all' ? `All (${upsets.length})` : f === 'included' ? `Included (${includedCount})` : `Excluded (${upsets.length - includedCount})`}
              </button>
            ))}
          </div>

          {/* Bulk actions */}
          {canEdit && (
            <div className="flex gap-2 text-xs">
              <button onClick={selectAll}  className="text-slate-500 hover:text-slate-900 underline">Select all</button>
              <button onClick={selectNone} className="text-slate-500 hover:text-slate-900 underline">Select none</button>
            </div>
          )}
        </div>
      )}

      {/* ── Upset table ─────────────────────────────────────────────────────── */}
      {displayed.length > 0 && (
        <div className="border border-slate-200 rounded overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {canEdit && <th className="w-8 px-3 py-1" />}
                <th className="px-3 py-1 text-left text-xs font-semibold text-slate-500 w-16">+Diff</th>
                <th className="px-3 py-1 text-left text-xs font-semibold text-slate-500 w-12">Type</th>
                <th className="px-3 py-1 text-left text-xs font-semibold text-slate-500">Underdog (Winner)</th>
                <th className="px-3 py-1 text-center text-xs font-semibold text-slate-400 w-8 select-none">def.</th>
                <th className="px-3 py-1 text-left text-xs font-semibold text-slate-500">Upset Victim (Loser)</th>
                <th className="px-3 py-1 text-left text-xs font-semibold text-slate-500 w-16">Date</th>
                <th className="px-3 py-1 text-left text-xs font-semibold text-slate-500 w-24">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.map((u) => {
                const included = selections[u.id] ?? false
                return (
                  <tr
                    key={u.id}
                    className={`transition-colors ${
                      included ? 'bg-white' : 'bg-slate-50/50 opacity-60'
                    } hover:bg-slate-50`}
                  >
                    {/* Checkbox */}
                    {canEdit && (
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={() => toggle(u.id)}
                          className="w-4 h-4 rounded border-slate-300 text-slate-900 cursor-pointer"
                        />
                      </td>
                    )}

                    {/* Differential */}
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold tabular-nums ${diffColor(u.differential)}`}>
                        +{u.differential.toFixed(1)}
                      </span>
                    </td>

                    {/* Win type */}
                    <td className="px-3 py-2">
                      {u.win_type ? (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${winColor(u.win_type)}`}>
                          {winLabel(u.win_type)}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Winner */}
                    <td className="px-3 py-2">
                      <WrestlerCell
                        name={u.winner_name}
                        school={u.winner_school}
                        grade={u.winner_grade}
                        districtName={u.winner_district_name}
                        multiWin={u.winner_multi_win}
                        multiLoss={u.winner_multi_loss}
                      />
                    </td>

                    {/* "def." separator */}
                    <td className="px-1 py-2 text-center text-xs text-slate-300 font-medium select-none">def.</td>

                    {/* Loser */}
                    <td className="px-3 py-2">
                      <WrestlerCell
                        name={u.loser_name}
                        school={u.loser_school}
                        grade={u.loser_grade}
                        districtName={u.loser_district_name}
                        multiWin={u.loser_multi_win}
                        multiLoss={u.loser_multi_loss}
                      />
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2 text-xs text-slate-400 whitespace-nowrap">{fmtDate(u.match_date)}</td>

                    {/* Scope badge */}
                    <td className="px-3 py-2">
                      {u.same_district ? (
                        <span className="text-xs text-slate-400">Same district</span>
                      ) : u.same_region ? (
                        <span className="text-xs text-blue-500">Same region</span>
                      ) : u.same_section ? (
                        <span className="text-xs text-purple-500">Same section</span>
                      ) : (
                        <span className="text-xs text-slate-300">Cross-district</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Bottom save bar ──────────────────────────────────────────────────── */}
      {upsets.length > 0 && canEdit && (
        <div className="flex items-center justify-between pt-1">
          {isComplete && (
            <button onClick={handleUnlock} className="text-xs text-slate-400 hover:text-red-600 underline">
              Unlock &amp; clear completion
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {includedCount} of {upsets.length} upsets selected for publication
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-1.5 text-sm font-semibold bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isComplete ? 'Update Upsets' : 'Save Upsets'}
            </button>
          </div>
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      {upsets.some(u => u.winner_multi_win || u.loser_multi_loss || u.winner_multi_loss || u.loser_multi_win) && (
        <p className="text-xs text-slate-400 pt-1">
          ⚡ Multiple upset wins this week &nbsp;·&nbsp; ⚠ Multiple upsets suffered this week
        </p>
      )}
    </div>
  )
}
