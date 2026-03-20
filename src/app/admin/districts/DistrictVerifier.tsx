'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'

// ─── Types ─────────────────────────────────────────────────────────

interface District { id: number; name: string; region_id: number | null }
interface School { id: number; display_name: string; short_name: string | null }

interface SchoolRow {
  schoolId: number
  displayName: string
  abbreviation: string // current abbreviation alias, or empty
  dirty: boolean
}

// ─── Props ─────────────────────────────────────────────────────────

interface Props {
  districts: District[]
  allSchools: School[]
}

// ─── Main Component ────────────────────────────────────────────────

export function DistrictVerifier({ districts, allSchools }: Props) {
  const [selectedId, setSelectedId] = useState(1)
  const [rows, setRows] = useState<SchoolRow[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Load district schools ──────────────────────────────────────

  const loadDistrict = useCallback(async (districtId: number) => {
    setLoading(true)
    const supabase = createSupabaseBrowser()

    // Get schools in this district from school_districts (the authoritative list)
    const { data: sdRows } = await supabase
      .from('school_districts')
      .select('school_id')
      .eq('district_id', districtId)

    const schoolIds = (sdRows ?? []).map((r: { school_id: number }) => r.school_id)

    if (schoolIds.length === 0) {
      setRows([])
      setLoading(false)
      return
    }

    // Get school names
    const { data: schoolData } = await supabase
      .from('schools')
      .select('id, display_name')
      .in('id', schoolIds)

    const nameMap = new Map<number, string>()
    for (const s of (schoolData ?? []) as Array<{ id: number; display_name: string }>) {
      nameMap.set(s.id, s.display_name)
    }

    // Get existing abbreviation aliases
    const { data: aliasData } = await supabase
      .from('school_aliases')
      .select('school_id, alias')
      .in('school_id', schoolIds)
      .eq('alias_type', 'abbreviation')

    const aliasMap = new Map<number, string>()
    for (const a of (aliasData ?? []) as Array<{ school_id: number; alias: string }>) {
      // Take the first abbreviation found
      if (!aliasMap.has(a.school_id)) {
        aliasMap.set(a.school_id, a.alias)
      }
    }

    const schoolRows: SchoolRow[] = schoolIds.map(id => ({
      schoolId: id,
      displayName: nameMap.get(id) ?? `School ${id}`,
      abbreviation: aliasMap.get(id) ?? '',
      dirty: false,
    })).sort((a, b) => a.displayName.localeCompare(b.displayName))

    setRows(schoolRows)
    setLoading(false)
  }, [])

  useEffect(() => { loadDistrict(selectedId) }, [selectedId, loadDistrict])

  // ── Summary for sidebar ────────────────────────────────────────

  const [districtCounts, setDistrictCounts] = useState<Map<number, { total: number; hasAbbrev: number }>>(new Map())

  const loadSidebarCounts = useCallback(async () => {
    const supabase = createSupabaseBrowser()

    const { data: sdRows } = await supabase.from('school_districts').select('school_id, district_id')
    const { data: aliasRows } = await supabase.from('school_aliases').select('school_id').eq('alias_type', 'abbreviation')

    const hasAbbrev = new Set((aliasRows ?? []).map((r: { school_id: number }) => r.school_id))

    const counts = new Map<number, { total: number; hasAbbrev: number }>()
    for (const r of (sdRows ?? []) as Array<{ school_id: number; district_id: number }>) {
      const c = counts.get(r.district_id) ?? { total: 0, hasAbbrev: 0 }
      c.total++
      if (hasAbbrev.has(r.school_id)) c.hasAbbrev++
      counts.set(r.district_id, c)
    }
    setDistrictCounts(counts)
  }, [])

  useEffect(() => { loadSidebarCounts() }, [loadSidebarCounts])

  // ── Save abbreviation ──────────────────────────────────────────

  async function handleSave(schoolId: number, abbreviation: string, displayName: string) {
    const trimmed = abbreviation.trim().toUpperCase()
    if (!trimmed) { showToast('Enter an abbreviation', 'error'); return }

    const supabase = createSupabaseBrowser()

    // Check if this abbreviation already exists for a DIFFERENT school
    const { data: existing } = await supabase
      .from('school_aliases')
      .select('school_id, schools(display_name)')
      .eq('alias', trimmed)
      .eq('alias_type', 'abbreviation')

    type Ex = { school_id: number; schools: { display_name: string } | { display_name: string }[] | null }
    const other = ((existing ?? []) as unknown as Ex[]).find(e => e.school_id !== schoolId)
    if (other) {
      const otherName = Array.isArray(other.schools) ? other.schools[0]?.display_name : other.schools?.display_name
      if (!window.confirm(`⚠ "${trimmed}" is already used by ${otherName}. Add for ${displayName} too?`)) return
    }

    // Check if this school already has this alias
    const { data: selfAlias } = await supabase
      .from('school_aliases')
      .select('id')
      .eq('school_id', schoolId)
      .eq('alias', trimmed)

    if (!selfAlias || selfAlias.length === 0) {
      const { error } = await supabase
        .from('school_aliases')
        .insert({ school_id: schoolId, alias: trimmed, alias_type: 'abbreviation' })
      if (error) { showToast(`Failed: ${error.message}`, 'error'); return }
    }

    // Backfill tournament_entries
    const { data: updated } = await supabase
      .from('tournament_entries')
      .update({ school_id: schoolId })
      .eq('school_context_raw', trimmed)
      .select('id')

    const count = updated?.length ?? 0
    showToast(`${trimmed} → ${displayName} saved (${count} entries linked)`, 'success')

    setRows(prev => prev.map(r =>
      r.schoolId === schoolId ? { ...r, abbreviation: trimmed, dirty: false } : r
    ))
    await loadSidebarCounts()
  }

  // ── Render ─────────────────────────────────────────────────────

  const currentDistrict = districts.find(d => d.id === selectedId)
  const hasAbbrevCount = rows.filter(r => r.abbreviation !== '').length
  const missingCount = rows.filter(r => r.abbreviation === '').length

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <nav className="text-xs text-slate-400 flex items-center gap-1 mb-4">
          <Link href="/admin" className="hover:text-slate-600">Admin</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">District Verify</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-900">District Verify</h1>
        <p className="text-xs text-slate-500 mt-1">Your list. Add abbreviations for each school.</p>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: District list */}
        <div className="w-[260px] flex-shrink-0 border-r border-slate-200 overflow-auto">
          {districts.filter(d => d.id <= 32).map(d => {
            const c = districtCounts.get(d.id)
            const total = c?.total ?? 0
            const done = c?.hasAbbrev ?? 0
            const allDone = total > 0 && done === total
            return (
              <button key={d.id} onClick={() => setSelectedId(d.id)}
                className={`w-full text-left px-4 py-2 border-b border-slate-100 text-sm ${
                  d.id === selectedId ? 'bg-blue-50 font-semibold' : allDone ? 'bg-green-50/50 hover:bg-green-50' : 'hover:bg-slate-50'
                }`}>
                <div className="flex items-center justify-between">
                  <span>
                    {allDone && <span className="text-green-500 mr-1">✓</span>}
                    <span className="text-slate-500">{d.id}.</span> {d.name}
                  </span>
                  <span className="text-[10px] text-slate-400">{done}/{total}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right: School list */}
        <div className="flex-1 overflow-auto p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {currentDistrict?.name ?? `District ${selectedId}`}
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            {rows.length} schools · {hasAbbrevCount} have abbreviation · {missingCount > 0 ? <span className="text-red-500">{missingCount} missing</span> : <span className="text-green-600">all set</span>}
          </p>

          {loading ? (
            <div className="text-sm text-slate-400 py-12 text-center">Loading...</div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">School Name</th>
                    <th className="px-4 py-2 text-left font-medium w-40">Abbreviation</th>
                    <th className="px-4 py-2 text-center font-medium w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(row => (
                    <SchoolRowC
                      key={row.schoolId}
                      row={row}
                      onUpdate={(value) => setRows(prev => prev.map(r =>
                        r.schoolId === row.schoolId
                          ? { ...r, abbreviation: value, dirty: true }
                          : r
                      ))}
                      onSave={() => handleSave(row.schoolId, row.abbreviation, row.displayName)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium max-w-md ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ─── School Row ────────────────────────────────────────────────────

function SchoolRowC({ row, onUpdate, onSave }: {
  row: SchoolRow
  onUpdate: (value: string) => void
  onSave: () => void
}) {
  const [saving, setSaving] = useState(false)
  const hasAbbrev = row.abbreviation !== ''

  return (
    <tr className={hasAbbrev && !row.dirty ? 'bg-green-50/30' : !hasAbbrev ? 'bg-yellow-50/30' : ''}>
      <td className="px-4 py-2 text-slate-900">{row.displayName}</td>
      <td className="px-4 py-2">
        <input
          type="text"
          value={row.abbreviation}
          onChange={e => onUpdate(e.target.value)}
          placeholder="Enter abbrev"
          className={`w-full rounded border px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            hasAbbrev && !row.dirty ? 'border-green-300 bg-green-50/50' : 'border-slate-300'
          }`}
        />
      </td>
      <td className="px-4 py-2 text-center">
        {row.dirty && row.abbreviation.trim() ? (
          <button
            onClick={async () => { setSaving(true); await onSave(); setSaving(false) }}
            disabled={saving}
            className="px-3 py-1 text-[10px] font-semibold rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
            {saving ? '...' : 'Save'}
          </button>
        ) : hasAbbrev ? (
          <span className="text-green-500 text-xs">✓</span>
        ) : (
          <span className="text-yellow-400 text-xs">—</span>
        )}
      </td>
    </tr>
  )
}
