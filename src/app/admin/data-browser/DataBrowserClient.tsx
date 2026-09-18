'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

type ColInfo = {
  column_name: string
  data_type:   string
  is_nullable: boolean
  is_pk:       boolean
  fk_table:    string | null
  fk_column:   string | null
}

type FkOption = { id: string | number; label: string }

type EditingCell = { rowIdx: number; pkVal: string | number; col: string }

// ── Helpers ────────────────────────────────────────────────────────────────────

function displayValue(val: unknown, col: ColInfo, fkMap: Map<string, FkOption[]>): string {
  if (val === null || val === undefined) return ''
  if (col.fk_table) {
    const opts = fkMap.get(col.column_name)
    const match = opts?.find(o => String(o.id) === String(val))
    if (match) return match.label
    return String(val).slice(0, 8) + '…'
  }
  if (col.data_type === 'boolean') return val ? 'true' : 'false'
  if (col.data_type === 'jsonb' || typeof val === 'object') return JSON.stringify(val).slice(0, 60)
  const s = String(val)
  return s.length > 60 ? s.slice(0, 60) + '…' : s
}

function coerce(val: string, dataType: string): unknown {
  if (val === '') return null
  if (dataType === 'boolean') return val === 'true'
  if (['integer', 'bigint', 'smallint'].includes(dataType)) return parseInt(val, 10)
  if (['numeric', 'real', 'double precision'].includes(dataType)) return parseFloat(val)
  if (dataType === 'jsonb') {
    try { return JSON.parse(val) } catch { return val }
  }
  return val
}

function pkColOf(schema: ColInfo[]): ColInfo | undefined {
  return schema.find(c => c.is_pk)
}

// ── Cell editor ────────────────────────────────────────────────────────────────

