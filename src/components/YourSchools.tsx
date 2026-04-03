'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'

type SchoolInfo = {
  id: number
  display_name: string
  abbreviation: string | null
  section: string | null
  classification: string | null
}

export function YourSchools() {
  const [primarySchool, setPrimarySchool] = useState<SchoolInfo | null>(null)
  const [followedSchools, setFollowedSchools] = useState<SchoolInfo[]>([])
  const [preference, setPreference] = useState<string>('both')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowser()

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoaded(true); return }

      const { data: profile } = await supabase
        .from('users')
        .select('primary_school_id, followed_school_ids, wrestling_preference')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!profile) { setLoaded(true); return }
      const p = profile as { primary_school_id: number | null; followed_school_ids: number[] | null; wrestling_preference: string | null }

      setPreference(p.wrestling_preference ?? 'both')

      const allIds = [...new Set([
        ...(p.primary_school_id ? [p.primary_school_id] : []),
        ...(p.followed_school_ids ?? []),
      ])]

      if (allIds.length === 0) { setLoaded(true); return }

      // Fetch from schools table (has id column)
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('id, display_name, section, classification')
        .in('id', allIds)

      if (!schoolsData || schoolsData.length === 0) { setLoaded(true); return }

      // Get abbreviations from school_names by matching display_name
      const names = schoolsData.map(s => s.display_name)
      const { data: abbrevData } = await supabase
        .from('school_names')
        .select('abbreviation, school_name')
        .in('school_name', names)

      const abbrevMap = new Map((abbrevData ?? []).map(a => [a.school_name, a.abbreviation]))

      const schoolMap = new Map(schoolsData.map(s => [s.id, {
        id: s.id,
        display_name: s.display_name,
        abbreviation: abbrevMap.get(s.display_name) ?? null,
        section: s.section,
        classification: s.classification,
      }]))

      if (p.primary_school_id && schoolMap.has(p.primary_school_id)) {
        setPrimarySchool(schoolMap.get(p.primary_school_id)!)
      }

      const followed = (p.followed_school_ids ?? [])
        .filter(id => id !== p.primary_school_id && schoolMap.has(id))
        .map(id => schoolMap.get(id)!)
      setFollowedSchools(followed)

      setLoaded(true)
    })
  }, [])

  if (!loaded) return null
  if (!primarySchool && followedSchools.length === 0) return null

  const base = preference === 'girls' ? '/girls' : '/boys'

  const allSchools = [
    ...(primarySchool ? [{ ...primarySchool, isPrimary: true }] : []),
    ...followedSchools.map(s => ({ ...s, isPrimary: false })),
  ]

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Your Schools</h2>
      <div className="flex flex-wrap gap-2">
        {allSchools.map(s => {
          const label = s.section && s.classification
            ? s.section === 'Non-Public' ? `NP-${s.classification}` : `${s.section} G${s.classification}`
            : null
          return (
            <Link
              key={s.id}
              href={s.abbreviation ? `/schools/${encodeURIComponent(s.abbreviation)}` : '#'}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-none border text-sm font-medium transition-colors shadow-none ${
                s.isPrimary
                  ? 'border-black bg-blue-50 text-blue-800 hover:bg-blue-100'
                  : 'border-black bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              {s.display_name}
              {label && <span className="text-[10px] text-slate-400 font-normal">{label}</span>}
              {s.isPrimary && (
                <span className="text-[10px] text-blue-500 font-normal">Primary</span>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
