'use client'

import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { useState, useRef } from 'react'
import type { CsvRow, StagedMeet, StagedLink, FlaggedItem } from '@/app/api/admin/schedule-bulk-import/route'

// ── CSV parsing ───────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase())
  return lines.slice(1).map((line, i) => {
    const vals = splitCSVLine(line)
    const row: Record<string, string> = { _line: String(i + 2) }
    for (let j = 0; j < headers.length; j++) row[headers[j]] = (vals[j] ?? '').trim()
    return row
  })
}

function splitCSVLine(line: string): string[] {
  const cols: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { inQ = !inQ }
    else if (c === ',' && !inQ) { cols.push(cur); cur = '' }
    else cur += c
  }
  cols.push(cur)
  return cols
}

// Column aliases → canonical names
const COL_MAP: Record<string, keyof CsvRow> = {
  reporting_school_id:   'reporting_school_id',
  reporting_school:      'reporting_school_name',
  school_id:             'reporting_school_id',
  school_name:           'reporting_school_name',
  school:                'reporting_school_name',
  opponent_id:           'opponent_id',
  opponent_school_id:    'opponent_id',
  opponent_name:         'opponent_name',
  opponent:              'opponent_name',
  meet_date:             'meet_date',
  date:                  'meet_date',
  gender:                'gender',
  event_type:            'event_type',
  type:                  'event_type',
  event_name:            'event_name',
  tournament_name:       'event_name',
}

// A row with no gender belongs to the side doing the import
function normalizeRow(raw: Record<string, string>, idx: number, sideGender: 'M' | 'F'): CsvRow {
  const out: CsvRow = {
    reporting_school_id:   '',
    reporting_school_name: '',
    opponent_id:           '',
    opponent_name:         '',
    meet_date:             '',
    gender:                sideGender,
    event_type:            '',
    event_name:            '',
    _row_index:            idx,
  }
  for (const [k, v] of Object.entries(raw)) {
    const canonical = COL_MAP[k]
    if (canonical) (out as unknown as Record<string, string>)[canonical] = v
  }
  out.gender = (out.gender || sideGender).trim().toUpperCase()
  return out
}

// ── Types mirrored from API ───────────────────────────────────────────────────

type StageResult = {
  crossConfirmed:    StagedMeet[]
  untrackedOpponent: StagedMeet[]
  tournamentLinks:   StagedLink[]
  flagged:           FlaggedItem[]
  parseErrors:       string[]
  totals: {
    autoCreate:      number
    tournament:      number
    flagged:         number
    skippedExisting: number
  }
}

type CommitResult = {
  created:         number
  skipped:         number
  tournamentLinked: number
  errors:          string[]
}

type Phase = 'idle' | 'staging' | 'staged' | 'committing' | 'done' | 'error'

const GENDER_LABEL: Record<string, string> = { M: 'Boys', F: 'Girls' }

// ── Component ─────────────────────────────────────────────────────────────────

