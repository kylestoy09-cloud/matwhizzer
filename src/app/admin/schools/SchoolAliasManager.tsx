'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'

// ─── Types ─────────────────────────────────────────────────────────

interface School { id: number; display_name: string; short_name: string | null }
interface District { id: number; name: string; region_id: number | null }
interface UnresolvedRow { abbrev: string; entry_count: number; locations: string }
interface MappingRow { abbrev: string; school_name: string; school_id: number; entry_count: number }
interface DistrictAliasRow { school_name: string; abbreviation: string; alias_id: number; entry_count: number; flag_id: number | null; flag_note: string | null }
interface AuditRow { wrestler_first: string; wrestler_last: string; abbreviation: string; current_school: string | null; tournament: string; flag_reason: string | null; entry_id: string; school_id: number | null }
interface FlagCount { district_id: number; count: number }

type TabType = 'unresolved' | 'mappings' | 'district' | 'audit'

// ─── Props ─────────────────────────────────────────────────────────

interface Props { schools: School[]; districts: District[] }

// ─── Main Component ────────────────────────────────────────────────

export function SchoolAliasManager({ schools, districts }: Props) {
  const [tab, setTab] = useState<TabType>('unresolved')
  const [unresolved, setUnresolved] = useState<UnresolvedRow[]>([])
  const [mappings, setMappings] = useState<MappingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // District Verify state
  const [selectedDistrictId, setSelectedDistrictId] = useState<number>(1)
  const [districtAliases, setDistrictAliases] = useState<DistrictAliasRow[]>([])
  const [districtLoading, setDistrictLoading] = useState(false)
  const [flagCounts, setFlagCounts] = useState<FlagCount[]>([])

  // Wrestler Audit state
  const [auditRows, setAuditRows] = useState<AuditRow[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditFilter, setAuditFilter] = useState({ search: '', abbrev: '', tournament: '' })

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Data Fetching ──────────────────────────────────────────────

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const supabase = createSupabaseBrowser()

    // Unresolved
    const { data: allNullEntries } = await supabase
      .from('tournament_entries')
      .select('school_context_raw, tournament_id, tournaments(gender, district_id, region_id, name, districts(name), regions(name))')
      .is('school_id', null)
      .not('school_context_raw', 'is', null)

    type NullEntry = { school_context_raw: string; tournaments: { gender: string; district_id: number | null; region_id: number | null; name: string; districts: { name: string } | { name: string }[] | null; regions: { name: string } | { name: string }[] | null } | null }

    const unresolvedMap = new Map<string, { count: number; locs: Set<string> }>()
    for (const row of (allNullEntries ?? []) as unknown as NullEntry[]) {
      const abbrev = row.school_context_raw
      const entry = unresolvedMap.get(abbrev) ?? { count: 0, locs: new Set<string>() }
      entry.count++
      const t = row.tournaments
      if (t) {
        const prefix = t.gender === 'M' ? 'B:' : 'G:'
        const d = Array.isArray(t.districts) ? t.districts[0] : t.districts
        const r = Array.isArray(t.regions) ? t.regions[0] : t.regions
        entry.locs.add(prefix + (d?.name ?? r?.name ?? t.name))
      }
      unresolvedMap.set(abbrev, entry)
    }
    setUnresolved(Array.from(unresolvedMap.entries())
      .map(([abbrev, { count, locs }]) => ({ abbrev, entry_count: count, locations: Array.from(locs).sort().join(' · ') }))
      .sort((a, b) => b.entry_count - a.entry_count))

    // Mappings
    const { data: aliases } = await supabase.from('school_aliases').select('alias, school_id, schools(display_name)').order('alias')
    const { data: allEntries } = await supabase.from('tournament_entries').select('school_context_raw').not('school_context_raw', 'is', null)

    const entryCountMap = new Map<string, number>()
    for (const row of (allEntries ?? []) as Array<{ school_context_raw: string }>)
      entryCountMap.set(row.school_context_raw, (entryCountMap.get(row.school_context_raw) ?? 0) + 1)

    type AliasRow = { alias: string; school_id: number; schools: { display_name: string } | { display_name: string }[] | null }
    setMappings(((aliases ?? []) as unknown as AliasRow[]).map(a => {
      const s = Array.isArray(a.schools) ? a.schools[0] : a.schools
      return { abbrev: a.alias, school_name: s?.display_name ?? '?', school_id: a.school_id, entry_count: entryCountMap.get(a.alias) ?? 0 }
    }).sort((a, b) => a.school_name.localeCompare(b.school_name)))

    // Flag counts per district
    await fetchFlagCounts()

    setLoading(false)
  }

  async function fetchFlagCounts() {
    const supabase = createSupabaseBrowser()
    const { data } = await supabase.from('alias_flags').select('district_id')
    const counts = new Map<number, number>()
    for (const row of (data ?? []) as Array<{ district_id: number }>) {
      counts.set(row.district_id, (counts.get(row.district_id) ?? 0) + 1)
    }
    setFlagCounts(Array.from(counts.entries()).map(([district_id, count]) => ({ district_id, count })))
  }

  // ── District Data ──────────────────────────────────────────────

  const fetchDistrictAliases = useCallback(async (districtId: number) => {
    setDistrictLoading(true)
    const supabase = createSupabaseBrowser()

    // Get schools in this district
    const { data: sdRows } = await supabase.from('school_districts').select('school_id').eq('district_id', districtId)
    const schoolIds = (sdRows ?? []).map((r: { school_id: number }) => r.school_id)

    if (schoolIds.length === 0) { setDistrictAliases([]); setDistrictLoading(false); return }

    // Get abbreviation aliases for those schools
    const { data: aliasRows } = await supabase
      .from('school_aliases')
      .select('id, alias, school_id, schools(display_name)')
      .in('school_id', schoolIds)
      .eq('alias_type', 'abbreviation')
      .order('alias')

    // Get entry counts
    const { data: entries } = await supabase
      .from('tournament_entries')
      .select('school_context_raw')
      .not('school_context_raw', 'is', null)

    const eCounts = new Map<string, number>()
    for (const r of (entries ?? []) as Array<{ school_context_raw: string }>)
      eCounts.set(r.school_context_raw, (eCounts.get(r.school_context_raw) ?? 0) + 1)

    // Get flags for this district
    const { data: flags } = await supabase.from('alias_flags').select('id, alias, note').eq('district_id', districtId)
    const flagMap = new Map<string, { id: number; note: string | null }>()
    for (const f of (flags ?? []) as Array<{ id: number; alias: string; note: string | null }>)
      flagMap.set(f.alias, { id: f.id, note: f.note })

    type AR = { id: number; alias: string; school_id: number; schools: { display_name: string } | { display_name: string }[] | null }
    const rows: DistrictAliasRow[] = ((aliasRows ?? []) as unknown as AR[]).map(a => {
      const s = Array.isArray(a.schools) ? a.schools[0] : a.schools
      const flag = flagMap.get(a.alias)
      return {
        school_name: s?.display_name ?? '?',
        abbreviation: a.alias,
        alias_id: a.id,
        entry_count: eCounts.get(a.alias) ?? 0,
        flag_id: flag?.id ?? null,
        flag_note: flag?.note ?? null,
      }
    }).sort((a, b) => a.school_name.localeCompare(b.school_name))

    setDistrictAliases(rows)
    setDistrictLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'district') fetchDistrictAliases(selectedDistrictId)
  }, [tab, selectedDistrictId, fetchDistrictAliases])

  // ── Wrestler Audit Data ────────────────────────────────────────

  const fetchAuditData = useCallback(async () => {
    setAuditLoading(true)
    const supabase = createSupabaseBrowser()

    const { data: flags } = await supabase.from('alias_flags').select('alias, note')
    if (!flags || flags.length === 0) { setAuditRows([]); setAuditLoading(false); return }

    const flagAliases = [...new Set((flags as Array<{ alias: string; note: string | null }>).map(f => f.alias))]
    const flagNotes = new Map<string, string | null>()
    for (const f of flags as Array<{ alias: string; note: string | null }>) flagNotes.set(f.alias, f.note)

    const { data: entries } = await supabase
      .from('tournament_entries')
      .select('id, school_context_raw, school_id, wrestler_id, tournament_id, wrestlers(first_name, last_name), tournaments(name), schools(display_name)')
      .in('school_context_raw', flagAliases)

    type E = { id: string; school_context_raw: string; school_id: number | null; wrestlers: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null; tournaments: { name: string } | { name: string }[] | null; schools: { display_name: string } | { display_name: string }[] | null }

    const rows: AuditRow[] = ((entries ?? []) as unknown as E[]).map(e => {
      const w = Array.isArray(e.wrestlers) ? e.wrestlers[0] : e.wrestlers
      const t = Array.isArray(e.tournaments) ? e.tournaments[0] : e.tournaments
      const s = Array.isArray(e.schools) ? e.schools[0] : e.schools
      return {
        wrestler_first: w?.first_name ?? '?',
        wrestler_last: w?.last_name ?? '?',
        abbreviation: e.school_context_raw,
        current_school: s?.display_name ?? null,
        tournament: t?.name ?? '?',
        flag_reason: flagNotes.get(e.school_context_raw) ?? null,
        entry_id: e.id,
        school_id: e.school_id,
      }
    }).sort((a, b) => a.abbreviation.localeCompare(b.abbreviation) || a.wrestler_last.localeCompare(b.wrestler_last))

    setAuditRows(rows)
    setAuditLoading(false)
  }, [])

  useEffect(() => { if (tab === 'audit') fetchAuditData() }, [tab, fetchAuditData])

  // ── Filtered lists ─────────────────────────────────────────────

  const filteredUnresolved = useMemo(() => {
    if (!search) return unresolved
    const q = search.toLowerCase()
    return unresolved.filter(r => r.abbrev.toLowerCase().includes(q) || r.locations.toLowerCase().includes(q))
  }, [unresolved, search])

  const filteredMappings = useMemo(() => {
    if (!search) return mappings
    const q = search.toLowerCase()
    return mappings.filter(r => r.abbrev.toLowerCase().includes(q) || r.school_name.toLowerCase().includes(q))
  }, [mappings, search])

  const filteredAudit = useMemo(() => {
    let rows = auditRows
    if (auditFilter.search) {
      const q = auditFilter.search.toLowerCase()
      rows = rows.filter(r => `${r.wrestler_first} ${r.wrestler_last}`.toLowerCase().includes(q))
    }
    if (auditFilter.abbrev) rows = rows.filter(r => r.abbreviation === auditFilter.abbrev)
    if (auditFilter.tournament) rows = rows.filter(r => r.tournament === auditFilter.tournament)
    return rows
  }, [auditRows, auditFilter])

  const totalAliases = mappings.length
  const abbrevsWithEntries = mappings.filter(m => m.entry_count > 0).length
  const totalLinked = mappings.reduce((sum, m) => sum + m.entry_count, 0)
  const totalFlags = flagCounts.reduce((s, f) => s + f.count, 0)

  // ── Handlers ───────────────────────────────────────────────────

  async function handleAssign(abbrev: string, schoolId: number, schoolName: string) {
    const supabase = createSupabaseBrowser()
    const { error: aliasErr } = await supabase.from('school_aliases').insert({ school_id: schoolId, alias: abbrev, alias_type: 'abbreviation' })
    if (aliasErr) { showToast(`Failed to create alias: ${aliasErr.message}`, 'error'); return }
    const { data: updated, error: entryErr } = await supabase.from('tournament_entries').update({ school_id: schoolId }).eq('school_context_raw', abbrev).is('school_id', null).select('id')
    if (entryErr) { showToast(`Alias saved but backfill failed: ${entryErr.message}`, 'error'); return }
    showToast(`${abbrev} → ${schoolName} saved (${updated?.length ?? 0} entries updated)`, 'success')
    setUnresolved(prev => prev.filter(r => r.abbrev !== abbrev))
    setMappings(prev => [...prev, { abbrev, school_name: schoolName, school_id: schoolId, entry_count: updated?.length ?? 0 }].sort((a, b) => a.school_name.localeCompare(b.school_name)))
  }

  async function handleMarkError(abbrev: string, entryCount: number) {
    if (!window.confirm(`Mark "${abbrev}" as extraction error?\n\nThis will set school_context_raw = NULL on ${entryCount} entries.`)) return
    const supabase = createSupabaseBrowser()
    const { error } = await supabase.from('tournament_entries').update({ school_context_raw: null }).eq('school_context_raw', abbrev).is('school_id', null)
    if (error) { showToast(`Failed: ${error.message}`, 'error'); return }
    showToast(`${abbrev} marked as extraction error (${entryCount} entries cleared)`, 'success')
    setUnresolved(prev => prev.filter(r => r.abbrev !== abbrev))
  }

  async function handleEditMapping(abbrev: string, newSchoolId: number, newSchoolName: string) {
    const supabase = createSupabaseBrowser()
    const { error: aliasErr } = await supabase.from('school_aliases').update({ school_id: newSchoolId }).eq('alias', abbrev)
    if (aliasErr) { showToast(`Failed: ${aliasErr.message}`, 'error'); return }
    const { data: updated, error: entryErr } = await supabase.from('tournament_entries').update({ school_id: newSchoolId }).eq('school_context_raw', abbrev).select('id')
    if (entryErr) { showToast(`Alias updated but backfill failed: ${entryErr.message}`, 'error'); return }
    showToast(`${abbrev} → ${newSchoolName} updated (${updated?.length ?? 0} entries)`, 'success')
    setMappings(prev => prev.map(m => m.abbrev === abbrev ? { ...m, school_name: newSchoolName, school_id: newSchoolId, entry_count: updated?.length ?? 0 } : m))
  }

  async function handleFlag(alias: string, districtId: number, note: string) {
    const supabase = createSupabaseBrowser()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('alias_flags').insert({ alias, district_id: districtId, note: note || null, flagged_by: user?.id ?? null })
    if (error) { showToast(`Failed to flag: ${error.message}`, 'error'); return }
    showToast(`${alias} flagged in District ${districtId}`, 'success')
    setDistrictAliases(prev => prev.map(r => r.abbreviation === alias ? { ...r, flag_id: -1, flag_note: note || null } : r))
    await fetchFlagCounts()
  }

  async function handleUnflag(alias: string, flagId: number) {
    if (!window.confirm(`Remove flag on ${alias}?`)) return
    const supabase = createSupabaseBrowser()
    const { error } = await supabase.from('alias_flags').delete().eq('id', flagId)
    if (error) { showToast(`Failed: ${error.message}`, 'error'); return }
    showToast(`Flag removed from ${alias}`, 'success')
    setDistrictAliases(prev => prev.map(r => r.abbreviation === alias ? { ...r, flag_id: null, flag_note: null } : r))
    await fetchFlagCounts()
  }

  async function handleMarkAuditError(entryId: string, name: string, tournament: string) {
    if (!window.confirm(`Mark ${name} in ${tournament} as extraction error? This cannot be undone easily.`)) return
    const supabase = createSupabaseBrowser()
    const { error } = await supabase.from('tournament_entries').update({ school_context_raw: null, school_id: null }).eq('id', entryId)
    if (error) { showToast(`Failed: ${error.message}`, 'error'); return }
    showToast(`${name} marked as error`, 'success')
    setAuditRows(prev => prev.filter(r => r.entry_id !== entryId))
  }

  async function handleBulkMarkError() {
    if (!window.confirm(`This will mark ${filteredAudit.length} entries as extraction errors. Are you sure?`)) return
    const supabase = createSupabaseBrowser()
    const ids = filteredAudit.map(r => r.entry_id)
    const { error } = await supabase.from('tournament_entries').update({ school_context_raw: null, school_id: null }).in('id', ids)
    if (error) { showToast(`Failed: ${error.message}`, 'error'); return }
    showToast(`${ids.length} entries marked as errors`, 'success')
    const idSet = new Set(ids)
    setAuditRows(prev => prev.filter(r => !idSet.has(r.entry_id)))
  }

  // ── Render ─────────────────────────────────────────────────────

  const tabBtn = (t: TabType, label: string) => (
    <button
      onClick={() => { setTab(t); setSearch('') }}
      className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
        tab === t ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <nav className="text-xs text-slate-400 flex items-center gap-1 mb-6">
        <Link href="/admin" className="hover:text-slate-600">Admin</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">School Alias Manager</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">School Alias Manager</h1>

      <div className="flex gap-4 border-b border-slate-200 mb-4">
        {tabBtn('unresolved', `Unresolved (${unresolved.length})`)}
        {tabBtn('mappings', `All Mappings (${mappings.length})`)}
        {tabBtn('district', `District Verify${totalFlags > 0 ? ` (${totalFlags})` : ''}`)}
        {tabBtn('audit', `Wrestler Audit${auditRows.length > 0 ? ` (${auditRows.length})` : ''}`)}
      </div>

      {(tab === 'unresolved' || tab === 'mappings') && (
        <input
          type="text"
          placeholder="Filter by abbreviation or school name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md rounded border border-slate-300 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      )}

      {loading ? (
        <div className="text-sm text-slate-400 py-12 text-center">Loading...</div>
      ) : tab === 'unresolved' ? (
        <UnresolvedTab rows={filteredUnresolved} schools={schools} onAssign={handleAssign} onMarkError={handleMarkError} />
      ) : tab === 'mappings' ? (
        <>
          <div className="text-xs text-slate-500 mb-3">
            {totalAliases} total aliases · {abbrevsWithEntries} with entries · {totalLinked.toLocaleString()} entries linked
          </div>
          <MappingsTab rows={filteredMappings} schools={schools} onEdit={handleEditMapping} />
        </>
      ) : tab === 'district' ? (
        <DistrictVerifyTab
          districts={districts}
          selectedId={selectedDistrictId}
          onSelectDistrict={setSelectedDistrictId}
          aliases={districtAliases}
          loading={districtLoading}
          flagCounts={flagCounts}
          onFlag={handleFlag}
          onUnflag={handleUnflag}
        />
      ) : (
        <WrestlerAuditTab
          rows={filteredAudit}
          allRows={auditRows}
          loading={auditLoading}
          filter={auditFilter}
          onFilterChange={setAuditFilter}
          onMarkError={handleMarkAuditError}
          onBulkMarkError={handleBulkMarkError}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium max-w-md ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}

// ─── Unresolved Tab ────────────────────────────────────────────────

function UnresolvedTab({ rows, schools, onAssign, onMarkError }: {
  rows: UnresolvedRow[]; schools: School[]
  onAssign: (a: string, id: number, name: string) => Promise<void>
  onMarkError: (a: string, c: number) => Promise<void>
}) {
  if (rows.length === 0) return <div className="text-sm text-slate-400 py-8 text-center">No unresolved abbreviations</div>
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Abbreviation</th>
            <th className="px-4 py-2 text-right font-medium w-20">Entries</th>
            <th className="px-4 py-2 text-left font-medium">Districts / Regions</th>
            <th className="px-4 py-2 text-left font-medium">Assign To</th>
            <th className="px-4 py-2 text-center font-medium w-24">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(row => <UnresolvedRowC key={row.abbrev} row={row} schools={schools} onAssign={onAssign} onMarkError={onMarkError} />)}
        </tbody>
      </table>
    </div>
  )
}

function UnresolvedRowC({ row, schools, onAssign, onMarkError }: {
  row: UnresolvedRow; schools: School[]
  onAssign: (a: string, id: number, name: string) => Promise<void>
  onMarkError: (a: string, c: number) => Promise<void>
}) {
  const [selected, setSelected] = useState<{ id: number; name: string } | 'error' | null>(null)
  const [saving, setSaving] = useState(false)
  async function handleSave() {
    if (!selected) return; setSaving(true)
    if (selected === 'error') await onMarkError(row.abbrev, row.entry_count)
    else await onAssign(row.abbrev, selected.id, selected.name)
    setSaving(false)
  }
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-2 font-mono font-semibold text-slate-900">{row.abbrev}</td>
      <td className="px-4 py-2 text-right text-slate-500">{row.entry_count}</td>
      <td className="px-4 py-2 text-[11px] text-slate-400 max-w-[200px]">{row.locations || '—'}</td>
      <td className="px-4 py-2"><SchoolSearchDropdown schools={schools} value={selected} onChange={setSelected} showErrorOption /></td>
      <td className="px-4 py-2 text-center">
        <button onClick={handleSave} disabled={!selected || saving}
          className="px-3 py-1 text-xs font-semibold rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed">
          {saving ? '...' : 'Save'}
        </button>
      </td>
    </tr>
  )
}

// ─── Mappings Tab ──────────────────────────────────────────────────

function MappingsTab({ rows, schools, onEdit }: {
  rows: MappingRow[]; schools: School[]
  onEdit: (a: string, id: number, name: string) => Promise<void>
}) {
  const [editingAbbrev, setEditingAbbrev] = useState<string | null>(null)
  if (rows.length === 0) return <div className="text-sm text-slate-400 py-8 text-center">No mappings found</div>
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Abbreviation</th>
            <th className="px-4 py-2 text-left font-medium">School Name</th>
            <th className="px-4 py-2 text-right font-medium w-20">Entries</th>
            <th className="px-4 py-2 text-center font-medium w-24">Edit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(row => <MappingRowC key={row.abbrev} row={row} schools={schools} isEditing={editingAbbrev === row.abbrev}
            onStartEdit={() => setEditingAbbrev(row.abbrev)} onCancel={() => setEditingAbbrev(null)}
            onSave={async (id, name) => { await onEdit(row.abbrev, id, name); setEditingAbbrev(null) }} />)}
        </tbody>
      </table>
    </div>
  )
}

