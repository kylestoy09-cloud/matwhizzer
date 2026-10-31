'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { ImportClient } from '@/app/admin/[side]/import/ImportClient'
import { DualAuditClient } from '@/app/admin/[side]/dual-audit/DualAuditClient'
import type { DualMeetOption } from '@/app/admin/[side]/dual-audit/page'

type Tab = 'import' | 'audit'

export function DualHubClient() {
  const { gender } = useAdminGender()
  const [tab, setTab]     = useState<Tab>('import')
  const [meets, setMeets] = useState<DualMeetOption[]>([])
  const [loading, setLoading] = useState(true)

  // Team/date search state
  const [teamSearch, setTeamSearch] = useState('')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/dual-meets?gender=${gender}`)
      .then(r => r.json())
      .then(d => { setMeets(d.meets ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [gender])

  const filteredMeets = useMemo(() => {
    let list = meets
    if (teamSearch.trim()) {
      const q = teamSearch.trim().toLowerCase()
      list = list.filter(m =>
        (m.team1_name ?? '').toLowerCase().includes(q) ||
        (m.team2_name ?? '').toLowerCase().includes(q)
      )
    }
    if (dateFrom) list = list.filter(m => m.meet_date >= dateFrom)
    if (dateTo)   list = list.filter(m => m.meet_date <= dateTo)
    return list
  }, [meets, teamSearch, dateFrom, dateTo])

  const prog = gender === 'F' ? 'Girls' : 'Boys'

  const TABS: { id: Tab; label: string }[] = [
    { id: 'audit',  label: 'Audit' },
    { id: 'import', label: 'Import' },
  ]

  return (
    <div className="p-6 h-full">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-lg font-bold text-slate-900">{prog} Dual Hub</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {loading ? 'Loading…' : `${meets.length} dual meets`}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-0">
        <nav className="flex gap-0 -mb-px">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-black text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {t.label}
              {t.id === 'audit' && meets.length > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  tab === 'audit' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {meets.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'import' && (
        <div className="pt-6">
          <ImportClient />
        </div>
      )}

      {tab === 'audit' && (
        <div className="pt-4">
          {/* Search bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4 p-3 border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 shrink-0">Team</label>
              <input
                type="text"
                placeholder="Search team name…"
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                className="text-sm border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-black w-48"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 shrink-0">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="text-sm border border-slate-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 shrink-0">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="text-sm border border-slate-300 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            {(teamSearch || dateFrom || dateTo) && (
              <button
                onClick={() => { setTeamSearch(''); setDateFrom(''); setDateTo('') }}
                className="text-xs text-slate-400 hover:text-slate-700 transition-colors underline"
              >
                Clear
              </button>
            )}
            <span className="text-xs text-slate-400 ml-auto">
              {filteredMeets.length} of {meets.length}
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
          ) : meets.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              No {prog.toLowerCase()} dual meets found. Import dual meet data first.
            </p>
          ) : (
            <DualAuditClient meets={filteredMeets} />
          )}
        </div>
      )}
    </div>
  )
}