export function ScheduleBulkImportClient() {
  const { gender: sideGender } = useAdminGender()
  const [phase,        setPhase]        = useState<Phase>('idle')
  const [csvText,      setCsvText]      = useState('')
  const [staged,       setStaged]       = useState<StageResult | null>(null)
  const [result,       setResult]       = useState<CommitResult | null>(null)
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null)
  const [showFlagged,  setShowFlagged]  = useState(false)
  const [showAuto,     setShowAuto]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const texts = await Promise.all(files.map(f => f.text()))
    setCsvText(texts.join('\n'))
  }

  async function handleStage() {
    if (!csvText.trim()) return
    setPhase('staging')
    setErrorMsg(null)

    const rawRows = parseCSV(csvText)
    const allRows = rawRows.map((r, i) => normalizeRow(r, i + 1, sideGender))
    // Each side imports its own schedule: rows for the other gender are left out
    const rows = allRows.filter(r => r.gender === sideGender)
    const otherSide = allRows.filter(r => r.gender !== sideGender).map(r => r._row_index)
    if (rows.length === 0) {
      setErrorMsg(`No ${GENDER_LABEL[sideGender].toLowerCase()} rows to import${otherSide.length ? ` (rows ${otherSide.join(', ')} are for the other side)` : ''}.`)
      setPhase('error')
      return
    }

    try {
      const res = await fetch('/api/admin/schedule-bulk-import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'stage', rows }),
      })
      const d = await res.json()
      if (d.error) { setErrorMsg(d.error); setPhase('error'); return }
      if (otherSide.length) d.parseErrors = [`Rows ${otherSide.join(', ')} are for the ${sideGender === 'F' ? 'boys' : 'girls'} side and were left out`, ...(d.parseErrors ?? [])]
      setStaged(d)
      setPhase('staged')
    } catch (e) {
      setErrorMsg(String(e))
      setPhase('error')
    }
  }

  async function handleCommit() {
    if (!staged) return
    setPhase('committing')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/admin/schedule-bulk-import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:            'commit',
          crossConfirmed:    staged.crossConfirmed,
          untrackedOpponent: staged.untrackedOpponent,
          tournamentLinks:   staged.tournamentLinks,
        }),
      })
      const d = await res.json()
      if (d.error) { setErrorMsg(d.error); setPhase('error'); return }
      setResult(d)
      setPhase('done')
    } catch (e) {
      setErrorMsg(String(e))
      setPhase('error')
    }
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  if (phase === 'done' && result) {
    return (
      <div className="space-y-4">
        <div className="border border-green-200 bg-green-50 rounded px-5 py-4">
          <p className="text-sm font-semibold text-green-800">Import complete</p>
          <p className="text-sm text-green-700 mt-1">
            {result.created} meet{result.created !== 1 ? 's' : ''} created
            {result.skipped > 0 ? ` · ${result.skipped} skipped (already existed)` : ''}
            {result.tournamentLinked > 0 ? ` · ${result.tournamentLinked} tournament participant link${result.tournamentLinked !== 1 ? 's' : ''} added` : ''}
          </p>
        </div>
        {result.errors.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 rounded px-4 py-3">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
              Partial errors ({result.errors.length})
            </p>
            <ul className="text-xs text-amber-700 space-y-0.5 font-mono">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
        <button onClick={() => { setPhase('idle'); setCsvText(''); setStaged(null); setResult(null) }}
          className="text-sm text-slate-500 underline">
          Import another batch
        </button>
      </div>
    )
  }

  // ── Staged summary ──────────────────────────────────────────────────────────
  if ((phase === 'staged' || phase === 'committing') && staged) {
    const { totals } = staged
    return (
      <div className="space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border border-green-200 bg-green-50 rounded px-3 py-3 text-center">
            <p className="text-xl font-bold text-green-700">{staged.crossConfirmed.length}</p>
            <p className="text-xs text-green-600 mt-0.5">Cross-confirmed meets</p>
          </div>
          <div className="border border-blue-200 bg-blue-50 rounded px-3 py-3 text-center">
            <p className="text-xl font-bold text-blue-700">{staged.untrackedOpponent.length}</p>
            <p className="text-xs text-blue-600 mt-0.5">Untracked opponent meets</p>
          </div>
          <div className="border border-purple-200 bg-purple-50 rounded px-3 py-3 text-center">
            <p className="text-xl font-bold text-purple-700">{totals.tournament}</p>
            <p className="text-xs text-purple-600 mt-0.5">Tournament links (new)</p>
          </div>
          <div className="border border-amber-200 bg-amber-50 rounded px-3 py-3 text-center">
            <p className="text-xl font-bold text-amber-700">{totals.flagged}</p>
            <p className="text-xs text-amber-600 mt-0.5">Flagged for review</p>
          </div>
        </div>

        {totals.skippedExisting > 0 && (
          <p className="text-xs text-slate-400">{totals.skippedExisting} match{totals.skippedExisting !== 1 ? 'es' : ''} already in the database — skipped.</p>
        )}

        {staged.parseErrors.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 rounded px-4 py-3">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
              Parse errors ({staged.parseErrors.length}) — rows skipped
            </p>
            <ul className="text-xs text-amber-700 font-mono space-y-0.5">
              {staged.parseErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* Auto-create detail (collapsible) */}
        {totals.autoCreate > 0 && (
          <div className="border border-slate-200 rounded overflow-hidden">
            <button
              onClick={() => setShowAuto(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 text-sm text-slate-700 font-medium hover:bg-slate-100"
            >
              <span>Auto-create: {totals.autoCreate} dual meet{totals.autoCreate !== 1 ? 's' : ''}</span>
              <span className="text-slate-400 text-xs">{showAuto ? '▲ hide' : '▼ show'}</span>
            </button>
            {showAuto && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Team 1</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Team 2</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Date</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Gender</th>
                      <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...staged.crossConfirmed, ...staged.untrackedOpponent].map((m, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 text-slate-800">{m.team1_name}</td>
                        <td className="px-3 py-1.5 text-slate-600">{m.team2_name}</td>
                        <td className="px-3 py-1.5 text-slate-500">{m.meet_date}</td>
                        <td className="px-3 py-1.5">{GENDER_LABEL[m.gender] ?? m.gender}</td>
                        <td className="px-3 py-1.5">
                          {m.confirmed_by_both
                            ? <span className="text-green-600 font-medium">Both schools</span>
                            : <span className="text-blue-500">Untracked opp.</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tournament links */}
        {staged.tournamentLinks.length > 0 && (
          <div className="border border-purple-100 rounded overflow-hidden">
            <div className="px-4 py-2.5 bg-purple-50 text-sm font-medium text-purple-700">
              Tournament participant links — {staged.tournamentLinks.filter(l => !l.already_linked).length} new
              {staged.tournamentLinks.some(l => l.already_linked) ? `, ${staged.tournamentLinks.filter(l => l.already_linked).length} already linked` : ''}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Tournament</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-slate-600">School</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {staged.tournamentLinks.map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-slate-800">{l.tournament_name}</td>
                      <td className="px-3 py-1.5 text-slate-600">{l.school_name}</td>
                      <td className="px-3 py-1.5">
                        {l.already_linked
                          ? <span className="text-slate-400">Already linked</span>
                          : <span className="text-purple-600 font-medium">Will link</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Flagged items */}
        {staged.flagged.length > 0 && (
          <div className="border border-amber-200 rounded overflow-hidden">
            <button
              onClick={() => setShowFlagged(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50 text-sm font-medium text-amber-700 hover:bg-amber-100"
            >
              <span>Flagged for review: {staged.flagged.length} item{staged.flagged.length !== 1 ? 's' : ''} (not created)</span>
              <span className="text-amber-400 text-xs">{showFlagged ? '▲ hide' : '▼ show'}</span>
            </button>
            {showFlagged && (
              <div className="divide-y divide-amber-100">
                {staged.flagged.map((f, i) => (
                  <div key={i} className="px-4 py-2.5">
                    <p className="text-xs font-semibold text-amber-700">
                      {f.reason === 'single_sided_tracked' ? 'Single-sided match' : 'Unmatched tournament'}
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">{f.message}</p>
                    <p className="text-xs text-amber-400 mt-0.5">{f.meet_date} · {GENDER_LABEL[f.gender] ?? f.gender}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2 border-t border-slate-200">
          {totals.autoCreate + totals.tournament > 0 ? (
            <button
              onClick={handleCommit}
              disabled={phase === 'committing'}
              className="px-5 py-2 bg-slate-900 text-white text-sm rounded font-medium hover:bg-slate-700 disabled:opacity-50"
            >
              {phase === 'committing' ? 'Creating…' : `Confirm & Create ${totals.autoCreate + totals.tournament} Record${totals.autoCreate + totals.tournament !== 1 ? 's' : ''}`}
            </button>
          ) : (
            <p className="text-sm text-slate-400">Nothing to create — all items are flagged or already exist.</p>
          )}
          <button
            onClick={() => { setPhase('idle'); setStaged(null) }}
            disabled={phase === 'committing'}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
        </div>

        {totals.flagged > 0 && (
          <p className="text-xs text-slate-400">
            Flagged items are not created. Resolve them manually via the dual-meet editor or school schedule tool, then re-upload.
          </p>
        )}
      </div>
    )
  }

  // ── Upload / idle ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Format guide */}
      <div className="border border-slate-200 rounded overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">CSV Format</p>
        </div>
        <div className="px-4 py-3 text-xs text-slate-600 space-y-2">
          <p>Each row represents one schedule entry for the reporting school. Required columns:</p>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left pr-4 py-0.5 font-semibold">Column</th>
                  <th className="text-left pr-4 py-0.5 font-semibold">Aliases</th>
                  <th className="text-left py-0.5 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="font-mono divide-y divide-slate-100">
                {[
                  ['reporting_school_id', 'school_id', 'Integer school ID (required if no school_name)'],
                  ['reporting_school_name', 'school, school_name', 'Matched against directory'],
                  ['meet_date', 'date', 'YYYY-MM-DD or M/D/YYYY'],
                  ['opponent_id', 'opponent_school_id', 'Leave blank for untracked schools'],
                  ['opponent_name', 'opponent', 'Free text; used for fuzzy tournament matching'],
                  ['gender', '', `M or F (default ${sideGender}, this side)`],
                  ['event_type', 'type', 'dual_meet or tournament (auto-detected if blank)'],
                  ['event_name', 'tournament_name', 'For tournament rows; fuzzy-matched to this season\'s events'],
                ].map(([col, alias, note]) => (
                  <tr key={col}>
                    <td className="pr-4 py-0.5 text-slate-700">{col}</td>
                    <td className="pr-4 py-0.5 text-slate-400">{alias}</td>
                    <td className="py-0.5 text-slate-500 font-sans">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-slate-400">
            Upload multiple schools' CSVs at once — the tool deduplicates matches where both schools reported the same event.
          </p>
        </div>
      </div>

      {/* File upload */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
          Upload CSV file(s)
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          onChange={handleFileChange}
          className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-slate-300 file:text-xs file:font-medium file:bg-white file:text-slate-700 hover:file:bg-slate-50"
        />
      </div>

      {/* Or paste */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
          Or paste CSV content
        </label>
        <textarea
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          rows={10}
          placeholder={"reporting_school_id,meet_date,opponent_name,gender,event_type\n125,2025-12-15,Montville,M,dual_meet\n125,2025-12-20,Somerset County Tournament,M,tournament"}
          className="w-full border border-slate-300 rounded px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-400 resize-y"
        />
        <p className="text-xs text-slate-400 mt-1">
          {csvText ? `${csvText.split('\n').filter(l => l.trim()).length - 1} data row(s) detected` : 'No content yet'}
        </p>
      </div>

      {phase === 'error' && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}

      <button
        onClick={handleStage}
        disabled={!csvText.trim() || phase === 'staging'}
        className="px-5 py-2 bg-slate-900 text-white text-sm rounded font-medium hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {phase === 'staging' ? 'Analyzing…' : 'Analyze Schedule Data'}
      </button>
    </div>
  )
}
