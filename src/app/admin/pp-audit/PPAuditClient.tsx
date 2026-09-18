'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import type { PPAuditData, SchoolCount } from '@/app/api/admin/pp-audit/route'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

const OVERRIDES_KEY = 'mw_pp_overrides'

// Known name mappings: PP doc name → DB display_name fragment to resolve automatically
const AUTO_OVERRIDES: Record<string, string> = {
  'St. Joseph (Hamm.)':         "St. Joseph's (Hammonton)",
  'St. Joseph (Met.)':          'St. Joseph Metuchen',
  'St. Joseph (Mont.)':         'St Joseph (Montvale) HS',
  'Delbarton':                  'Delbarton School',
  'Pope John':                  'Pope John XXIII',
  'DePaul':                     'Depaul Catholic',
  'St. Thomas Aquinas':         'Saint Thomas Aquinas',
  'Holy Cross Prep':            'Holy Cross',
  'St. Mary (Ruth.)':           'St. Mary High School (Rutherford)',
  'St. John Vianney':           'Saint John Vianney',
  "St. Benedict's":             "St. Benedict's Prep",
  "St. Peter's Prep":           "St. Peter's Prep",
  'Gateway':                    'Gateway Reg/ Woodbury',
  'Pinelands':                  'Pinelands Regional',
  'Lodi':                       'Lodi/Saddle Brook',
  'Gov. Livingston':            'Governor Livingston',
  'Central Jersey College Charter': 'Central Jersey College Prep',
  'Ridgefield Park':            'Ridgefield Park/Bogota',
  'Monmouth':                   'Monmouth Regional',
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

function loadManualOverrides(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '{}') } catch { return {} }
}
function saveManualOverrides(o: Record<string, number>) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o))
}

type Filter = 'all' | 'missing' | 'over' | 'unmatched'
type SortCol = 'name' | 'section' | 'ppTotal' | 'imported' | 'gap'

function gapBadge(gap: number) {
  if (gap >= 5)  return 'bg-red-100 text-red-700 font-semibold'
  if (gap >= 3)  return 'bg-orange-100 text-orange-700 font-semibold'
  if (gap >= 1)  return 'bg-amber-100 text-amber-700'
  if (gap === 0) return 'bg-green-50 text-green-700'
  if (gap > -3)  return 'bg-slate-100 text-slate-500'
  return 'bg-violet-100 text-violet-700'
}

