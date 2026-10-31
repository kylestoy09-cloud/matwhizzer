'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

type SearchResult = {
  id: number | string
  name: string
  type: 'school' | 'oos-school' | 'wrestler' | 'oos-wrestler'
  subtitle?: string
  href: string
}

export function AdminSearch() {
  const { gender, side } = useAdminGender()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const supabase = createSupabaseBrowser()
    const pattern = `%${q}%`
    const genderFilter = gender === 'M' ? 'M' : 'F'

    const [schools, oosSchools, wrestlers, oosWrestlers] = await Promise.all([
      supabase
        .from('schools')
        .select('id, name')
        .ilike('name', pattern)
        .limit(5),
      supabase
        .from('oos_schools')
        .select('id, name')
        .ilike('name', pattern)
        .limit(4),
      supabase
        .from('wrestlers')
        .select('id, name, season_id, schools(name)')
        .ilike('name', pattern)
        .eq('gender', genderFilter)
        .order('season_id', { ascending: false })
        .limit(6),
      supabase
        .from('oos_wrestlers')
        .select('id, name, oos_schools(name)')
        .ilike('name', pattern)
        .eq('gender', genderFilter)
        .limit(4),
    ])

    const built: SearchResult[] = [
      ...(schools.data ?? []).map(s => ({
        id: s.id,
        name: s.name,
        type: 'school' as const,
        subtitle: 'NJ School',
        href: `/admin/${side}/schools/${s.id}`,
      })),
      ...(oosSchools.data ?? []).map(s => ({
        id: s.id,
        name: s.name,
        type: 'oos-school' as const,
        subtitle: 'OOS School',
        href: `/admin/${side}/oos-schools`,
      })),
      ...(wrestlers.data ?? []).map(w => ({
        id: w.id,
        name: w.name,
        type: 'wrestler' as const,
        subtitle: (w.schools as unknown as { name: string } | null)?.name ?? 'Wrestler',
        href: `/admin/${side}/wrestlers/${w.id}`,
      })),
      ...(oosWrestlers.data ?? []).map(w => ({
        id: w.id,
        name: w.name,
        type: 'oos-wrestler' as const,
        subtitle: (w.oos_schools as unknown as { name: string } | null)?.name ?? 'OOS Wrestler',
        href: `/admin/${side}/oos-wrestlers`,
      })),
    ]

    setResults(built)
    setLoading(false)
    setOpen(built.length > 0)
    setActiveIdx(-1)
  }, [gender, side])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 220)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      router.push(results[activeIdx].href)
      setOpen(false)
      setQuery('')
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const typeLabel: Record<SearchResult['type'], string> = {
    school: 'School',
    'oos-school': 'OOS',
    wrestler: 'Wrestler',
    'oos-wrestler': 'OOS',
  }

  const typeBadge: Record<SearchResult['type'], string> = {
    school: 'bg-blue-500/20 text-blue-300',
    'oos-school': 'bg-yellow-500/20 text-yellow-300',
    wrestler: 'bg-green-500/20 text-green-300',
    'oos-wrestler': 'bg-orange-500/20 text-orange-300',
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none"
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); if (e.target.value.length >= 2) setOpen(true) }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search schools & wrestlers…"
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded shadow-2xl z-[100] max-h-80 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => {
                router.push(r.href)
                setOpen(false)
                setQuery('')
              }}
              className={`w-full text-left flex items-center gap-3 px-3 py-2 transition-colors ${
                i === activeIdx ? 'bg-slate-700' : 'hover:bg-slate-700/50'
              }`}
            >
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${typeBadge[r.type]}`}>
                {typeLabel[r.type]}
              </span>
              <div className="min-w-0">
                <div className="text-sm text-slate-200 truncate">{r.name}</div>
                {r.subtitle && <div className="text-[10px] text-slate-500 truncate">{r.subtitle}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
