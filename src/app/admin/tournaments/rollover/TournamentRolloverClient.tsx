'use client'

import { useState, useEffect } from 'react'

type PriorTournament = {
  id:              string
  name:            string
  gender:          string
  tournament_type: string | null
  source_format:   string | null
  is_oos:          boolean
  podium_depth:    number
  point_value:     number | null
  start_date:      string
  end_date:        string | null
  location:        string | null
  venue_name:      string | null
  venue_address:   string | null
  banner_bg:       string | null
  banner_fg:       string | null
  location_school_id: number | null
  alreadyRolledOver: boolean
}

type RowState = {
  include:       boolean
  newStartDate:  string
  newEndDate:    string
  showParticipants: boolean
  participantText:  string
}

type RolloverResult = {
  created:                number
  skipped:                number
  participantsLinked:     number
  participantsUnmatched:  string[]
}

type Phase = 'loading' | 'ready' | 'submitting' | 'done' | 'error'

const GENDER_LABEL: Record<string, string> = { M: 'Boys', F: 'Girls' }
const TYPE_LABEL: Record<string, string> = {
  outside:        'OOS',
  inside_outside: 'Mixed',
  inside:         'NJ Only',
}

export function TournamentRolloverClient() {
  const [migrationPending, setMigrationPending] = useState<boolean | null>(null)
  const [phase,       setPhase]       = useState<Phase>('loading')
  const [tournaments, setTournaments] = useState<PriorTournament[]>([])
  const [rows,        setRows]        = useState<Map<string, RowState>>(new Map())
  const [result,      setResult]      = useState<RolloverResult | null>(null)
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/api/admin/tournament-rollover?check=1')
        const d = await r.json()
        setMigrationPending(d.migrationPending ?? false)

        const r2 = await fetch('/api/admin/tournament-rollover')
        const d2 = await r2.json()
        if (d2.error) { setErrorMsg(d2.error); setPhase('error'); return }

        const ts: PriorTournament[] = d2.tournaments ?? []
        setTournaments(ts)

        const initialRows = new Map<string, RowState>()
        for (const t of ts) {
          initialRows.set(t.id, {
            include:          !t.alreadyRolledOver,
            newStartDate:     '',
            newEndDate:       '',
            showParticipants: false,
            participantText:  '',
          })
        }
        setRows(initialRows)
        setPhase('ready')
      } catch (e) {
        setErrorMsg(String(e))
        setPhase('error')
      }
    }
    load()
  }, [])

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows(prev => {
      const next = new Map(prev)
      next.set(id, { ...prev.get(id)!, ...patch })
      return next
    })
  }

  function toggleAll(include: boolean) {
    setRows(prev => {
      const next = new Map(prev)
      for (const [id, row] of next) {
        next.set(id, { ...row, include })
      }
      return next
    })
  }

  const selectedCount = [...rows.values()].filter(r => r.include).length
  const readyCount    = [...rows.values()].filter(r => r.include && r.newStartDate).length

  async function handleSubmit() {
    setPhase('submitting')
    setErrorMsg(null)

    const entries = tournaments
      .filter(t => {
        const row = rows.get(t.id)
        return row?.include && row?.newStartDate
      })
      .map(t => {
        const row = rows.get(t.id)!
        return {
          priorId:         t.id,
          newStartDate:    row.newStartDate,
          newEndDate:      row.newEndDate || undefined,
          schoolNames:     row.participantText
            ? row.participantText.split('\n').map(s => s.trim()).filter(Boolean)
            : undefined,
          name:               t.name,
          gender:             t.gender,
          tournament_type:    t.tournament_type,
          source_format:      t.source_format,
          is_oos:             t.is_oos,
          podium_depth:       t.podium_depth,
          point_value:        t.point_value,
          location:           t.location,
          venue_name:         t.venue_name,
          venue_address:      t.venue_address,
          banner_bg:          t.banner_bg,
          banner_fg:          t.banner_fg,
          location_school_id: t.location_school_id,
        }
      })

    try {
      const r = await fetch('/api/admin/tournament-rollover', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ entries }),
      })
      const d = await r.json()
      if (d.error) { setErrorMsg(d.error); setPhase('error'); return }
      setResult(d)
      setPhase('done')
    } catch (e) {
      setErrorMsg(String(e))
      setPhase('error')
    }
  }

  // ── Migration pending banner ──────────────────────────────────────────────
  if (migrationPending === true) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded px-4 py-3 text-sm text-amber-800">
        Apply <code className="font-mono text-xs">docs/migrations/20260824_tournament_participants.sql</code> first
        to enable participant linking. The rollover itself will still work without it, but school participant
        lists cannot be saved.
      </div>
    )
  }

  if (phase === 'loading') {
    return <p className="text-sm text-slate-400">Loading 2024-25 tournaments…</p>
  }

  if (phase === 'error') {
    return (
      <div>
        <p className="text-sm text-red-600 mb-3">{errorMsg}</p>
        <button onClick={() => { setPhase('loading'); setErrorMsg(null) }} className="text-sm text-slate-500 underline">
          Try again
        </button>
      </div>
    )
  }

  if (phase === 'done' && result) {
    return (
      <div className="space-y-4">
        <div className="border border-green-200 bg-green-50 rounded px-5 py-4">
          <p className="text-sm font-semibold text-green-800">Rollover complete</p>
          <p className="text-sm text-green-700 mt-1">
            {result.created} tournament{result.created !== 1 ? 's' : ''} created for 2025-26
            {result.skipped > 0 ? ` · ${result.skipped} skipped (duplicate)` : ''}
            {result.participantsLinked > 0 ? ` · ${result.participantsLinked} school participants linked` : ''}
          </p>
        </div>
        {result.participantsUnmatched.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 rounded px-4 py-3">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
              Unmatched schools ({result.participantsUnmatched.length})
            </p>
            <ul className="text-xs text-amber-700 space-y-0.5">
              {result.participantsUnmatched.map((s, i) => (
                <li key={i} className="font-mono">{s}</li>
              ))}
            </ul>
            <p className="text-xs text-amber-600 mt-2">
              Add these schools manually via the Data Browser or Schools admin page.
            </p>
          </div>
        )}
      </div>
    )
  }

  if (phase === 'submitting') {
    return <p className="text-sm text-slate-400">Creating tournaments…</p>
  }

  // ── Ready: editable table ────────────────────────────────────────────────
  if (tournaments.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No 2024-25 in-season tournaments found. Nothing to roll over.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {/* Controls row */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-500">{selectedCount} of {tournaments.length} selected</span>
        <button onClick={() => toggleAll(true)}  className="text-slate-600 hover:text-slate-900 underline">Select all</button>
        <button onClick={() => toggleAll(false)} className="text-slate-600 hover:text-slate-900 underline">Deselect all</button>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600 w-8"></th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Tournament</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">2024-25 Date</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">New Start Date <span className="text-red-500">*</span></th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">New End Date</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Participants</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tournaments.map(t => {
                const row = rows.get(t.id)
                if (!row) return null
                return (
                  <>
                    <tr key={t.id} className={row.include ? '' : 'opacity-40'}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={e => updateRow(t.id, { include: e.target.checked })}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-800">{t.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            t.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {GENDER_LABEL[t.gender] ?? t.gender}
                          </span>
                          {t.tournament_type && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                              {TYPE_LABEL[t.tournament_type] ?? t.tournament_type}
                            </span>
                          )}
                          {t.alreadyRolledOver && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">
                              Already rolled over
                            </span>
                          )}
                        </div>
                        {t.venue_name && (
                          <p className="text-slate-400 mt-0.5">{t.venue_name}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                        {t.start_date}
                        {t.end_date && t.end_date !== t.start_date ? ` – ${t.end_date}` : ''}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={row.newStartDate}
                          onChange={e => updateRow(t.id, { newStartDate: e.target.value })}
                          disabled={!row.include}
                          className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-40"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={row.newEndDate}
                          onChange={e => updateRow(t.id, { newEndDate: e.target.value })}
                          disabled={!row.include}
                          className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-40"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {migrationPending === false && row.include && (
                          <button
                            onClick={() => updateRow(t.id, { showParticipants: !row.showParticipants })}
                            className="text-slate-500 hover:text-slate-800 underline text-[10px]"
                          >
                            {row.showParticipants ? 'Hide' : '+ Add schools'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {row.showParticipants && row.include && (
                      <tr key={`${t.id}-participants`} className="bg-slate-50">
                        <td></td>
                        <td colSpan={5} className="px-3 py-2">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                            Participating Schools (one per line, optional)
                          </label>
                          <textarea
                            value={row.participantText}
                            onChange={e => updateRow(t.id, { participantText: e.target.value })}
                            rows={4}
                            placeholder={"Delbarton\nSt. Augustine\nRidgewood\n..."}
                            className="w-full max-w-md border border-slate-300 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
                          />
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            School names are fuzzy-matched against the NJ school directory.
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={handleSubmit}
          disabled={readyCount === 0}
          className="px-5 py-2 bg-slate-900 text-white text-sm rounded font-medium hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Roll Over {readyCount} Tournament{readyCount !== 1 ? 's' : ''} →  2025-26
        </button>
        {selectedCount > readyCount && (
          <p className="text-xs text-amber-600">
            {selectedCount - readyCount} selected tournament{selectedCount - readyCount !== 1 ? 's' : ''} need a start date before they can roll over.
          </p>
        )}
      </div>
    </div>
  )
}