// Inline school search for unmatched rows
function SchoolPicker({
  schools,
  onPick,
}: {
  schools: SchoolCount[]
  onPick: (school: SchoolCount) => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!q.trim()) return []
    const n = normalize(q)
    return schools
      .filter(s => normalize(s.displayName).includes(n))
      .slice(0, 8)
  }, [q, schools])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={q}
        placeholder="Search DB schools…"
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className="w-48 border border-amber-300 bg-amber-50 px-2 py-1 text-xs focus:outline-none focus:border-amber-500 rounded"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-white border border-slate-200 shadow-lg rounded max-h-52 overflow-y-auto">
          {filtered.map(s => (
            <button
              key={s.id}
              onClick={() => { onPick(s); setQ(''); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0"
            >
              <span className="font-medium text-slate-800">{s.displayName}</span>
              <span className="ml-2 text-slate-400">#{s.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function PPAuditClient() {
  const { gender } = useAdminGender()
  const [apiData, setApiData] = useState<PPAuditData | null>(null)
  const [error, setError]   = useState<string | null>(null)
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<SortCol>('gap')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)

  useEffect(() => {
    setManualOverrides(loadManualOverrides())
    fetch(`/api/admin/pp-audit?gender=${gender}`)
      .then(r => r.json())
      .then((d: PPAuditData) => setApiData(d))
      .catch(e => setError(String(e)))
  }, [gender])

  // Build school lookup by normalized name
  const schoolByNorm = useMemo(() => {
    const m = new Map<string, SchoolCount>()
    for (const s of apiData?.schools ?? []) m.set(normalize(s.displayName), s)
    return m
  }, [apiData])

  const schoolById = useMemo(() => {
    const m = new Map<number, SchoolCount>()
    for (const s of apiData?.schools ?? []) m.set(s.id, s)
    return m
  }, [apiData])

  function resolveSchool(ppName: string): SchoolCount | null {
    // 1. Manual override by school_id
    const mid = manualOverrides[ppName]
    if (mid != null) return schoolById.get(mid) ?? null
    // 2. Auto override by known display_name mapping
    const autoName = AUTO_OVERRIDES[ppName]
    if (autoName) {
      const found = schoolByNorm.get(normalize(autoName))
      if (found) return found
    }
    // 3. Exact normalized name match
    return schoolByNorm.get(normalize(ppName)) ?? null
  }

  const rows = useMemo(() => {
    return (apiData?.entries ?? []).map(e => {
      const school  = resolveSchool(e.name)
      const imported = school?.count ?? 0
      const gap      = e.total - imported
      return { ...e, school, imported, gap }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiData, manualOverrides, schoolByNorm, schoolById])

  const stats = useMemo(() => {
    const missing   = rows.filter(r => r.gap > 0 && r.school)
    const over      = rows.filter(r => r.gap < 0 && r.school)
    const unmatched = rows.filter(r => !r.school)
    return {
      missingCount: missing.length,
      missingTotal: missing.reduce((s, r) => s + r.gap, 0),
      overCount:    over.length,
      unmatched:    unmatched.length,
    }
  }, [rows])

  const filtered = useMemo(() => {
    let r = rows
    if (filter === 'missing')   r = r.filter(x => x.gap > 0 && x.school)
    if (filter === 'over')      r = r.filter(x => x.gap < 0 && x.school)
    if (filter === 'unmatched') r = r.filter(x => !x.school)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(x => x.name.toLowerCase().includes(q) || x.section.toLowerCase().includes(q))
    }
    return [...r].sort((a, b) => {
      if (sortCol === 'name')     return sortDir * a.name.localeCompare(b.name)
      if (sortCol === 'section')  return sortDir * a.section.localeCompare(b.section)
      if (sortCol === 'ppTotal')  return sortDir * (b.total - a.total)
      if (sortCol === 'imported') return sortDir * (b.imported - a.imported)
      return sortDir * (b.gap - a.gap)
    })
  }, [rows, filter, search, sortCol, sortDir])

  function handlePick(ppName: string, school: SchoolCount) {
    const next = { ...manualOverrides, [ppName]: school.id }
    setManualOverrides(next)
    saveManualOverrides(next)
  }

  function handleClearOverride(ppName: string) {
    const next = { ...manualOverrides }
    delete next[ppName]
    setManualOverrides(next)
    saveManualOverrides(next)
  }

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 1 ? -1 : 1)
    else { setSortCol(col); setSortDir(col === 'name' || col === 'section' ? 1 : -1) }
  }

  function sortArrow(col: SortCol) {
    return sortCol === col ? <span className="ml-1 opacity-50">{sortDir === 1 ? '↑' : '↓'}</span> : null
  }

  if (error) return <p className="text-sm text-red-600">Error: {error}</p>
  if (!apiData) return <p className="text-sm text-slate-400">Loading…</p>

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Schools missing meets', val: stats.missingCount, cls: 'text-red-600' },
          { label: 'Total meets to import', val: stats.missingTotal, cls: 'text-red-600' },
          { label: 'Schools over PP total',  val: stats.overCount,   cls: 'text-violet-600' },
          { label: 'Unmatched in DB',        val: stats.unmatched,   cls: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 px-4 py-3">
            <div className={`text-2xl font-bold tabular-nums tracking-tight ${s.cls}`}>{s.val}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1.5 flex-wrap">
          {(['all','missing','over','unmatched'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-800'
              }`}
            >
              {f === 'all' ? `All (${rows.length})` : f === 'missing' ? `Missing (${stats.missingCount})` : f === 'over' ? `Over PP (${stats.overCount})` : `Unmatched (${stats.unmatched})`}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto border border-slate-300 px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-slate-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {([['name','School (PP doc)'],['section','Section'],['ppTotal','PP Total'],['imported','Imported'],['gap','Gap']] as [SortCol,string][]).map(([col, label]) => (
                <th
                  key={col}
                  onClick={() => toggleSort(col)}
                  className={`px-4 py-2.5 cursor-pointer select-none whitespace-nowrap hover:text-slate-800 text-left ${col !== 'name' && col !== 'section' ? 'text-right' : ''}`}
                >
                  {label}{sortArrow(col)}
                </th>
              ))}
              <th className="px-4 py-2.5 text-left whitespace-nowrap">DB School</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">No results</td></tr>
            )}
            {filtered.map((row, i) => {
              const isManual = manualOverrides[row.name] != null
              return (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-800 whitespace-nowrap">{row.name}</td>
                  <td className="px-4 py-2 text-slate-400 text-xs whitespace-nowrap">{row.section}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                    {row.total}
                    <span className="ml-1.5 text-xs text-slate-400">({row.record})</span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                    {row.school ? row.imported : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {row.school
                      ? <span className={`inline-block px-2 py-0.5 rounded text-xs tabular-nums ${gapBadge(row.gap)}`}>
                          {row.gap > 0 ? `+${row.gap}` : row.gap}
                        </span>
                      : <span className="text-xs text-amber-500">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    {row.school ? (
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{row.school.displayName}</span>
                        {isManual && (
                          <button
                            onClick={() => handleClearOverride(row.name)}
                            className="text-xs text-slate-300 hover:text-red-500 transition-colors"
                            title="Remove manual match"
                          >×</button>
                        )}
                      </span>
                    ) : (
                      <SchoolPicker
                        schools={apiData.schools}
                        onPick={s => handlePick(row.name, s)}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">{filtered.length} of {rows.length} schools</p>
    </div>
  )
}
