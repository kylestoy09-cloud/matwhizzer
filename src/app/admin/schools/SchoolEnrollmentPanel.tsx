'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import type { EnrolledSchool } from '@/app/api/admin/school-enrollment/route'

type Props = { seasonId: number; seasonLabel: string }

export function SchoolEnrollmentPanel({ seasonId, seasonLabel }: Props) {
  const { gender } = useAdminGender()
  const [schools, setSchools]   = useState<EnrolledSchool[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<'all' | 'active' | 'inactive'>('all')
  const [saving, setSaving]     = useState<number | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/school-enrollment?seasonId=${seasonId}&gender=${gender}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setSchools(json.schools)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [seasonId, gender])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let list = schools
    if (filter === 'active')   list = list.filter(s => !s.is_inactive)
    if (filter === 'inactive') list = list.filter(s => s.is_inactive)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.display_name.toLowerCase().includes(q) || s.short_name?.toLowerCase().includes(q))
    }
    return list
  }, [schools, filter, search])

  async function toggleStatus(school: EnrolledSchool) {
    setSaving(school.id)
    setError(null)
    try {
      const action = school.is_inactive ? 'activate' : 'deactivate'
      const res = await fetch('/api/admin/school-season-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: school.id, seasonId, gender, action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to save')
      setSchools(prev => prev.map(s => s.id === school.id ? { ...s, is_inactive: json.inactive } : s))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(null)
    }
  }

  const activeCount   = schools.filter(s => !s.is_inactive).length
  const inactiveCount = schools.filter(s => s.is_inactive).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            School Enrollment — {seasonLabel} · {gender === 'M' ? 'Boys' : 'Girls'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <button onClick={load} className="text-xs text-slate-400 hover:text-slate-700 border border-slate-200 rounded px-2 py-1">
          Refresh
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
      )}

      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Search schools…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-xs border border-slate-200 rounded px-2.5 py-1.5 w-48 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-2.5 py-1.5 rounded border transition-colors ${
              filter === f
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 py-8 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-xs text-slate-400 py-8 text-center">No schools match</div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded overflow-hidden">
          {filtered.map(s => (
            <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <Link href={`/admin/schools/${s.id}`} className={`text-xs font-medium hover:underline ${s.is_inactive ? 'text-slate-400' : 'text-slate-800'}`}>
                  {s.display_name}
                </Link>
                {s.coop_primary_id && (
                  <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                    member of {s.coop_primary_name}
                  </span>
                )}
                {s.coop_members.length > 0 && (
                  <span className="ml-2 text-[10px] text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                    coop: {s.coop_members.map(m => m.display_name).join(', ')}
                  </span>
                )}
                {s.is_inactive && (
                  <span className="ml-2 text-[10px] text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
                    inactive
                  </span>
                )}
              </div>
              <button
                onClick={() => toggleStatus(s)}
                disabled={saving === s.id}
                className={`ml-3 text-[11px] px-2.5 py-1 rounded border transition-colors disabled:opacity-50 ${
                  s.is_inactive
                    ? 'text-green-700 border-green-300 bg-green-50 hover:bg-green-100'
                    : 'text-red-600 border-red-200 bg-white hover:bg-red-50'
                }`}
              >
                {saving === s.id ? '…' : s.is_inactive ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
