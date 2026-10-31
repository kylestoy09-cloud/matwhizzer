'use client'

import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { useState, useEffect, useTransition } from 'react'

type Wrestler = {
  id: string
  first_name: string
  last_name: string
  gender: string
  display_name: string
  bout_count: number
  placement_count: number
}

type DupGroup = Wrestler[]

export function OosWrestlersClient() {
  const { gender } = useAdminGender()
  const [wrestlers, setWrestlers]   = useState<Wrestler[]>([])
  const [duplicates, setDuplicates] = useState<DupGroup[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [tab, setTab]               = useState<'all' | 'duplicates'>('duplicates')
  const [merging, setMerging]       = useState<string | null>(null)
  const [mergeMsg, setMergeMsg]     = useState<Record<string, string>>({})
  const [pendingMerge, setPendingMerge] = useState<Wrestler | null>(null)
  const [isPending, startTransition]   = useTransition()

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/oos-wrestlers?gender=${gender}`)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setWrestlers(d.wrestlers)
      setDuplicates(d.duplicates)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [gender])

  async function merge(keep_id: string, merge_id: string, groupKey: string) {
    setMerging(groupKey)
    try {
      const res = await fetch('/api/admin/oos-wrestlers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'merge', keep_id, merge_id }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setMergeMsg(prev => ({ ...prev, [groupKey]: '✓ Merged' }))
      startTransition(() => { load() })
    } catch (e) {
      setMergeMsg(prev => ({ ...prev, [groupKey]: `Error: ${String(e)}` }))
    } finally {
      setMerging(null)
      setPendingMerge(null)
    }
  }

  // The API returns this side's wrestlers only
  const genderFiltered = wrestlers

  const filtered = genderFiltered.filter(w =>
    w.display_name.toLowerCase().includes(search.toLowerCase())
  )

  const dupFiltered = duplicates

  const total_bouts = wrestlers.reduce((s, r) => s + r.bout_count, 0)

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading…</div>
  if (error)   return <div className="p-8 text-sm text-red-600">{error}</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">OOS Wrestlers</h1>
        <p className="text-sm text-slate-500 mt-1">
          {wrestlers.length} out-of-state wrestlers · {total_bouts.toLocaleString()} total bout appearances
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['duplicates', 'all'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-black text-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t === 'duplicates'
              ? `Suspected Duplicates${dupFiltered.length > 0 ? ` (${dupFiltered.length})` : ''}`
              : `All Wrestlers (${filtered.length})`}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        {tab === 'all' && (
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by name…"
            className="w-full max-w-sm text-sm border border-slate-300 px-3 py-1.5 focus:outline-none focus:border-black"
          />
        )}
        {pendingMerge && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 text-sm text-blue-800">
            <span>Merging: <strong>{pendingMerge.display_name}</strong></span>
            <button onClick={() => setPendingMerge(null)} className="text-blue-400 hover:text-blue-600 ml-1">✕</button>
          </div>
        )}
      </div>

      {tab === 'duplicates' && (
        <div className="space-y-4">
          {dupFiltered.length === 0 && (
            <p className="text-sm text-slate-500">No suspected duplicates found.</p>
          )}
          {dupFiltered.map(group => {
            const groupKey = group.map(w => w.id).sort().join('-')
            return (
              <div key={groupKey} className="border border-amber-200 bg-amber-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Suspected duplicates</p>
                <div className="divide-y divide-amber-100">
                  {group.map(w => (
                    <div key={w.id} className="py-2 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-sm font-medium text-slate-900">{w.display_name}</span>
                        <span className="text-xs text-slate-400 ml-2">{w.gender === 'M' ? 'Boys' : 'Girls'}</span>
                        <UsagePills wrestler={w} />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {group.filter(o => o.id !== w.id).map(other => (
                          <button
                            key={other.id}
                            disabled={merging === groupKey}
                            onClick={() => merge(w.id, other.id, groupKey)}
                            className="px-2.5 py-1 text-xs bg-black text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
                          >
                            Keep this · drop "{other.display_name}"
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {mergeMsg[groupKey] && (
                  <p className="text-xs text-slate-600">{mergeMsg[groupKey]}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'all' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">Gender</th>
                <th className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Bouts</th>
                <th className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Places</th>
                <th className="px-3 py-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(w => {
                const isDup = duplicates.some(g => g.some(x => x.id === w.id))
                const isPendingRow = pendingMerge?.id === w.id
                const groupKey = pendingMerge ? `manual-${[pendingMerge.id, w.id].sort().join('-')}` : ''
                return (
                  <tr key={w.id} className={isPendingRow ? 'bg-blue-50' : isDup ? 'bg-amber-50' : ''}>
                    <td className="px-3 py-1 font-medium text-slate-900">
                      {w.display_name}
                      {isDup && <span className="ml-2 text-[10px] text-amber-600 font-semibold">DUP</span>}
                    </td>
                    <td className="px-3 py-1 text-slate-500 text-xs">{w.gender === 'M' ? 'Boys' : 'Girls'}</td>
                    <td className="px-3 py-1 text-right tabular-nums text-slate-600">{w.bout_count || '—'}</td>
                    <td className="px-3 py-1 text-right tabular-nums text-slate-600">{w.placement_count || '—'}</td>
                    <td className="px-3 py-1 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">{w.id.slice(0, 8)}</span>
                        {!pendingMerge && (
                          <button
                            onClick={() => setPendingMerge(w)}
                            className="text-[10px] px-1.5 py-0.5 text-slate-500 border border-slate-300 hover:border-black hover:text-black transition-colors"
                          >
                            Merge
                          </button>
                        )}
                        {pendingMerge && !isPendingRow && (
                          <button
                            disabled={merging === groupKey}
                            onClick={async () => {
                              await merge(w.id, pendingMerge.id, groupKey)
                            }}
                            className="text-[10px] px-1.5 py-0.5 bg-black text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
                          >
                            Keep this · drop "{pendingMerge.display_name}"
                          </button>
                        )}
                        {isPendingRow && (
                          <span className="text-[10px] text-blue-600">select target →</span>
                        )}
                        {mergeMsg[groupKey] && (
                          <span className="text-[10px] text-green-700">{mergeMsg[groupKey]}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 py-4 text-center">No wrestlers match your filters.</p>
          )}
        </div>
      )}
    </div>
  )
}

function UsagePills({ wrestler }: { wrestler: Wrestler }) {
  const pills = [
    wrestler.bout_count > 0      && `${wrestler.bout_count} bouts`,
    wrestler.placement_count > 0 && `${wrestler.placement_count} placements`,
  ].filter(Boolean) as string[]

  if (!pills.length) return <span className="ml-2 text-xs text-slate-400">no usage</span>

  return (
    <span className="ml-2">
      {pills.map(p => (
        <span key={p} className="inline-block mr-1.5 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
          {p}
        </span>
      ))}
    </span>
  )
}
