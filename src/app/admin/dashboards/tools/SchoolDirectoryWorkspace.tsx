'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

type SchoolRow = {
  id:             number
  display_name:   string
  address:        string | null
  website_url:    string | null
  twitter_handle: string | null
  facebook_url:   string | null
  ad_name:        string | null
  ad_email:       string | null
  coach_name:     string | null
  coach_email:    string | null
  conference:     string | null
  district_id:    number | null
  region_id:      number | null
  section:        string | null
  classification: string | null
  roster_count:   number
  graded_count:   number
  active:         boolean   // false = marked inactive for this season
}

type Options = {
  districts:   { id: number; name: string }[]
  regions:     { id: number; name: string }[]
  conferences: string[]
  sections:    string[]
  groups:      string[]
}

type ColDef = {
  key:        string
  label:      string
  type:       'readonly' | 'text' | 'url' | 'email' | 'conference' | 'district' | 'region' | 'group' | 'section'
  width:      number
}

const COLUMNS: ColDef[] = [
  { key: 'display_name',   label: 'School',        type: 'readonly',    width: 160 },
  { key: 'active',         label: 'Active',         type: 'readonly',    width: 80  },
  { key: 'grade_pct',      label: 'Grade %',        type: 'readonly',    width: 110 },
  { key: 'address',        label: 'Address',        type: 'text',        width: 200 },
  { key: 'website_url',    label: 'Website',        type: 'url',         width: 160 },
  { key: 'twitter_handle', label: 'Twitter',        type: 'text',        width: 120 },
  { key: 'facebook_url',   label: 'Facebook',       type: 'url',         width: 160 },
  { key: 'coach_name',     label: 'Coach',          type: 'text',        width: 140 },
  { key: 'coach_email',    label: 'Coach Email',    type: 'email',       width: 180 },
  { key: 'ad_name',        label: 'AD',             type: 'text',        width: 140 },
  { key: 'ad_email',       label: 'AD Email',       type: 'email',       width: 180 },
  { key: 'conference',     label: 'Conference',     type: 'conference',  width: 120 },
  { key: 'district_id',    label: 'District',       type: 'district',    width: 130 },
  { key: 'region_id',      label: 'Region',         type: 'region',      width: 110 },
  { key: 'classification', label: 'Group',          type: 'group',       width: 90  },
  { key: 'section',        label: 'Section',        type: 'section',     width: 90  },
]

const DROPDOWN_TYPES = new Set(['conference', 'district', 'region', 'group', 'section'])

type Props = { seasonId: number }

