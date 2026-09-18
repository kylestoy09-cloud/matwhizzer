'use client'

import { useState, useRef } from 'react'

// ── CSV helpers ────────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  }).filter(row => Object.values(row).some(v => v !== ''))
}

const EDITABLE_FIELDS = [
  'display_name', 'short_name', 'mascot', 'nickname',
  'color_primary', 'color_secondary', 'color_tertiary', 'header_background',
  'town', 'county', 'section', 'classification', 'athletic_conference',
  'website_url', 'twitter_handle', 'logo_url',
]

// ── Types ──────────────────────────────────────────────────────────────────────

type DiffRow = {
  school_id: number | null
  school_name: string
  matched: boolean
  match_confidence: 'exact' | 'fuzzy' | 'none'
  changes: Array<{ field: string; before: string | null; after: string }>
}

type Phase = 'upload' | 'preview' | 'applying' | 'done'

// ── Component ─────────────────────────────────────────────────────────────────

export function BulkSchoolUploadClient() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase]   = useState<Phase>('upload')
  const [error, setError]   = useState<string | null>(null)
  const [rows,  setRows]    = useState<DiffRow[]>([])
  const [log,   setLog]     = useState<string>('')

  const handleFile = async (file: File) => {
    setError(null)
    const text = await file.text()
    const parsed = parseCSV(text)
    if (parsed.length === 0) { setError('CSV is empty or unparseable.'); return }

    const hasIdentifier = parsed[0]['school_id'] !== undefined || parsed[0]['name'] !== undefined
    if (!hasIdentifier) { setError('CSV must have a "school_id" or "name" column.'); return }

    // Match schools via API
    const res = await fetch('/api/admin/bulk-school-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: parsed }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); return }

    setRows(data.diffs)
    setPhase('preview')
  }

  const applyChanges = async () => {
    const toApply = rows.filter(r => r.matched && r.changes.length > 0)
    if (toApply.length === 0) { setError('No matched rows with changes to apply.'); return }

    setPhase('applying')

    const r = await fetch('/api/admin/school-bulk-apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows: toApply.map(row => ({
          school_id:   row.school_id,
          school_name: row.school_name,
          changes:     row.changes,
        })),
      }),
    })
    const d = await r.json()

    const lines: string[] = [`Applied: ${d.applied ?? 0}  Failed: ${d.failed ?? 0}`]
    if (d.errors?.length) {
      for (const e of d.errors) lines.push(`  ✗ ${e.school_name} (#${e.school_id}): ${e.error}`)
    }
    setLog(lines.join('\n'))
    setPhase('done')
  }

  const reset = () => { setPhase('upload'); setRows([]); setLog(''); setError(null) }

  const matched    = rows.filter(r => r.matched)
  const unmatched  = rows.filter(r => !r.matched)
  const withChanges = matched.filter(r => r.changes.length > 0)

  if (phase === 'upload') return (
    <div>
      <div
        className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center cursor-pointer hover:border-slate-400 transition-colors"
        onClick={() => fileRef.current?.click()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onDragOver={e => e.preventDefault()}
      >
        <p className="text-slate-500 text-sm mb-2">Drop a CSV file here or click to browse</p>
        <p className="text-xs text-slate-400">Required: school_id or name column. Any editable school field as additional columns.</p>
      </div>
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )

  if (phase === 'preview') return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-green-700">{withChanges.length}</span> schools with changes to apply ·{' '}
          <span className="font-semibold text-slate-500">{matched.length - withChanges.length}</span> already up-to-date ·{' '}
          <span className="font-semibold text-red-600">{unmatched.length}</span> unmatched (will be skipped)
        </div>
        <button onClick={reset} className="ml-auto text-xs text-slate-500 border border-slate-200 rounded px-3 py-1 hover:bg-slate-50">
          Start Over
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto border border-slate-200 rounded mb-4">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">School</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Match</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Changes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i} className={!row.matched ? 'bg-red-50' : row.changes.length === 0 ? 'opacity-50' : ''}>
                <td className="px-3 py-2 font-medium">{row.school_name}</td>
                <td className="px-3 py-2">
                  {row.matched
                    ? <span className={`px-1.5 py-0.5 rounded-full font-medium ${row.match_confidence === 'exact' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {row.match_confidence} #{row.school_id}
                      </span>
                    : <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">No match</span>
                  }
                </td>
                <td className="px-3 py-2">
                  {row.changes.length === 0
                    ? <span className="text-slate-400">No changes</span>
                    : <ul className="space-y-0.5">
                        {row.changes.map(c => (
                          <li key={c.field}>
                            <span className="font-mono text-slate-500">{c.field}</span>{': '}
                            <span className="text-red-500 line-through">{c.before ?? '∅'}</span>
                            {' → '}
                            <span className="text-green-600">{c.after}</span>
                          </li>
                        ))}
                      </ul>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {withChanges.length > 0 && (
        <button
          onClick={applyChanges}
          className="px-5 py-2.5 bg-slate-900 text-white text-sm rounded font-medium"
        >
          Apply {withChanges.length} school update{withChanges.length !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  )

  if (phase === 'applying') return (
    <div className="py-12 text-center text-slate-500 text-sm">Applying changes…</div>
  )

  return (
    <div>
      <p className="text-green-700 font-medium mb-3">Done!</p>
      <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-4 max-h-64 overflow-y-auto whitespace-pre-wrap">{log}</pre>
      <button onClick={reset} className="mt-4 px-4 py-2 bg-slate-900 text-white text-sm rounded">Upload Another</button>
    </div>
  )
}