function MappingRowC({ row, schools, isEditing, onStartEdit, onCancel, onSave }: {
  row: MappingRow; schools: School[]; isEditing: boolean
  onStartEdit: () => void; onCancel: () => void
  onSave: (id: number, name: string) => Promise<void>
}) {
  const [selected, setSelected] = useState<{ id: number; name: string } | 'error' | null>(null)
  const [saving, setSaving] = useState(false)
  if (!isEditing) return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-2 font-mono font-semibold text-slate-900">{row.abbrev}</td>
      <td className="px-4 py-2 text-slate-700">{row.school_name}</td>
      <td className="px-4 py-2 text-right text-slate-500">{row.entry_count}</td>
      <td className="px-4 py-2 text-center">
        <button onClick={onStartEdit} className="px-2 py-1 text-xs text-slate-500 border border-slate-200 rounded hover:bg-slate-50 hover:border-slate-400">Edit</button>
      </td>
    </tr>
  )
  return (<>
    <tr className="bg-blue-50">
      <td className="px-4 py-2 font-mono font-semibold text-slate-900">{row.abbrev}</td>
      <td className="px-4 py-2 text-slate-500">{row.school_name}</td>
      <td className="px-4 py-2 text-right text-slate-500">{row.entry_count}</td>
      <td className="px-4 py-2" />
    </tr>
    <tr className="bg-blue-50 border-t-0">
      <td className="px-4 pb-3" />
      <td className="px-4 pb-3" colSpan={2}>
        <div className="text-xs text-slate-500 mb-1">Change to:</div>
        <SchoolSearchDropdown schools={schools} value={selected} onChange={setSelected} showErrorOption={false} />
      </td>
      <td className="px-4 pb-3 text-center">
        <div className="flex flex-col gap-1">
          <button onClick={async () => { if (!selected || selected === 'error') return; setSaving(true); await onSave(selected.id, selected.name); setSaving(false); setSelected(null) }}
            disabled={!selected || selected === 'error' || saving}
            className="px-3 py-1 text-xs font-semibold rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30">
            {saving ? '...' : 'Save'}
          </button>
          <button onClick={() => { onCancel(); setSelected(null) }} className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
        </div>
      </td>
    </tr>
  </>)
}