function CellEditor({
  col, value, fkOpts, onCommit, onCancel,
}: {
  col:      ColInfo
  value:    string
  fkOpts:   FkOption[]
  onCommit: (v: string) => void
  onCancel: () => void
}) {
  const [v, setV] = useState(value)
  const ref = useRef<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  const commit = () => onCommit(v)
  const onKey  = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && col.data_type !== 'jsonb') commit()
    if (e.key === 'Escape') onCancel()
  }

  if (col.fk_table && fkOpts.length > 0) {
    return (
      <select
        ref={ref as React.Ref<HTMLSelectElement>}
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        className="w-full text-xs border border-blue-400 rounded px-1 py-0.5 bg-white"
      >
        <option value="">— null —</option>
        {fkOpts.map(o => (
          <option key={String(o.id)} value={String(o.id)}>{o.label}</option>
        ))}
      </select>
    )
  }

  if (col.data_type === 'boolean') {
    return (
      <select
        ref={ref as React.Ref<HTMLSelectElement>}
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        className="w-full text-xs border border-blue-400 rounded px-1 py-0.5 bg-white"
      >
        {col.is_nullable && <option value="">— null —</option>}
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    )
  }

  if (col.data_type === 'jsonb') {
    return (
      <div className="flex flex-col gap-1">
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          value={v}
          onChange={e => setV(e.target.value)}
          onKeyDown={onKey}
          rows={3}
          className="w-full text-xs border border-blue-400 rounded px-1 py-0.5 font-mono bg-white"
        />
        <div className="flex gap-1">
          <button onClick={commit} className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded">Save</button>
          <button onClick={onCancel} className="text-xs px-2 py-0.5 bg-slate-200 rounded">Cancel</button>
        </div>
      </div>
    )
  }

  const inputType =
    ['integer','bigint','smallint','numeric','real','double precision'].includes(col.data_type) ? 'number' :
    col.data_type.startsWith('timestamp') ? 'datetime-local' :
    col.data_type === 'date'              ? 'date' :
    'text'

  return (
    <input
      ref={ref as React.Ref<HTMLInputElement>}
      type={inputType}
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={onKey}
      className="w-full text-xs border border-blue-400 rounded px-1 py-0.5 bg-white"
    />
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DataBrowserClient() {
  const [tables,     setTables]     = useState<string[]>([])
  const [table,      setTable]      = useState('')
  const [schema,     setSchema]     = useState<ColInfo[]>([])
  const [rows,       setRows]       = useState<Record<string, unknown>[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(0)
  const [sortCol,    setSortCol]    = useState('id')
  const [sortDir,    setSortDir]    = useState<'asc' | 'desc'>('asc')
  const [search,     setSearch]     = useState('')
  const [searchInput,setSearchInput]= useState('')
  const [loading,    setLoading]    = useState(false)
  const [editing,    setEditing]    = useState<EditingCell | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [flash,      setFlash]      = useState<{ msg: string; ok: boolean } | null>(null)
  const [fkCache,    setFkCache]    = useState<Map<string, FkOption[]>>(new Map())

  // Load table list
  useEffect(() => {
    fetch('/api/admin/data-browser/tables')
      .then(r => r.json())
      .then(d => setTables(d.tables ?? []))
  }, [])

  // Load schema when table changes
  useEffect(() => {
    if (!table) return
    setSchema([])
    setRows([])
    setTotal(0)
    setPage(0)
    setEditing(null)
    setFkCache(new Map())
    setSortDir('asc')
    fetch(`/api/admin/data-browser/schema?table=${encodeURIComponent(table)}`)
      .then(r => r.json())
      .then(d => {
        const cols: ColInfo[] = d.schema ?? []
        setSchema(cols)
        // Default sort to the PK column; fall back to first column
        const pk = cols.find(c => c.is_pk)
        setSortCol(pk?.column_name ?? cols[0]?.column_name ?? 'id')
      })
  }, [table])

  // Load rows
  const loadRows = useCallback(async (tbl: string, pg: number, col: string, dir: string, srch: string) => {
    if (!tbl) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        table: tbl, page: String(pg), sort: col, dir, search: srch,
      })
      const r = await fetch(`/api/admin/data-browser/rows?${params}`)
      const d = await r.json()
      if (d.error) { setFlash({ msg: d.error, ok: false }); return }
      setRows(d.rows ?? [])
      setTotal(d.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (table && schema.length > 0) loadRows(table, page, sortCol, sortDir, search)
  }, [table, schema, page, sortCol, sortDir, search, loadRows])

  // Preload FK options for all FK columns
  useEffect(() => {
    if (!schema.length) return
    const fkCols = schema.filter(c => c.fk_table)
    for (const col of fkCols) {
      if (fkCache.has(col.column_name)) continue
      fetch(`/api/admin/data-browser/fk-options?table=${encodeURIComponent(col.fk_table!)}`)
        .then(r => r.json())
        .then(d => {
          setFkCache(prev => {
            const next = new Map(prev)
            next.set(col.column_name, d.options ?? [])
            return next
          })
        })
    }
  }, [schema]) // eslint-disable-line react-hooks/exhaustive-deps

  const pkCol = pkColOf(schema)
  const pageSize = 50
  const pageCount = Math.ceil(total / pageSize)

  function handleSort(col: string) {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
    setPage(0)
  }

  function startEdit(rowIdx: number, col: ColInfo, row: Record<string, unknown>) {
    if (col.is_pk) return
    if (!pkCol) return
    setEditing({ rowIdx, pkVal: row[pkCol.column_name] as string | number, col: col.column_name })
  }

  async function commitEdit(newValStr: string) {
    if (!editing || !pkCol) return
    const col = schema.find(c => c.column_name === editing.col)!
    const oldValue = rows[editing.rowIdx][editing.col]
    const newValue = coerce(newValStr, col.data_type)

    setSaving(true)
    setEditing(null)
    try {
      const r = await fetch('/api/admin/data-browser/row', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table, pkCol: pkCol.column_name, pkVal: editing.pkVal,
          column: editing.col, newValue, oldValue,
        }),
      })
      const d = await r.json()
      if (d.error) {
        setFlash({ msg: d.error, ok: false })
      } else {
        // Update row in place
        setRows(prev => prev.map((row, i) =>
          i === editing.rowIdx ? { ...row, [editing.col]: newValue } : row
        ))
        setFlash({ msg: 'Saved', ok: true })
        setTimeout(() => setFlash(null), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteRow(rowIdx: number) {
    if (!pkCol) return
    const pkVal = rows[rowIdx][pkCol.column_name]
    if (!window.confirm(`Delete this ${table} row (${pkCol.column_name}: ${pkVal})?`)) return

    setSaving(true)
    try {
      const r = await fetch('/api/admin/data-browser/row', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, pkCol: pkCol.column_name, pkVal }),
      })
      const d = await r.json()
      if (d.error) {
        setFlash({ msg: d.error, ok: false })
      } else {
        setRows(prev => prev.filter((_, i) => i !== rowIdx))
        setTotal(t => t - 1)
        setFlash({ msg: 'Deleted', ok: true })
        setTimeout(() => setFlash(null), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(0)
  }

  const visibleCols = schema.filter(c => !['jsonb'].includes(c.data_type) || schema.length <= 6)

  return (
    <div className="p-6 max-w-full">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Data Browser</h1>

      {/* Table picker */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={table}
          onChange={e => { setTable(e.target.value); setSearch(''); setSearchInput('') }}
          className="border border-slate-300 rounded px-3 py-1.5 text-sm bg-white min-w-52"
        >
          <option value="">— Select a table —</option>
          {tables.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {table && (
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-52 bg-white"
            />
            <button type="submit" className="px-3 py-1.5 bg-slate-900 text-white text-sm rounded">
              Search
            </button>
            {search && (
              <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(0) }}
                className="px-3 py-1.5 border border-slate-300 text-sm rounded">
                Clear
              </button>
            )}
          </form>
        )}

        {flash && (
          <span className={`text-sm font-medium ${flash.ok ? 'text-green-600' : 'text-red-600'}`}>
            {flash.msg}
          </span>
        )}
        {saving && <span className="text-sm text-slate-500">Saving…</span>}
      </div>

      {/* Table info */}
      {table && !loading && (
        <p className="text-xs text-slate-500 mb-3">
          {total.toLocaleString()} rows
          {search && ` matching "${search}"`}
          {' · '}page {page + 1} of {Math.max(1, pageCount)}
          {' · '}click a cell to edit
        </p>
      )}

      {/* Data table */}
      {table && schema.length > 0 && (
        <div className="overflow-x-auto border border-slate-200 rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                {visibleCols.map(col => (
                  <th
                    key={col.column_name}
                    onClick={() => handleSort(col.column_name)}
                    className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none"
                  >
                    {col.column_name}
                    {col.is_pk && <span className="ml-1 text-amber-500 text-[10px]">PK</span>}
                    {col.fk_table && <span className="ml-1 text-blue-400 text-[10px]">FK</span>}
                    {sortCol === col.column_name && (
                      <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={visibleCols.length + 1} className="px-3 py-8 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + 1} className="px-3 py-8 text-center text-slate-400">
                    No rows found
                  </td>
                </tr>
              ) : rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-50">
                  {visibleCols.map(col => {
                    const isEditing = editing?.rowIdx === rowIdx && editing?.col === col.column_name
                    const rawVal    = row[col.column_name]

                    return (
                      <td
                        key={col.column_name}
                        className={`px-3 py-1.5 align-top max-w-xs ${
                          col.is_pk ? 'text-slate-400' : 'cursor-pointer hover:bg-blue-50'
                        }`}
                        onClick={() => !isEditing && !col.is_pk && startEdit(rowIdx, col, row)}
                        title={rawVal != null ? String(rawVal) : ''}
                      >
                        {isEditing ? (
                          <CellEditor
                            col={col}
                            value={rawVal != null ? String(rawVal) : ''}
                            fkOpts={fkCache.get(col.column_name) ?? []}
                            onCommit={commitEdit}
                            onCancel={() => setEditing(null)}
                          />
                        ) : (
                          <span className={rawVal == null ? 'text-slate-300 italic' : ''}>
                            {rawVal == null ? 'null' : displayValue(rawVal, col, fkCache)}
                          </span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-3 py-1.5 align-top">
                    <div className="flex items-center gap-2">
                      {table === 'schools' && pkCol && (
                        <a
                          href={`/admin/schools/${row[pkCol.column_name]}`}
                          className="text-blue-600 hover:text-blue-800 text-[10px] font-medium px-2 py-0.5 border border-blue-200 rounded hover:border-blue-400 transition-colors"
                        >
                          Edit profile
                        </a>
                      )}
                      <button
                        onClick={() => deleteRow(rowIdx)}
                        className="text-red-500 hover:text-red-700 text-[10px] font-medium px-2 py-0.5 border border-red-200 rounded hover:border-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {table && pageCount > 1 && (
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-600">
            Page {page + 1} / {pageCount}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-50"
          >
            Next →
          </button>
        </div>
      )}

      {!table && (
        <p className="text-sm text-slate-400 mt-8">Select a table above to browse and edit its rows.</p>
      )}
    </div>
  )
}
