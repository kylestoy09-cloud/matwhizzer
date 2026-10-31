'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  }).filter(row => Object.values(row).some(v => v !== ''))
}

type CoachPreviewRow = {
  key: number
  coach_name: string
  school_id: number | null
  school_name: string
  matched: boolean
  title: string
  email: string
  phone: string
  action: 'create' | 'update' | 'skip'
  existing_id?: string
}

type SchoolResult = { id: number; display_name: string }

type Phase = 'upload' | 'preview' | 'applying' | 'done'

function SchoolPicker({
  schoolName, schoolId, onSelect,
}: {
  schoolName: string
  schoolId: number | null
  onSelect: (id: number, name: string) => void
}) {
  const [query, setQuery]     = useState(schoolName)
  const [results, setResults] = useState<SchoolResult[]>([])
  const [open, setOpen]       = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Sync if parent changes the name externally
  useEffect(() => { setQuery(schoolName) }, [schoolName])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!query.trim() || query === schoolName) { setResults([]); return }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/admin/search-schools?q=${encodeURIComponent(query)}&limit=10`)
      const d = await r.json()
      setResults(d.schools ?? [])
      setOpen(true)
    }, 220)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search school…"
        className="text-xs border border-slate-200 rounded px-2 py-1 w-44 focus:outline-none focus:border-blue-400"
      />
      {schoolId && query === schoolName && (
        <span className="ml-1 text-[10px] text-slate-400">#{schoolId}</span>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-20 left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto w-56">
          {results.map(s => (
            <button
              key={s.id}
              onMouseDown={e => { e.preventDefault(); onSelect(s.id, s.display_name); setQuery(s.display_name); setOpen(false); setResults([]) }}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50"
            >
              {s.display_name} <span className="text-slate-400">#{s.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function EditableCell({ value, onChange, placeholder, width = 'w-36' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; width?: string
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`text-xs border border-slate-200 rounded px-2 py-1 ${width} focus:outline-none focus:border-blue-400`}
    />
  )
}

export function BulkCoachUploadClient() {
  const router   = useRouter()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [phase, setPhase]   = useState<Phase>('upload')
  const [error, setError]   = useState<string | null>(null)
  const [rows,  setRows]    = useState<CoachPreviewRow[]>([])
  const [log,   setLog]     = useState('')
  // Coaches go to the admin toggle's gender, for the season the preview names
  const { gender } = useAdminGender()
  const [season, setSeason] = useState<{ id: number; label: string } | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    const text = await file.text()
    const parsed = parseCSV(text)
    if (parsed.length === 0) { setError('CSV is empty or unparseable.'); return }
    if (!parsed[0]['name']) { setError('CSV must have a "name" column for coach name.'); return }
    if (!parsed[0]['school_id'] && !parsed[0]['school_name']) {
      setError('CSV must have "school_id" or "school_name" column.'); return
    }

    const res = await fetch('/api/admin/bulk-coach-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: parsed, gender }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); return }
    setSeason({ id: data.season_id, label: data.season_label })

    // Add stable key for React list rendering
    setRows((data.preview as Omit<CoachPreviewRow, 'key'>[]).map((r, i) => ({ ...r, key: i })))
    setPhase('preview')
  }

  function updateRow(key: number, patch: Partial<CoachPreviewRow>) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r))
  }

  function deleteRow(key: number) {
    setRows(prev => prev.filter(r => r.key !== key))
  }

  const applyChanges = async () => {
    const toApply = rows.filter(r => r.matched && r.action !== 'skip')
    if (toApply.length === 0) { setError('Nothing to apply.'); return }
    setPhase('applying')
    const results: string[] = []

    for (const row of toApply) {
      if (row.action === 'create') {
        const r = await fetch('/api/admin/school-coaches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId:    row.school_id,
            name:        row.coach_name,
            title:       row.title || 'Head Coach',
            coachEmail:  row.email,
            phone:       row.phone,
            seasonId:    season?.id,
            gender,
          }),
        })
        const d = await r.json()
        results.push(`CREATE ${row.coach_name} @ ${row.school_name}: ${d.error ?? 'OK'}`)
      } else if (row.action === 'update' && row.existing_id) {
        const r = await fetch('/api/admin/school-coaches', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id:         row.existing_id,
            title:      row.title || undefined,
            coachEmail: row.email || undefined,
            phone:      row.phone || undefined,
            gender,
          }),
        })
        const d = await r.json()
        results.push(`UPDATE ${row.coach_name} @ ${row.school_name}: ${d.error ?? 'OK'}`)
      }
    }

    setLog(results.join('\n'))
    setPhase('done')
    router.refresh()
  }

  const actionColor = (a: CoachPreviewRow['action']) =>
    a === 'create' ? 'bg-green-100 text-green-700'
    : a === 'update' ? 'bg-blue-100 text-blue-700'
    : 'bg-slate-100 text-slate-500'

  const applicable = rows.filter(r => r.matched && r.action !== 'skip')
  const unmatched  = rows.filter(r => !r.matched)

  // ── Upload ──────────────────────────────────────────────────────────────────
  if (phase === 'upload') return (
    <div>
      <div
        className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center cursor-pointer hover:border-slate-400 transition-colors"
        onClick={() => fileRef.current?.click()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onDragOver={e => e.preventDefault()}
      >
        <p className="text-slate-500 text-sm">Drop a CSV file here or click to browse</p>
        <p className="text-xs text-slate-400 mt-1">Columns: <code>school_id</code>, <code>name</code> — optional: <code>title</code>, <code>email</code>, <code>phone</code></p>
      </div>
      <input ref={fileRef} type="file" accept=".csv" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )

  // ── Preview ──────────────────────────────────────────────────────────────────
  if (phase === 'preview') return (
    <div>
      <div className="flex items-center gap-4 mb-4 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{gender === 'F' ? 'Girls' : 'Boys'} coaches{season ? ` · ${season.label}` : ''}</span>
        <span><span className="font-semibold text-green-700">{applicable.length}</span> to apply</span>
        {unmatched.length > 0 && (
          <span><span className="font-semibold text-red-600">{unmatched.length}</span> unmatched</span>
        )}
        <span className="text-slate-400 text-xs">{rows.length} total rows — edit inline, then apply</span>
        <button
          onClick={() => { setPhase('upload'); setRows([]); setError(null) }}
          className="ml-auto text-xs border border-slate-200 rounded px-3 py-1 hover:bg-slate-50"
        >
          Start Over
        </button>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto border border-slate-200 rounded mb-4">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Coach Name</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">School</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Title</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Action</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => (
              <tr key={row.key} className={!row.matched ? 'bg-red-50' : ''}>

                {/* Coach name — editable */}
                <td className="px-3 py-2">
                  <EditableCell
                    value={row.coach_name}
                    onChange={v => updateRow(row.key, { coach_name: v })}
                    placeholder="Coach name"
                    width="w-40"
                  />
                </td>

                {/* School — searchable picker */}
                <td className="px-3 py-2">
                  <SchoolPicker
                    schoolName={row.school_name}
                    schoolId={row.school_id}
                    onSelect={(id, name) => updateRow(row.key, {
                      school_id:   id,
                      school_name: name,
                      matched:     true,
                      action:      row.action === 'skip' ? 'create' : row.action,
                    })}
                  />
                  {!row.matched && (
                    <p className="text-[10px] text-red-500 mt-0.5">No match — search to fix</p>
                  )}
                </td>

                {/* Title — editable */}
                <td className="px-3 py-2">
                  <EditableCell
                    value={row.title}
                    onChange={v => updateRow(row.key, { title: v })}
                    placeholder="Head Coach"
                    width="w-32"
                  />
                </td>

                {/* Action badge — toggleable */}
                <td className="px-3 py-2">
                  <select
                    value={row.action}
                    onChange={e => updateRow(row.key, { action: e.target.value as CoachPreviewRow['action'] })}
                    disabled={!row.matched}
                    className={`text-[11px] font-medium px-2 py-0.5 rounded border-0 cursor-pointer focus:outline-none ${actionColor(row.action)}`}
                  >
                    <option value="create">create</option>
                    <option value="update">update</option>
                    <option value="skip">skip</option>
                  </select>
                </td>

                {/* Delete */}
                <td className="px-2 py-2">
                  <button
                    onClick={() => deleteRow(row.key)}
                    title="Remove row"
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path d="M6.5 1h3a.5.5 0 01.5.5v1H6v-1a.5.5 0 01.5-.5zM11 2.5v-1A1.5 1.5 0 009.5 0h-3A1.5 1.5 0 005 1.5v1H2.506a.58.58 0 00-.01 0H1.5a.5.5 0 000 1h.538l.853 10.66A2 2 0 004.885 16h6.23a2 2 0 001.994-1.84l.853-10.66H14.5a.5.5 0 000-1h-.995a.59.59 0 00-.01 0H11zm1.958 1l-.846 10.58a1 1 0 01-.997.92h-6.23a1 1 0 01-.997-.92L3.042 3.5h9.916z"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {applicable.length > 0 && (
        <button onClick={applyChanges} className="px-5 py-2.5 bg-slate-900 text-white text-sm rounded font-medium">
          Apply {applicable.length} coach update{applicable.length !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  )

  // ── Applying ─────────────────────────────────────────────────────────────────
  if (phase === 'applying') return (
    <div className="py-12 text-center text-slate-500 text-sm">Applying…</div>
  )

  // ── Done ──────────────────────────────────────────────────────────────────────
  return (
    <div>
      <p className="text-green-700 font-medium mb-3">Done!</p>
      <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-4 max-h-64 overflow-y-auto whitespace-pre-wrap">{log}</pre>
      <button
        onClick={() => { setPhase('upload'); setRows([]); setLog(''); setError(null) }}
        className="mt-4 px-4 py-2 bg-slate-900 text-white text-sm rounded"
      >
        Upload Another
      </button>
    </div>
  )
}
