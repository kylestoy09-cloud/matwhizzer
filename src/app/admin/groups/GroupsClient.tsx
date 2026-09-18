'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

type GroupType = 'conference' | 'section' | 'classification' | 'district' | 'region'
type ImportType = 'conference' | 'classification' | 'district' | 'region'

type GroupItem   = { id: string; label: string; count: number }
type SchoolRow   = { id: number; display_name: string; short_name: string | null }
type SearchResult = { id: number; display_name: string }

const TYPE_LABELS: Record<GroupType, string> = {
  conference:     'Conference',
  section:        'Section',
  classification: 'Group',
  district:       'District',
  region:         'Region',
}

const IMPORT_TYPE_LABELS: Record<ImportType, string> = {
  conference:     'Conference',
  classification: 'Group (Classification)',
  district:       'District',
  region:         'Region',
}

const IMPORT_FORMAT_HINTS: Record<ImportType, string> = {
  conference:
`Olympic American
Cherry Hill East
Lenape

Olympic National
Southern Regional
Shawnee`,
  classification:
`5
Cherry Hill East
Lenape
Kingsway

4
Shawnee
Clearview`,
  district:
`District 1
School Name
School Name

District 2
School Name`,
  region:
`Region 9
School Name
School Name

Region 10
School Name`,
}

// ── Parse paste text into { header, schoolNames[] } blocks ───────────────────

type ParsedBlock = { header: string; schoolNames: string[] }

function parsePaste(text: string): ParsedBlock[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const blocks: ParsedBlock[] = []
  let current: ParsedBlock | null = null

  for (const line of lines) {
    // A line with no leading digits and no school-like punctuation → treat as header
    // Heuristic: if it's the first line or blank-separated from last block, it's a header
    const isHeader = current === null || current.schoolNames.length > 0
      ? !line.match(/^\d+$/) && (blocks.length === 0 || current === null || current.schoolNames.length > 0)
      : false

    if (isHeader && (current === null || current.schoolNames.length > 0)) {
      current = { header: line, schoolNames: [] }
      blocks.push(current)
    } else if (current) {
      current.schoolNames.push(line)
    }
  }

  return blocks.filter(b => b.schoolNames.length > 0)
}

// Resolve a header string to a GroupItem id using the loaded items list
function resolveHeader(header: string, items: GroupItem[]): GroupItem | null {
  const h = header.toLowerCase().trim()
  // Try exact label match
  const exact = items.find(i => i.label.toLowerCase() === h)
  if (exact) return exact
  // Try stripping common prefixes: "district 1" → "1", "region 9" → "9"
  const stripped = h.replace(/^(district|region|group|conference)\s*/i, '').trim()
  const byStripped = items.find(i =>
    i.label.toLowerCase() === stripped ||
    i.id.toLowerCase() === stripped
  )
  if (byStripped) return byStripped
  // Try numeric match for district/region
  if (/^\d+$/.test(stripped)) {
    const byId = items.find(i => i.id === stripped)
    if (byId) return byId
  }
  return null
}

// ── BulkImportPanel ───────────────────────────────────────────────────────────

type MatchedRow = {
  header: string
  groupItem: GroupItem | null
  schoolName: string
  school: SearchResult | null
  searching: boolean
}

