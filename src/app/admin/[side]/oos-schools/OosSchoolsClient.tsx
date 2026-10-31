'use client'

import { useState, useEffect, useTransition } from 'react'

type School = {
  id: number
  display_name: string
  bout_count: number
  placement_count: number
  alias_count: number
  team_score_count: number
}

type DupGroup = School[]

export function OosSchoolsClient() {
  const [schools, setSchools]       = useState<School[]>([])
  const [duplicates, setDuplicates] = useState<DupGroup[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [merging, setMerging]       = useState<string | null>(null)
  const [mergeMsg, setMergeMsg]     = useState<Record<string, string>>({})
  const [tab, setTab]               = useState<'all' | 'duplicates'>('duplicates')
  const [isPending, startTransition] = useTransition()
  const [pendingMerge, setPendingMerge] = useState<School | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/oos-schools')
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setSchools(d.schools)
      setDuplicates(d.duplicates)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function merge(keep_id: number, merge_id: number, groupKey: string) {
    setMerging(groupKey)
    try {
      const res = await fetch('/api/admin/oos-schools', {
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
    }
  }

  const filtered = schools.filter(s =>
    s.display_name.toLowerCase().includes(search.toLowerCase())
  )

  const total_bouts = schools.reduce((s, r) => s + r.bout_count, 0)

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading…</div>
  if (error)   return <div className="p-8 text-sm text-red-600">{error}</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">OOS Schools</h1>
        <p className="text-sm text-slate-500 mt-1">
          {schools.length} out-of-state schools · {total_bouts.toLocaleString()} total bout appearances
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
              ? `Suspected Duplicates${duplicates.length > 0 ? ` (${duplicates.length})` : ''}`
              : `All Schools (${schools.length})`}
          </button>
        ))}
      </div>

      {tab === 'duplicates' && (
        <div className="space-y-4">
          {duplicates.length === 0 && (
            <p className="text-sm text-slate-500">No suspected duplicates found.</p>
          )}
          {duplicates.map(group => {
            const groupKey = group.map(s => s.id).sort().join('-')
            return (
              <div key={groupKey} className="border border-amber-200 bg-amber-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Suspected duplicates</p>
                <div className="divide-y divide-amber-100">
                  {group.map(school => (
                    <div key={school.id} className="py-2 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-sm font-medium text-slate-900">{school.display_name}</span>
                        <span className="text-xs text-slate-400 ml-2">id:{school.id}</span>
                        <UsagePills school={school} />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {group.filter(o => o.id !== school.id).map(other => (
                          <button
                            key={other.id}
                            disabled={merging === groupKey}
                            onClick={() => merge(school.id, other.id, groupKey)}
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
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by name…"
              className="w-full max-w-sm text-sm border border-slate-300 px-3 py-1.5 focus:outline-none focus:border-black"
            />
            {pendingMerge && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 text-sm text-blue-800">
                <span>Merging: <strong>{pendingMerge.display_name}</strong></span>
                <button onClick={() => setPendingMerge(null)} className="text-blue-400 hover:text-blue-600 ml-1">✕</button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">School</th>
                  <th className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Bouts</th>
                  <th className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Places</th>
                  <th className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Aliases</th>
                  <th className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Team Scores</th>
                  <th className="px-3 py-1"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => {
                  const isDup = duplicates.some(g => g.some(x => x.id === s.id))
                  const isPending = pendingMerge?.id === s.id
                  const groupKey = pendingMerge ? `manual-${[pendingMerge.id, s.id].sort().join('-')}` : ''
                  return (
                    <tr key={s.id} className={isPending ? 'bg-blue-50' : isDup ? 'bg-amber-50' : ''}>
                      <td className="px-3 py-1 font-medium text-slate-900">
                        {s.display_name}
                        {isDup && <span className="ml-2 text-[10px] text-amber-600 font-semibold">DUP</span>}
                      </td>
                      <td className="px-3 py-1 text-right tabular-nums text-slate-600">{s.bout_count || '—'}</td>
                      <td className="px-3 py-1 text-right tabular-nums text-slate-600">{s.placement_count || '—'}</td>
                      <td className="px-3 py-1 text-right tabular-nums text-slate-600">{s.alias_count || '—'}</td>
                      <td className="px-3 py-1 text-right tabular-nums text-slate-600">{s.team_score_count || '—'}</td>
                      <td className="px-3 py-1 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] text-slate-400">id:{s.id}</span>
                          {!pendingMerge && (
                            <button
                              onClick={() => setPendingMerge(s)}
                              className="text-[10px] px-1.5 py-0.5 text-slate-500 border border-slate-300 hover:border-black hover:text-black transition-colors"
                            >
                              Merge
                            </button>
                          )}
                          {pendingMerge && !isPending && (
                            <button
                              disabled={merging === groupKey}
                              onClick={async () => {
                                await merge(s.id, pendingMerge.id, groupKey)
                                setPendingMerge(null)
                              }}
                              className="text-[10px] px-1.5 py-0.5 bg-black text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
                            >
                              Keep this · drop "{pendingMerge.display_name}"
                            </button>
                          )}
                          {isPending && (
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
              <p className="text-sm text-slate-400 py-4 text-center">No schools match "{search}"</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function UsagePills({ school }: { school: School }) {
  const pills = [
    school.bout_count > 0        && `${school.bout_count} bouts`,
    school.placement_count > 0   && `${school.placement_count} placements`,
    school.alias_count > 0       && `${school.alias_count} aliases`,
    school.team_score_count > 0  && `${school.team_score_count} team scores`,
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
