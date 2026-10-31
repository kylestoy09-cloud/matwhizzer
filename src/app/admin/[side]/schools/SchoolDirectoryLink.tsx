'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type School = { id: number; display_name: string; short_name: string | null }

export function SchoolDirectoryLink({ schools }: { schools: School[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return schools
    const q = query.toLowerCase()
    return schools.filter(s =>
      s.display_name.toLowerCase().includes(q) ||
      (s.short_name?.toLowerCase().includes(q) ?? false)
    )
  }, [query, schools])

  return (
    <div>
      <input
        type="text"
        placeholder="Filter schools…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full max-w-sm border border-slate-300 rounded px-3 py-1.5 text-sm bg-white mb-3"
      />
      <div className="border border-slate-200 rounded overflow-hidden max-h-[600px] overflow-y-auto">
        {filtered.map((s, i) => (
          <Link
            key={s.id}
            href={`/admin/schools/${s.id}`}
            className={`flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
          >
            <span className="text-slate-800 font-medium">{s.display_name}</span>
            <span className="text-xs text-slate-400">#{s.id}</span>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-400 text-center">No schools match.</p>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-1.5">{filtered.length} of {schools.length} schools</p>
    </div>
  )
}
