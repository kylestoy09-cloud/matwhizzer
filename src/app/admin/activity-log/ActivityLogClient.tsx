'use client'

import { useCallback, useEffect, useState } from 'react'

type LogEntry = {
  id: string
  admin_email: string
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

const PAGE_SIZE = 50

export function ActivityLogClient() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterEmail, setFilterEmail] = useState('')
  const [filterEntityType, setFilterEntityType] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  // Detail panel
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) })
      if (filterEmail.trim())      params.set('admin_email', filterEmail.trim())
      if (filterEntityType.trim()) params.set('entity_type', filterEntityType.trim())
      if (filterAction.trim())     params.set('action', filterAction.trim())
      if (filterFrom)              params.set('from', filterFrom)
      if (filterTo)                params.set('to', filterTo + 'T23:59:59Z')
      const res = await fetch(`/api/admin/activity-log?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setEntries(json.entries)
      setTotal(json.total)
      setPage(p)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [filterEmail, filterEntityType, filterAction, filterFrom, filterTo])

  useEffect(() => { load(0) }, [load])

  function fmt(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-0.5">Admin</label>
          <input
            type="text"
            value={filterEmail}
            onChange={e => setFilterEmail(e.target.value)}
            placeholder="email@example.com"
            className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-0.5">Entity Type</label>
          <input
            type="text"
            value={filterEntityType}
            onChange={e => setFilterEntityType(e.target.value)}
            placeholder="school, wrestler…"
            className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-0.5">Action</label>
          <input
            type="text"
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            placeholder="school_profile_edit…"
            className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 w-44 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-0.5">From</label>
          <input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-0.5">To</label>
          <input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => load(0)}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          Search
        </button>
        <button
          onClick={() => {
            setFilterEmail(''); setFilterEntityType(''); setFilterAction('')
            setFilterFrom(''); setFilterTo('')
          }}
          className="px-3 py-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Summary */}
      <p className="text-xs text-slate-500">
        {loading ? 'Loading…' : `${total.toLocaleString()} entries${total > PAGE_SIZE ? `, page ${page + 1} of ${totalPages}` : ''}`}
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Table */}
      {!loading && entries.length === 0 && !error && (
        <p className="text-slate-400 text-sm">No log entries found.</p>
      )}
      {entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                <th className="px-3 py-1 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">Date / Time</th>
                <th className="px-3 py-1 font-semibold text-slate-600 dark:text-slate-400">Admin</th>
                <th className="px-3 py-1 font-semibold text-slate-600 dark:text-slate-400">Action</th>
                <th className="px-3 py-1 font-semibold text-slate-600 dark:text-slate-400">Entity</th>
                <th className="px-3 py-1 font-semibold text-slate-600 dark:text-slate-400">ID</th>
                <th className="px-3 py-1 font-semibold text-slate-600 dark:text-slate-400">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map(e => (
                <>
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-1 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono text-xs">
                      {fmt(e.created_at)}
                    </td>
                    <td className="px-3 py-1 text-slate-700 dark:text-slate-300 text-xs font-mono">
                      {e.admin_email}
                    </td>
                    <td className="px-3 py-1">
                      <span className="inline-block px-1.5 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                        {e.action}
                      </span>
                    </td>
                    <td className="px-3 py-1 text-slate-700 dark:text-slate-300 text-xs">
                      {e.entity_type}
                    </td>
                    <td className="px-3 py-1 text-slate-500 dark:text-slate-500 text-xs font-mono">
                      {e.entity_id ?? '—'}
                    </td>
                    <td className="px-3 py-1">
                      {e.details ? (
                        <button
                          onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {expanded === e.id ? 'hide' : 'view'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                  {expanded === e.id && e.details && (
                    <tr key={`${e.id}-detail`} className="bg-slate-50 dark:bg-slate-800/60">
                      <td colSpan={6} className="px-4 py-2">
                        <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all font-mono">
                          {JSON.stringify(e.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => load(page - 1)}
            disabled={page === 0 || loading}
            className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => load(page + 1)}
            disabled={page >= totalPages - 1 || loading}
            className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
