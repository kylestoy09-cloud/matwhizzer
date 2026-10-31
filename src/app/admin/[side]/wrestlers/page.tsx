'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { AdminBackButton } from '@/app/admin/AdminBackButton'

type WrestlerResult = { id: string; display_name: string; gender: string }

export default function WrestlersDirectoryPage() {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<WrestlerResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(val: string) {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/search-wrestlers?q=${encodeURIComponent(val)}`)
        const d = await res.json()
        setResults(d.wrestlers ?? [])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-2">Wrestlers</h1>
      <p className="text-sm text-slate-500 mb-6">
        Search for a wrestler to view or edit their profile. For bulk changes use the
        season rollover tool. For transfer review see{' '}
        <Link href="/admin/wrestlers/pending-transfers" className="underline text-slate-700">
          Pending Transfers
        </Link>.
      </p>

      <div className="mb-4">
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search by name…"
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          autoFocus
        />
      </div>

      {loading && <p className="text-sm text-slate-400">Searching…</p>}

      {!loading && results.length > 0 && (
        <div className="border border-slate-200 rounded overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {results.map(w => (
              <li key={w.id}>
                <Link
                  href={`/admin/wrestlers/${w.id}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{w.display_name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${w.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                      {w.gender === 'F' ? 'Girls' : 'Boys'}
                    </span>
                  </span>
                  <span className="text-slate-400 text-xs">Edit →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && query.trim() && results.length === 0 && (
        <p className="text-sm text-slate-400">No wrestlers found for &ldquo;{query}&rdquo;.</p>
      )}
    </div>
  )
}