// ─── District Verify Tab ───────────────────────────────────────────

function DistrictVerifyTab({ districts, selectedId, onSelectDistrict, aliases, loading, flagCounts, onFlag, onUnflag }: {
  districts: District[]; selectedId: number
  onSelectDistrict: (id: number) => void
  aliases: DistrictAliasRow[]; loading: boolean
  flagCounts: FlagCount[]
  onFlag: (alias: string, districtId: number, note: string) => Promise<void>
  onUnflag: (alias: string, flagId: number) => Promise<void>
}) {
  const flagCountMap = useMemo(() => {
    const m = new Map<number, number>()
    for (const f of flagCounts) m.set(f.district_id, f.count)
    return m
  }, [flagCounts])

  const district = districts.find(d => d.id === selectedId)
  const flaggedCount = aliases.filter(a => a.flag_id != null).length

  return (
    <div className="flex gap-4" style={{ minHeight: 500 }}>
      {/* Left: district list */}
      <div className="w-[240px] flex-shrink-0 border border-slate-200 rounded-lg overflow-auto">
        {districts.map(d => {
          const fc = flagCountMap.get(d.id) ?? 0
          return (
            <button key={d.id} onClick={() => onSelectDistrict(d.id)}
              className={`w-full text-left px-3 py-2 text-sm border-b border-slate-100 flex items-center justify-between ${
                d.id === selectedId ? 'bg-blue-50 font-semibold text-slate-900' : 'hover:bg-slate-50 text-slate-700'
              }`}>
              <span>{d.name}</span>
              {fc > 0 && <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{fc}</span>}
            </button>
          )
        })}
      </div>

      {/* Right: district detail */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          {district?.name ?? `District ${selectedId}`}
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          {aliases.length} abbreviations · {flaggedCount} flagged
        </p>

        {loading ? (
          <div className="text-sm text-slate-400 py-8 text-center">Loading...</div>
        ) : aliases.length === 0 ? (
          <div className="text-sm text-slate-400 py-8 text-center">No abbreviation aliases found for this district</div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">School Name</th>
                  <th className="px-4 py-2 text-left font-medium">Abbreviation</th>
                  <th className="px-4 py-2 text-right font-medium w-20">Entries</th>
                  <th className="px-4 py-2 text-center font-medium w-28">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aliases.map(row => (
                  <DistrictAliasRowC key={row.abbreviation} row={row} districtId={selectedId} onFlag={onFlag} onUnflag={onUnflag} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function DistrictAliasRowC({ row, districtId, onFlag, onUnflag }: {
  row: DistrictAliasRow; districtId: number
  onFlag: (alias: string, districtId: number, note: string) => Promise<void>
  onUnflag: (alias: string, flagId: number) => Promise<void>
}) {
  const [flagging, setFlagging] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const isFlagged = row.flag_id != null

  async function handleFlag() {
    setSaving(true)
    await onFlag(row.abbreviation, districtId, note)
    setSaving(false)
    setFlagging(false)
    setNote('')
  }

  return (
    <tr className={isFlagged ? 'bg-amber-50' : 'hover:bg-slate-50'}>
      <td className="px-4 py-2">
        <div className="text-slate-900">{row.school_name}</div>
        {isFlagged && row.flag_note && <div className="text-[10px] text-amber-600 mt-0.5">{row.flag_note}</div>}
      </td>
      <td className="px-4 py-2 font-mono text-slate-700">{row.abbreviation}</td>
      <td className="px-4 py-2 text-right text-slate-500">{row.entry_count}</td>
      <td className="px-4 py-2 text-center">
        {flagging ? (
          <div className="flex flex-col gap-1">
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Reason (optional)"
              className="text-xs rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <div className="flex gap-1 justify-center">
              <button onClick={handleFlag} disabled={saving}
                className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
                {saving ? '...' : 'Flag It'}
              </button>
              <button onClick={() => { setFlagging(false); setNote('') }}
                className="px-2 py-0.5 text-[10px] text-slate-500 hover:text-slate-700">Cancel</button>
            </div>
          </div>
        ) : isFlagged ? (
          <button onClick={() => onUnflag(row.abbreviation, row.flag_id!)}
            className="text-red-500 hover:text-red-700 text-sm" title="Remove flag">
            🚩
          </button>
        ) : (
          <button onClick={() => setFlagging(true)}
            className="text-slate-300 hover:text-amber-500 text-sm" title="Flag this abbreviation">
            🏳️
          </button>
        )}
      </td>
    </tr>
  )
}

// ─── Wrestler Audit Tab ────────────────────────────────────────────

function WrestlerAuditTab({ rows, allRows, loading, filter, onFilterChange, onMarkError, onBulkMarkError }: {
  rows: AuditRow[]; allRows: AuditRow[]; loading: boolean
  filter: { search: string; abbrev: string; tournament: string }
  onFilterChange: (f: { search: string; abbrev: string; tournament: string }) => void
  onMarkError: (entryId: string, name: string, tournament: string) => Promise<void>
  onBulkMarkError: () => Promise<void>
}) {
  const uniqueAbbrevs = useMemo(() => [...new Set(allRows.map(r => r.abbreviation))].sort(), [allRows])
  const uniqueTournaments = useMemo(() => [...new Set(allRows.map(r => r.tournament))].sort(), [allRows])
  const uniqueFlaggedDistricts = useMemo(() => new Set(allRows.map(r => r.abbreviation)).size, [allRows])

  if (loading) return <div className="text-sm text-slate-400 py-12 text-center">Loading...</div>

  if (allRows.length === 0) return (
    <div className="text-sm text-slate-400 py-12 text-center">
      <p className="mb-2">No abbreviations flagged yet.</p>
      <p>Use the <strong>District Verify</strong> tab to flag abbreviations that don&apos;t appear on real bracket PDFs.</p>
    </div>
  )

  return (
    <div>
      <div className="text-xs text-slate-500 mb-3">
        {uniqueAbbrevs.length} abbreviations flagged across {uniqueFlaggedDistricts} districts covering {allRows.length} wrestler entries
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <input type="text" placeholder="Search wrestler name..."
          value={filter.search} onChange={e => onFilterChange({ ...filter, search: e.target.value })}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-48" />
        <select value={filter.abbrev} onChange={e => onFilterChange({ ...filter, abbrev: e.target.value })}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All abbreviations</option>
          {uniqueAbbrevs.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filter.tournament} onChange={e => onFilterChange({ ...filter, tournament: e.target.value })}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All tournaments</option>
          {uniqueTournaments.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={onBulkMarkError} disabled={rows.length === 0}
          className="ml-auto px-3 py-1.5 text-xs font-semibold rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-30">
          Mark All as Extraction Error ({rows.length})
        </button>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Wrestler</th>
              <th className="px-4 py-2 text-left font-medium">Abbreviation</th>
              <th className="px-4 py-2 text-left font-medium">Current School</th>
              <th className="px-4 py-2 text-left font-medium">Tournament</th>
              <th className="px-4 py-2 text-left font-medium">Flag Reason</th>
              <th className="px-4 py-2 text-center font-medium w-28">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => (
              <tr key={row.entry_id} className="hover:bg-slate-50">
                <td className="px-4 py-1.5 text-slate-900">{row.wrestler_last}, {row.wrestler_first}</td>
                <td className="px-4 py-1.5 font-mono text-slate-700">{row.abbreviation}</td>
                <td className="px-4 py-1.5 text-slate-500">{row.current_school ?? '—'}</td>
                <td className="px-4 py-1.5 text-slate-500 text-xs">{row.tournament}</td>
                <td className="px-4 py-1.5 text-xs text-amber-600">{row.flag_reason ?? '—'}</td>
                <td className="px-4 py-1.5 text-center">
                  <button onClick={() => onMarkError(row.entry_id, `${row.wrestler_first} ${row.wrestler_last}`, row.tournament)}
                    className="px-2 py-0.5 text-[10px] font-semibold rounded border border-red-200 text-red-600 hover:bg-red-50">
                    Mark Error
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">No matching entries</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Searchable School Dropdown ────────────────────────────────────

function SchoolSearchDropdown({ schools, value, onChange, showErrorOption }: {
  schools: School[]
  value: { id: number; name: string } | 'error' | null
  onChange: (v: { id: number; name: string } | 'error' | null) => void
  showErrorOption: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = useMemo(() => {
    if (!query) return schools.slice(0, 30)
    const q = query.toLowerCase()
    return schools.filter(s => s.display_name.toLowerCase().includes(q) || (s.short_name && s.short_name.toLowerCase().includes(q))).slice(0, 30)
  }, [schools, query])

  const displayValue = value === 'error' ? '⚠ Extraction error' : value ? value.name : ''

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder="Search for a school..."
        value={open ? query : displayValue}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { setOpen(true); setQuery('') }}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {showErrorOption && (
            <button onClick={() => { onChange('error'); setOpen(false); setQuery('') }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 border-b border-slate-100">
              ⚠ Mark as extraction error (no real school)
            </button>
          )}
          {filtered.length === 0 && <div className="px-3 py-2 text-xs text-slate-400">No schools found</div>}
          {filtered.map(s => (
            <button key={s.id} onClick={() => { onChange({ id: s.id, name: s.display_name }); setOpen(false); setQuery('') }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 truncate">
              {s.display_name}
              {s.short_name && <span className="text-slate-400 ml-1">({s.short_name})</span>}
            </button>
          ))}
          {filtered.length === 30 && (
            <div className="px-3 py-1.5 text-[10px] text-slate-400 border-t border-slate-100">Showing first 30 — type to narrow</div>
          )}
        </div>
      )}
    </div>
  )
}