function BulkImportPanel({ gender, onDone }: { gender: 'M' | 'F'; onDone: () => void }) {
  const [importType, setImportType] = useState<ImportType>('conference')
  const [pasteText,  setPasteText]  = useState('')
  const [items,      setItems]      = useState<GroupItem[]>([])
  const [rows,       setRows]       = useState<MatchedRow[] | null>(null)
  const [resolving,  setResolving]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [msg,        setMsg]        = useState<string | null>(null)

  // Load group items for the selected import type
  useEffect(() => {
    setRows(null)
    setMsg(null)
    fetch(`/api/admin/school-groups?type=${importType}&gender=${gender}`)
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .catch(() => setItems([]))
  }, [importType, gender])

  async function handlePreview() {
    const blocks = parsePaste(pasteText)
    if (!blocks.length) { setMsg('No groups detected. Check format.'); return }

    setResolving(true)
    setMsg(null)

    // Build initial rows with group resolution
    const initial: MatchedRow[] = []
    for (const block of blocks) {
      const groupItem = resolveHeader(block.header, items)
      for (const schoolName of block.schoolNames) {
        initial.push({ header: block.header, groupItem, schoolName, school: null, searching: true })
      }
    }
    setRows(initial)

    // Resolve each unique school name
    const uniqueNames = [...new Set(initial.map(r => r.schoolName))]
    const nameToSchool = new Map<string, SearchResult | null>()

    await Promise.all(uniqueNames.map(async name => {
      try {
        const res = await fetch(`/api/admin/search-schools?q=${encodeURIComponent(name)}&limit=5`)
        const d = await res.json()
        const results: SearchResult[] = d.schools ?? []
        // Pick exact match first, then starts-with, then first result
        const exact = results.find(s => s.display_name.toLowerCase() === name.toLowerCase())
        const startsWith = results.find(s => s.display_name.toLowerCase().startsWith(name.toLowerCase().slice(0, 6)))
        nameToSchool.set(name, exact ?? startsWith ?? results[0] ?? null)
      } catch {
        nameToSchool.set(name, null)
      }
    }))

    setRows(prev => (prev ?? []).map(r => ({
      ...r,
      school: nameToSchool.get(r.schoolName) ?? null,
      searching: false,
    })))
    setResolving(false)
  }

  async function handleSave() {
    if (!rows) return
    const valid = rows.filter(r => r.groupItem && r.school)
    if (!valid.length) { setMsg('No valid assignments to save.'); return }

    setSaving(true)
    setMsg(null)
    try {
      const assignments = valid.map(r => ({
        school_id: r.school!.id,
        value: r.groupItem!.id,
      }))
      const res = await fetch('/api/admin/school-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: importType, gender, assignments }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setMsg(`✓ Saved ${d.inserted} assignments`)
      setPasteText('')
      setRows(null)
      onDone()
    } catch (e) {
      setMsg(`Error: ${String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  const readyRows  = rows?.filter(r => !r.searching) ?? []
  const matched    = readyRows.filter(r => r.groupItem && r.school).length
  const unmatched  = readyRows.filter(r => !r.groupItem || !r.school).length

  return (
    <div className="border border-slate-300 bg-slate-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Bulk Import</h3>
      </div>

      {/* Import type selector */}
      <div className="flex gap-1 flex-wrap">
        {(Object.keys(IMPORT_TYPE_LABELS) as ImportType[]).map(t => (
          <button
            key={t}
            onClick={() => { setImportType(t); setRows(null); setMsg(null) }}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              importType === t ? 'bg-black text-white' : 'border border-slate-300 text-slate-600 hover:bg-white'
            }`}
          >
            {IMPORT_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Format hint */}
      <details className="text-xs">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Show format example</summary>
        <pre className="mt-2 bg-white border border-slate-200 p-2 text-slate-600 text-[10px] leading-relaxed whitespace-pre-wrap">
          {IMPORT_FORMAT_HINTS[importType]}
        </pre>
      </details>

      {/* Paste area */}
      <textarea
        className="w-full h-48 text-xs font-mono border border-slate-300 p-3 focus:outline-none focus:ring-1 focus:ring-black resize-y bg-white"
        placeholder={`Paste ${IMPORT_TYPE_LABELS[importType]} assignments here…`}
        value={pasteText}
        onChange={e => { setPasteText(e.target.value); setRows(null); setMsg(null) }}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handlePreview}
          disabled={!pasteText.trim() || resolving}
          className="px-3 py-1.5 text-xs font-medium border border-black hover:bg-slate-100 disabled:opacity-40 transition-colors"
        >
          {resolving ? 'Resolving…' : 'Preview'}
        </button>
        {rows && !resolving && matched > 0 && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving…' : `Save ${matched} assignment${matched !== 1 ? 's' : ''}${unmatched > 0 ? ` (${unmatched} skipped)` : ''}`}
          </button>
        )}
        {msg && (
          <span className={`text-xs ${msg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
            {msg}
          </span>
        )}
      </div>

      {/* Preview table */}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-200 bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-slate-500">{IMPORT_TYPE_LABELS[importType]}</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-500">Pasted Name</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-500">Matched School</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-500 w-20">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => {
                const ok = r.groupItem && r.school && !r.searching
                const warn = !r.searching && (!r.groupItem || !r.school)
                return (
                  <tr key={i} className={warn ? 'bg-amber-50' : ''}>
                    <td className="px-3 py-1.5 text-slate-700">
                      {r.groupItem ? r.groupItem.label : <span className="text-amber-600">{r.header} (?)</span>}
                    </td>
                    <td className="px-3 py-1.5 text-slate-500">{r.schoolName}</td>
                    <td className="px-3 py-1.5 text-slate-800">
                      {r.searching ? (
                        <span className="text-slate-300">searching…</span>
                      ) : r.school ? (
                        r.school.display_name
                      ) : (
                        <span className="text-amber-600">No match</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      {r.searching ? (
                        <span className="text-slate-300 text-[10px]">…</span>
                      ) : ok ? (
                        <span className="text-[10px] font-semibold text-green-700">✓</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-600">Skip</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main GroupsClient ─────────────────────────────────────────────────────────

export function GroupsClient() {
  const { gender } = useAdminGender()
  const [type,          setType]          = useState<GroupType>('conference')
  const [items,         setItems]         = useState<GroupItem[]>([])
  const [selected,      setSelected]      = useState<GroupItem | null>(null)
  const [schools,       setSchools]       = useState<SchoolRow[]>([])
  const [loadingList,   setLoadingList]   = useState(false)
  const [loadingSchools,setLoadingSchools]= useState(false)
  const [mutating,      setMutating]      = useState<number | null>(null)
  const [flash,         setFlash]         = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [showImport,    setShowImport]    = useState(false)

  // Search state
  const [query,      setQuery]      = useState('')
  const [searchRes,  setSearchRes]  = useState<SearchResult[]>([])
  const [searching,  setSearching]  = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadList = useCallback(() => {
    setSelected(null)
    setSchools([])
    setFlash(null)
    setLoadingList(true)
    fetch(`/api/admin/school-groups?type=${type}&gender=${gender}`)
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoadingList(false))
  }, [type, gender])

  useEffect(() => { loadList() }, [loadList])

  function selectItem(item: GroupItem) {
    setSelected(item)
    setFlash(null)
    setQuery('')
    setSearchRes([])
    setLoadingSchools(true)
    fetch(`/api/admin/school-groups?type=${type}&value=${encodeURIComponent(item.id)}&gender=${gender}`)
      .then(r => r.json())
      .then(d => setSchools(d.schools ?? []))
      .catch(() => setSchools([]))
      .finally(() => setLoadingSchools(false))
  }

  async function mutate(school_id: number, action: 'add' | 'remove') {
    if (!selected) return
    setMutating(school_id)
    setFlash(null)
    try {
      const res = await fetch('/api/admin/school-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value: selected.id, school_id, action, gender }),
      })
      const d = await res.json()
      if (!res.ok || d.error) {
        setFlash({ kind: 'err', msg: d.error ?? 'Failed' })
      } else {
        if (action === 'remove') {
          setSchools(prev => prev.filter(s => s.id !== school_id))
          setItems(prev => prev.map(i => i.id === selected.id ? { ...i, count: i.count - 1 } : i))
        } else {
          const added = searchRes.find(s => s.id === school_id)
          if (added) {
            setSchools(prev =>
              [...prev, { id: added.id, display_name: added.display_name, short_name: null }]
                .sort((a, b) => a.display_name.localeCompare(b.display_name))
            )
            setItems(prev => prev.map(i => i.id === selected.id ? { ...i, count: i.count + 1 } : i))
          }
          setQuery('')
          setSearchRes([])
        }
        setFlash({ kind: 'ok', msg: action === 'add' ? 'School added' : 'School removed' })
      }
    } finally {
      setMutating(null)
    }
  }

  function handleSearchChange(val: string) {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) { setSearchRes([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/admin/search-schools?q=${encodeURIComponent(val)}&limit=10`)
        const d = await res.json()
        const memberIds = new Set(schools.map(s => s.id))
        setSearchRes((d.schools ?? []).filter((s: SearchResult) => !memberIds.has(s.id)))
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  const prog = gender === 'F' ? 'Girls' : 'Boys'

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{prog} Program</p>
        <button
          onClick={() => setShowImport(v => !v)}
          className="px-3 py-1.5 text-xs font-medium border border-black hover:bg-slate-50 transition-colors"
        >
          {showImport ? 'Cancel import' : '+ Bulk import'}
        </button>
      </div>

      {/* Bulk import panel */}
      {showImport && (
        <BulkImportPanel
          gender={gender}
          onDone={() => { setShowImport(false); loadList() }}
        />
      )}

      {/* Browse UI */}
      <div className="flex gap-6">
        {/* ── Left panel ─────────────────────────────────────────────────────── */}
        <div className="w-56 shrink-0">
          <div className="flex gap-1 flex-wrap mb-4">
            {(Object.keys(TYPE_LABELS) as GroupType[]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-2.5 py-1 text-xs rounded font-medium ${type === t ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {loadingList ? (
            <p className="text-xs text-slate-400">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-slate-400">No {TYPE_LABELS[type].toLowerCase()}s found for {prog}.</p>
          ) : (
            <ul className="space-y-0.5">
              {items.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => selectItem(item)}
                    className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between gap-2 ${
                      selected?.id === item.id
                        ? 'bg-slate-900 text-white'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className={`text-xs shrink-0 tabular-nums ${selected?.id === item.id ? 'text-slate-300' : 'text-slate-400'}`}>
                      {item.count}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Right panel ────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <p className="text-sm text-slate-400 pt-2">
              Select a {TYPE_LABELS[type].toLowerCase()} on the left to view and edit its schools.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-900">{selected.label}</h2>
                {flash && (
                  <span className={`text-xs px-2 py-1 rounded ${flash.kind === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {flash.msg}
                  </span>
                )}
              </div>

              {/* Add school search */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    value={query}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder={`Add a school to ${selected.label}…`}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  {searching && (
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">searching…</span>
                  )}
                </div>
                {searchRes.length > 0 && (
                  <ul className="border border-slate-200 rounded mt-1 divide-y divide-slate-100 bg-white shadow-sm">
                    {searchRes.map(s => (
                      <li key={s.id} className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm text-slate-800">{s.display_name}</span>
                        <button
                          onClick={() => mutate(s.id, 'add')}
                          disabled={mutating === s.id}
                          className="text-xs px-2 py-0.5 bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-40"
                        >
                          {mutating === s.id ? '…' : 'Add'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Current member schools */}
              {loadingSchools ? (
                <p className="text-sm text-slate-400">Loading schools…</p>
              ) : schools.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No {prog.toLowerCase()} schools assigned to this {TYPE_LABELS[type].toLowerCase()}.
                </p>
              ) : (
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">School</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">ID</th>
                        <th className="px-3 py-2 w-16" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schools.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">{s.display_name}</td>
                          <td className="px-3 py-2 text-slate-400 text-xs tabular-nums">{s.id}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => mutate(s.id, 'remove')}
                              disabled={mutating === s.id}
                              className="text-xs text-red-600 hover:text-red-800 disabled:opacity-40"
                            >
                              {mutating === s.id ? '…' : 'Remove'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
