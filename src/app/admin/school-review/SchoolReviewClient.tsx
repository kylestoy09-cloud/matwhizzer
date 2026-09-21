'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useSeasons } from '@/components/SeasonsProvider'
import { useRouter } from 'next/navigation'

export type SchoolRow = {
  id: number
  display_name: string
  // Season 2 (baseline)
  s2_district: string | null
  s2_region: string | null
  s2_conference: string | null
  s2_inactive: boolean           // was inactive in the prior season
  // Season 3 (new import — may be null if not yet imported)
  s3_district: string | null
  s3_region: string | null
  // Season 3 status
  inactive: boolean
  merged_into_id: number | null
  merged_into_name: string | null  // current display_name of the record school
  record_school_prev_name: string | null
}

type Props = {
  schools: SchoolRow[]
  seasonId: number
  gender: string
}

type MergeState = {
  schoolId: number
  schoolName: string
  query: string
  results: { id: number; display_name: string }[]
  selected: { id: number; display_name: string } | null
  mergedName: string
  pickingPrimary: boolean  // which school is the record school
}

function StatusBadge({ row }: { row: SchoolRow }) {
  if (row.merged_into_id) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        Merged → {row.merged_into_name}
      </span>
    )
  }
  if (row.inactive) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Deactivated
      </span>
    )
  }
  if (row.s2_inactive) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        Was inactive S2
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      Active
    </span>
  )
}

function DistrictRegionCell({ s2, s3 }: { s2: string | null; s3: string | null }) {
  if (!s2 && !s3) return <span className="text-slate-400">—</span>
  if (!s3 || s2 === s3) return <span>{s2 ?? '—'}</span>
  return (
    <span>
      <span className="line-through text-slate-400 text-xs mr-1">{s2}</span>
      <span className="text-blue-700 font-medium">{s3}</span>
    </span>
  )
}

