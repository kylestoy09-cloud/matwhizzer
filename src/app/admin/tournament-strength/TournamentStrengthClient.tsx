'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

export type StrengthRow = {
  tournament_id:     string
  tournament_name:   string
  start_date:        string
  point_value:       number | null
  has_finals:        boolean
  has_3rd_place:     boolean
  has_5th_place:     boolean
  has_7th_place:     boolean
  district_champs:   number
  region_top4:       number
  state_qualifiers:  number
  total_nj_wrestlers: number
}

const POINT_OPTIONS = [20, 15, 10, 5, 1] as const

function downloadCsv(rows: StrengthRow[], gender: 'M' | 'F') {
  const header = ['Tournament', 'Date', 'Points', 'Dist. Champs', 'Region Top 4', 'State Quals', 'NJ Wrestlers']
  const prog = gender === 'F' ? 'girls' : 'boys'
  const lines = [
    header.join(','),
    ...rows.map(r => [
      `"${r.tournament_name.replace(/"/g, '""')}"`,
      r.start_date,
      r.point_value ?? '',
      r.district_champs,
      r.region_top4,
      r.state_qualifiers,
      r.total_nj_wrestlers,
    ].join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tournament-strength-2025-26-${prog}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function BracketStatus({ row }: { row: StrengthRow }) {
  const pv = row.point_value

  const tiers: { label: string; has: boolean; needed: boolean }[] = [
    { label: 'F',   has: row.has_finals,    needed: pv !== null },
    { label: '3rd', has: row.has_3rd_place, needed: pv !== null && pv >= 10 },
    { label: '5th', has: row.has_5th_place, needed: pv !== null && pv >= 15 },
    { label: '7th', has: row.has_7th_place, needed: pv !== null && pv >= 20 },
  ]

  const relevantTiers = pv !== null ? tiers.filter(t => t.needed) : tiers.filter(t => t.has)
  if (relevantTiers.length === 0 && pv === null) return <span className="text-slate-300 text-xs">—</span>

  return (
    <div className="flex gap-1 flex-wrap">
      {relevantTiers.map(t => (
        <span
          key={t.label}
          className={`text-[10px] font-semibold px-1.5 py-0.5 ${
            t.has ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
          }`}
        >
          {t.label}
        </span>
      ))}
    </div>
  )
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function PointValueDropdown({ row, onSaved }: { row: StrengthRow; onSaved: (id: string, value: number | null) => void }) {
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value
    const value = raw === '' ? null : Number(raw) as 1 | 5 | 10 | 15 | 20
    setSaveState('saving')
    try {
      const res = await fetch('/api/admin/update-tournament-point-value', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.tournament_id, point_value: value }),
      })
      if (!res.ok) throw new Error()
      onSaved(row.tournament_id, value)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 1500)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 2000)
    }
  }, [row.tournament_id, onSaved])

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={row.point_value ?? ''}
        onChange={handleChange}
        disabled={saveState === 'saving'}
        className="text-xs border border-slate-200 bg-white px-1.5 py-1 text-slate-700 focus:outline-none focus:border-slate-400 disabled:opacity-50 w-20"
      >
        <option value="">— none —</option>
        {POINT_OPTIONS.map(v => (
          <option key={v} value={v}>{v} pts</option>
        ))}
      </select>
      {saveState === 'saving' && <span className="text-[10px] text-slate-400">saving…</span>}
      {saveState === 'saved'  && <span className="text-[10px] text-emerald-600">saved</span>}
      {saveState === 'error'  && <span className="text-[10px] text-red-600">error</span>}
    </div>
  )
}

type SortCol = keyof Omit<StrengthRow, 'tournament_id' | 'has_finals' | 'has_3rd_place' | 'has_5th_place' | 'has_7th_place'>

export function TournamentStrengthClient() {
  const { gender } = useAdminGender()
  const [rows, setRows]       = useState<StrengthRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [sort, setSort]       = useState<SortCol>('start_date')
  const [dir, setDir]         = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    setLoading(true)
    setFetchError(null)
    fetch(`/api/admin/tournament-strength?gender=${gender}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setRows(d.rows ?? [])
      })
      .catch(e => setFetchError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false))
  }, [gender])

  const handleSaved = useCallback((id: string, value: number | null) => {
    setRows(prev => prev.map(r => r.tournament_id === id ? { ...r, point_value: value } : r))
  }, [])

  function toggleSort(col: SortCol) {
    if (sort === col) setDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(col); setDir('desc') }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sort]
    const bv = b[sort]
    const aN = av === null ? -Infinity : av
    const bN = bv === null ? -Infinity : bv
    const cmp = typeof av === 'number' || av === null
      ? (aN as number) - (bN as number)
      : String(av).localeCompare(String(bv))
    return dir === 'asc' ? cmp : -cmp
  })

  const assigned   = rows.filter(r => r.point_value !== null).length
  const unassigned = rows.length - assigned
  const prog = gender === 'F' ? 'Girls' : 'Boys'

  function ColHeader({ col, label }: { col: SortCol; label: string }) {
    const active = sort === col
    return (
      <th
        onClick={() => toggleSort(col)}
        className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none whitespace-nowrap hover:text-slate-800 transition-colors"
      >
        {label}
        {active && <span className="ml-1 text-slate-400">{dir === 'asc' ? '▲' : '▼'}</span>}
      </th>
    )
  }

  if (loading) return <p className="text-sm text-slate-400">Loading {prog} tournaments…</p>

  if (fetchError) {
    return (
      <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <p className="font-semibold mb-1">Failed to load report</p>
        <p className="font-mono text-xs">{fetchError}</p>
        <p className="mt-2 text-xs text-red-500">
          If you see &quot;function does not exist&quot;, run the migration first:
          <code className="ml-1 font-mono">docs/migrations/20260825_tournament_strength_gender.sql</code>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{rows.length} {prog} tournaments · 2025–26 season · 2024–25 postseason accolades</p>
          {unassigned > 0 ? (
            <p className="text-xs text-amber-600 mt-0.5">
              {assigned} of {rows.length} assigned point values · {unassigned} remaining
            </p>
          ) : assigned > 0 ? (
            <p className="text-xs text-emerald-600 mt-0.5">All {rows.length} tournaments have point values assigned</p>
          ) : null}
        </div>
        <button
          onClick={() => downloadCsv(sorted, gender)}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Download CSV
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <ColHeader col="tournament_name" label="Tournament" />
              <ColHeader col="start_date"      label="Date" />
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Points</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Bracket</th>
              <ColHeader col="district_champs"    label="Dist. Champs" />
              <ColHeader col="region_top4"        label="Region Top 4" />
              <ColHeader col="state_qualifiers"   label="State Quals" />
              <ColHeader col="total_nj_wrestlers" label="NJ Wrestlers" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((r, i) => (
              <tr key={r.tournament_id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="px-3 py-2 font-medium text-slate-900 max-w-xs truncate">{r.tournament_name}</td>
                <td className="px-3 py-2 text-slate-500 tabular-nums whitespace-nowrap">{r.start_date}</td>
                <td className="px-3 py-2">
                  <PointValueDropdown row={r} onSaved={handleSaved} />
                </td>
                <td className="px-3 py-2">
                  <BracketStatus row={r} />
                </td>
                <td className="px-3 py-2 tabular-nums text-right">
                  <span className={r.district_champs > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                    {r.district_champs}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums text-right">
                  <span className={r.region_top4 > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                    {r.region_top4}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums text-right">
                  <span className={r.state_qualifiers > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                    {r.state_qualifiers}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-600">{r.total_nj_wrestlers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