export function SchoolDirectoryWorkspace({ seasonId }: Props) {
  const [rows,     setRows]     = useState<SchoolRow[]>([])
  const [options,  setOptions]  = useState<Options>({ districts: [], regions: [], conferences: [], sections: [], groups: [] })
  const [cantFind, setCantFind] = useState<Set<string>>(new Set())
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('')

  // Active edit cell: `${school_id}_${field}`
  const [editCell,  setEditCell]  = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving,    setSaving]    = useState<Set<string>>(new Set())
  const [flash,     setFlash]     = useState<Record<string, 'ok' | 'err'>>({})

  // Add school modal
  const [showAdd,  setShowAdd]  = useState(false)
  const [addForm,  setAddForm]  = useState<Record<string, string>>({})
  const [adding,   setAdding]   = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/school-directory?season_id=${seasonId}`)
      const data = await res.json()
      if (!data.error) {
        setRows(data.schools ?? [])
        setOptions(data.options ?? {})
        setCantFind(new Set(data.cantFind ?? []))
      }
    } finally {
      setLoading(false)
    }
  }, [seasonId])

  useEffect(() => { load() }, [load])

  // Focus input when edit cell opens
  useEffect(() => {
    if (editCell && inputRef.current) inputRef.current.focus()
  }, [editCell])

  function displayValue(row: SchoolRow, col: ColDef): string {
    const raw = row[col.key as keyof SchoolRow]
    if (col.type === 'district') {
      return options.districts.find(d => d.id === row.district_id)?.name ?? ''
    }
    if (col.type === 'region') {
      return options.regions.find(r => r.id === row.region_id)?.name ?? ''
    }
    if (col.key === 'active') return row.active ? 'Active' : 'Inactive'
    if (col.key === 'grade_pct') {
      if (!row.roster_count) return ''
      return `${Math.round(row.graded_count / row.roster_count * 100)}% (${row.graded_count}/${row.roster_count})`
    }
    return (raw as string | null) ?? ''
  }

  function startEdit(row: SchoolRow, col: ColDef) {
    if (col.type === 'readonly') return
    const key = `${row.id}_${col.key}`
    setEditCell(key)
    // For dropdown types that use IDs, editValue is the ID as string
    const raw = row[col.key as keyof SchoolRow]
    setEditValue(raw === null || raw === undefined ? '' : String(raw))
  }

  async function save(row: SchoolRow, col: ColDef, value: string) {
    const key = `${row.id}_${col.key}`
    setEditCell(null)
    if (value === displayValue(row, col) && col.type !== 'district' && col.type !== 'region') return
    const oldVal = row[col.key as keyof SchoolRow]
    if (String(oldVal ?? '') === value.trim()) return

    setSaving(p => new Set(p).add(key))
    try {
      const res = await fetch('/api/admin/school-directory', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ school_id: row.id, field: col.key, value: value.trim() || null, season_id: seasonId }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Update local row
      setRows(prev => prev.map(r => {
        if (r.id !== row.id) return r
        const updated = { ...r, [col.key]: value.trim() || null }
        // If district/region changed, the ID is already set correctly
        return updated
      }))

      setFlash(p => ({ ...p, [key]: 'ok' }))
      setTimeout(() => setFlash(p => { const n = { ...p }; delete n[key]; return n }), 1200)
    } catch {
      setFlash(p => ({ ...p, [key]: 'err' }))
      setTimeout(() => setFlash(p => { const n = { ...p }; delete n[key]; return n }), 3000)
    } finally {
      setSaving(p => { const n = new Set(p); n.delete(key); return n })
    }
  }

  async function submitAddSchool() {
    if (!addForm.display_name?.trim()) { setAddError('School name is required'); return }
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch('/api/admin/school-directory', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...addForm,
          district_id: addForm.district_id ? Number(addForm.district_id) : null,
          region_id:   addForm.region_id   ? Number(addForm.region_id)   : null,
          season_id:   seasonId,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setShowAdd(false)
      setAddForm({})
      load()
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add school')
    } finally {
      setAdding(false)
    }
  }

  const filtered = filter
    ? rows.filter(r => r.display_name.toLowerCase().includes(filter.toLowerCase()))
    : rows

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 shrink-0">
        <input
          type="search"
          placeholder="Filter schools…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded px-2.5 py-1 w-48 focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
        <span className="text-xs text-slate-400 ml-1">{filtered.length} schools</span>
        <button
          onClick={() => { setShowAdd(true); setAddForm({}); setAddError(null) }}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700"
        >
          <span className="text-base leading-none">+</span> Add School
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="text-xs border-collapse w-max min-w-full">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                {COLUMNS.map((col, i) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap ${i === 0 ? 'sticky left-0 z-20 bg-slate-50' : ''}`}
                    style={{ minWidth: col.width, maxWidth: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, ri) => (
                <tr key={row.id} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  {COLUMNS.map((col, ci) => {
                    const cellKey    = `${row.id}_${col.key}`
                    const isEditing  = editCell === cellKey
                    const isSaving   = saving.has(cellKey)
                    const flashState = flash[cellKey]
                    const dispVal    = displayValue(row, col)

                    const cfKey     = `${row.id}:${col.key}`
                    const isCantFind = col.type !== 'readonly' && cantFind.has(cfKey) && !dispVal

                    const baseCls = `px-3 py-1.5 border-b border-slate-100 ${ci === 0 ? 'sticky left-0 z-10 font-medium text-slate-800' : 'text-slate-600 cursor-pointer'}`
                    const rowBg   = ci === 0 ? (ri % 2 === 0 ? 'bg-white' : 'bg-slate-50') : ''
                    const flashCls = flashState === 'ok'  ? 'bg-green-50 !text-green-700' :
                                     flashState === 'err' ? 'bg-red-50 !text-red-600'     :
                                     isCantFind           ? 'bg-amber-50'                 : ''
                    const savingCls = isSaving ? 'opacity-50' : ''

                    if (col.type === 'readonly') {
                      const pctCls = col.key !== 'grade_pct' || !row.roster_count ? ''
                        : row.graded_count / row.roster_count >= 0.8 ? 'tabular-nums !text-green-700'
                        : row.graded_count / row.roster_count >= 0.4 ? 'tabular-nums !text-amber-700'
                        : 'tabular-nums !text-red-600'
                      const activeCls = col.key !== 'active' ? '' : row.active ? '!text-green-700' : '!text-slate-400'
                      return (
                        <td key={col.key} className={`${baseCls} ${rowBg} ${pctCls} ${activeCls}`} style={{ minWidth: col.width, maxWidth: col.width }}>
                          {dispVal || <span className="text-slate-300">—</span>}
                        </td>
                      )
                    }

                    if (isEditing) {
                      if (DROPDOWN_TYPES.has(col.type)) {
                        const opts = col.type === 'district'    ? options.districts.map(d => ({ id: String(d.id), label: d.name }))
                                   : col.type === 'region'      ? options.regions.map(r => ({ id: String(r.id), label: r.name }))
                                   : col.type === 'conference'  ? options.conferences.map(c => ({ id: c, label: c }))
                                   : col.type === 'group'       ? options.groups.map(g => ({ id: g, label: g }))
                                   : options.sections.map(s => ({ id: s, label: s }))
                        return (
                          <td key={col.key} className={`${baseCls} ${rowBg} !p-0`} style={{ minWidth: col.width }}>
                            <select
                              ref={inputRef as React.RefObject<HTMLSelectElement>}
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => save(row, col, editValue)}
                              className="w-full px-2 py-1.5 text-xs border-0 bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400"
                            >
                              <option value="">— clear —</option>
                              {opts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                            </select>
                          </td>
                        )
                      }
                      return (
                        <td key={col.key} className={`${baseCls} ${rowBg} !p-0`} style={{ minWidth: col.width }}>
                          <input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            type={col.type === 'email' ? 'email' : 'text'}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => save(row, col, editValue)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') save(row, col, editValue)
                              if (e.key === 'Escape') setEditCell(null)
                            }}
                            className="w-full px-3 py-1.5 text-xs border-0 bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400"
                            style={{ minWidth: col.width }}
                          />
                        </td>
                      )
                    }

                    return (
                      <td
                        key={col.key}
                        className={`${baseCls} ${rowBg} ${flashCls} ${savingCls} hover:bg-blue-50/60`}
                        style={{ minWidth: col.width, maxWidth: col.width }}
                        onClick={() => { startEdit(row, col); setEditValue(String(row[col.key as keyof SchoolRow] ?? '')) }}
                      >
                        {isSaving ? (
                          <span className="text-slate-300 italic">saving…</span>
                        ) : dispVal ? (
                          <span className="block truncate">{dispVal}</span>
                        ) : isCantFind ? (
                          <span className="text-amber-400 text-[10px]" title="Looked — couldn't find">searched</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add School Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Add School</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Required */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">School Name *</label>
                <input
                  type="text"
                  value={addForm.display_name ?? ''}
                  onChange={e => setAddForm(p => ({ ...p, display_name: e.target.value }))}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="e.g. Collingswood"
                />
              </div>

              {/* Constrained fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">District</label>
                  <select
                    value={addForm.district_id ?? ''}
                    onChange={e => setAddForm(p => ({ ...p, district_id: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="">—</option>
                    {options.districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Region</label>
                  <select
                    value={addForm.region_id ?? ''}
                    onChange={e => setAddForm(p => ({ ...p, region_id: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="">—</option>
                    {options.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Group</label>
                  <select
                    value={addForm.classification ?? ''}
                    onChange={e => setAddForm(p => ({ ...p, classification: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="">—</option>
                    {options.groups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Section</label>
                  <select
                    value={addForm.section ?? ''}
                    onChange={e => setAddForm(p => ({ ...p, section: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="">—</option>
                    {options.sections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Conference</label>
                  <select
                    value={addForm.conference ?? ''}
                    onChange={e => setAddForm(p => ({ ...p, conference: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="">—</option>
                    {options.conferences.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Free-text fields */}
              {[
                { key: 'coach_name',     label: 'Coach Name' },
                { key: 'coach_email',    label: 'Coach Email' },
                { key: 'ad_name',        label: 'AD Name' },
                { key: 'ad_email',       label: 'AD Email' },
                { key: 'address',        label: 'Address' },
                { key: 'website_url',    label: 'Website' },
                { key: 'twitter_handle', label: 'Twitter' },
                { key: 'facebook_url',   label: 'Facebook' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={addForm[f.key] ?? ''}
                    onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              ))}

              {addError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{addError}</p>}
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex gap-3 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50">Cancel</button>
              <button
                disabled={adding}
                onClick={submitAddSchool}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg bg-slate-900 hover:bg-slate-700 disabled:opacity-50"
              >
                {adding ? 'Adding…' : 'Add School'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