export function SchoolReviewClient({ schools: initialSchools, seasonId, gender }: Props) {
  const { label: seasonLabelOf } = useSeasons()
  const router = useRouter()
  const [schools, setSchools] = useState(initialSchools)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'merged' | 'unassigned' | 'was_inactive'>('all')
  const [search, setSearch] = useState('')
  const [merging, setMerging] = useState<MergeState | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // School search for merge target
  useEffect(() => {
    if (!merging || merging.query.length < 2) {
      setMerging(m => m ? { ...m, results: [] } : null)
      return
    }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      const r = await fetch(`/api/admin/search-schools?q=${encodeURIComponent(merging.query)}&limit=8`)
      const d = await r.json()
      setMerging(m => m ? { ...m, results: d.schools ?? [] } : null)
    }, 250)
  }, [merging?.query])

  // Auto-build merged name when both schools selected
  useEffect(() => {
    if (!merging?.selected) return
    const recordName = merging.pickingPrimary ? merging.selected.display_name : merging.schoolName
    const secondName = merging.pickingPrimary ? merging.schoolName : merging.selected.display_name
    setMerging(m => m ? { ...m, mergedName: `${recordName}/${secondName}` } : null)
  }, [merging?.selected, merging?.pickingPrimary])

  async function callApi(body: Record<string, unknown>) {
    const r = await fetch('/api/admin/school-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, seasonId, gender }),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Request failed')
    return d
  }

  async function handleDeactivate(school: SchoolRow) {
    if (!confirm(`Deactivate ${school.display_name} for this season?`)) return
    setBusy(school.id); setError(null)
    try {
      await callApi({ action: 'deactivate', schoolId: school.id })
      setSchools(s => s.map(r => r.id === school.id ? { ...r, inactive: true, merged_into_id: null } : r))
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    setBusy(null)
  }

  async function handleReactivate(school: SchoolRow) {
    setBusy(school.id); setError(null)
    try {
      await callApi({ action: 'reactivate', schoolId: school.id })
      setSchools(s => s.map(r => r.id === school.id ? { ...r, inactive: false, merged_into_id: null, merged_into_name: null } : r))
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    setBusy(null)
  }

  async function handleUnmerge(school: SchoolRow) {
    if (!confirm(`Unmerge ${school.display_name}? This will reactivate it and restore the record school's original name.`)) return
    setBusy(school.id); setError(null)
    try {
      const d = await callApi({ action: 'unmerge', sourceId: school.id })
      setSchools(s => s.map(r => {
        if (r.id === school.id) return { ...r, inactive: false, merged_into_id: null, merged_into_name: null }
        if (r.id === school.merged_into_id) return { ...r, display_name: d.restoredName }
        return r
      }))
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    setBusy(null)
  }

  async function handleMergeSubmit() {
    if (!merging?.selected || !merging.mergedName.trim()) return
    const recordSchool = merging.pickingPrimary ? merging.selected : { id: merging.schoolId, display_name: merging.schoolName }
    const sourceSchool = merging.pickingPrimary ? { id: merging.schoolId, display_name: merging.schoolName } : merging.selected
    setBusy(sourceSchool.id); setError(null)
    try {
      const d = await callApi({ action: 'merge', sourceId: sourceSchool.id, recordId: recordSchool.id, mergedName: merging.mergedName.trim() })
      setSchools(s => s.map(r => {
        if (r.id === sourceSchool.id) return { ...r, inactive: true, merged_into_id: recordSchool.id, merged_into_name: d.mergedName }
        if (r.id === recordSchool.id) return { ...r, display_name: d.mergedName }
        return r
      }))
      setMerging(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    setBusy(null)
  }

  const filtered = schools.filter(s => {
    const matchSearch = !search || s.display_name.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filter === 'active') return !s.inactive && !s.merged_into_id && !s.s2_inactive
    if (filter === 'inactive') return s.inactive && !s.merged_into_id
    if (filter === 'merged') return !!s.merged_into_id
    if (filter === 'unassigned') return !s.s3_district && !s.s3_region
    if (filter === 'was_inactive') return s.s2_inactive && !s.inactive && !s.merged_into_id
    return true
  })

  const counts = {
    active: schools.filter(s => !s.inactive && !s.merged_into_id && !s.s2_inactive).length,
    inactive: schools.filter(s => s.inactive && !s.merged_into_id).length,
    merged: schools.filter(s => !!s.merged_into_id).length,
    unassigned: schools.filter(s => !s.s3_district && !s.s3_region).length,
    was_inactive: schools.filter(s => s.s2_inactive && !s.inactive && !s.merged_into_id).length,
  }

  return (
    <div className="p-6 max-w-[1400px]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">School Review — {gender === 'F' ? 'Girls' : 'Boys'} {seasonLabelOf(seasonId) ?? ''}</h1>
        <button
          onClick={() => startTransition(() => router.refresh())}
          className="text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded px-3 py-1.5"
        >
          {isPending ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>
      )}

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'active', 'inactive', 'merged', 'was_inactive', 'unassigned'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              filter === f
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {f === 'all'          ? `All (${schools.length})` :
             f === 'active'       ? `Active (${counts.active})` :
             f === 'inactive'     ? `Deactivated (${counts.inactive})` :
             f === 'merged'       ? `Merged (${counts.merged})` :
             f === 'was_inactive' ? `Was Inactive S2 (${counts.was_inactive})` :
             `No S3 Alignment (${counts.unassigned})`}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search school…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto border border-slate-200 rounded px-3 py-1 text-sm w-52"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2">School</th>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">District</th>
              <th className="px-3 py-2">Region</th>
              <th className="px-3 py-2">Conference</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(school => (
              <>
                <tr key={school.id} className={`hover:bg-slate-50 ${merging?.schoolId === school.id ? 'bg-blue-50' : ''}`}>
                  <td className="px-3 py-2 font-medium text-slate-800">{school.display_name}</td>
                  <td className="px-3 py-2 text-slate-400 tabular-nums">{school.id}</td>
                  <td className="px-3 py-2">
                    <DistrictRegionCell s2={school.s2_district} s3={school.s3_district} />
                  </td>
                  <td className="px-3 py-2">
                    <DistrictRegionCell s2={school.s2_region} s3={school.s3_region} />
                  </td>
                  <td className="px-3 py-2 text-slate-600">{school.s2_conference ?? '—'}</td>
                  <td className="px-3 py-2"><StatusBadge row={school} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {busy === school.id ? (
                        <span className="text-slate-400 text-xs">Saving…</span>
                      ) : school.merged_into_id ? (
                        <button onClick={() => handleUnmerge(school)}
                          className="text-xs px-2 py-1 rounded border border-purple-300 text-purple-700 hover:bg-purple-50">
                          Unmerge
                        </button>
                      ) : school.inactive ? (
                        <button onClick={() => handleReactivate(school)}
                          className="text-xs px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50">
                          Reactivate
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setMerging({ schoolId: school.id, schoolName: school.display_name, query: '', results: [], selected: null, mergedName: '', pickingPrimary: false })}
                            className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50">
                            Merge
                          </button>
                          <button onClick={() => handleDeactivate(school)}
                            className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50">
                            Deactivate
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Inline merge panel */}
                {merging?.schoolId === school.id && (
                  <tr key={`${school.id}-merge`}>
                    <td colSpan={7} className="px-3 py-3 bg-blue-50 border-b border-blue-100">
                      <div className="flex flex-col gap-3 max-w-2xl">
                        <p className="text-sm font-medium text-blue-900">
                          Merge <strong>{school.display_name}</strong> with another school
                        </p>

                        {/* Primary school toggle */}
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-slate-600">Record school (stays active):</span>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" checked={!merging.pickingPrimary}
                              onChange={() => setMerging(m => m ? { ...m, pickingPrimary: false } : null)} />
                            <span className="font-medium">{school.display_name}</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" checked={merging.pickingPrimary}
                              onChange={() => setMerging(m => m ? { ...m, pickingPrimary: true } : null)} />
                            <span className="font-medium">{merging.selected?.display_name ?? 'Other school'}</span>
                          </label>
                        </div>

                        {/* School search */}
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search for the other school…"
                            value={merging.query}
                            onChange={e => setMerging(m => m ? { ...m, query: e.target.value, selected: null } : null)}
                            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm"
                            autoFocus
                          />
                          {merging.results.length > 0 && !merging.selected && (
                            <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-white border border-slate-200 rounded shadow-lg">
                              {merging.results
                                .filter(r => r.id !== school.id)
                                .map(r => (
                                  <button key={r.id} onClick={() => setMerging(m => m ? { ...m, selected: r, query: r.display_name, results: [] } : null)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0">
                                    {r.display_name} <span className="text-slate-400 text-xs">#{r.id}</span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Merged name input */}
                        {merging.selected && (
                          <div>
                            <label className="text-xs font-medium text-slate-600 block mb-1">Combined display name</label>
                            <input
                              type="text"
                              value={merging.mergedName}
                              onChange={e => setMerging(m => m ? { ...m, mergedName: e.target.value } : null)}
                              className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm font-medium"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              {!merging.pickingPrimary
                                ? `Record school: ${school.display_name} (keeps profile) · Inactive: ${merging.selected.display_name}`
                                : `Record school: ${merging.selected.display_name} (keeps profile) · Inactive: ${school.display_name}`}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={handleMergeSubmit}
                            disabled={!merging.selected || !merging.mergedName.trim() || busy === school.id}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40">
                            Confirm Merge
                          </button>
                          <button onClick={() => setMerging(null)}
                            className="px-3 py-1.5 border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">No schools match this filter.</div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {filtered.length} of {schools.length} schools shown ·
        S3 alignment: blue = changed from S2, strikethrough = old value
      </p>
    </div>
  )
}
