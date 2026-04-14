export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PageHeader } from '@/components/PageHeader'

type SchoolDirRow = {
  school: string
  school_name: string
  school_id: number | null
  total_points: number
  wrestler_count: number
}

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; gender?: string }>
}) {
  const { q: raw, gender: genderParam } = await searchParams
  const q = raw?.trim().toLowerCase() ?? ''
  const gender = genderParam === 'girls' ? 'girls' : 'boys'
  const genderCode = gender === 'girls' ? 'F' : 'M'

  const season = await getActiveSeason()

  const { data } = await supabase.rpc('school_directory', { p_gender: genderCode, p_season: season })
  const all = (data ?? []) as SchoolDirRow[]

  const rows = q
    ? all.filter(r =>
        r.school_name.toLowerCase().includes(q) ||
        r.school.toLowerCase().includes(q)
      )
    : all

  const isGirls = gender === 'girls'
  const accentSearch = isGirls ? 'focus:ring-rose-500' : 'focus:ring-slate-500'
  const accentBtn    = isGirls ? 'bg-rose-800 hover:bg-rose-700' : 'bg-slate-800 hover:bg-slate-700'
  const accentHover  = isGirls ? 'hover:text-rose-700' : 'hover:text-slate-600'
  const clearHref    = `/schools${isGirls ? '?gender=girls' : ''}`
  const seasonLabel  = season === 1 ? '2024–25' : '2025–26'

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6 text-center">
        <PageHeader title="NJ Wrestling Schools" />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
          <span>{all.length} schools · NJSIAA</span>
          <InlineSeasonPicker activeSeason={season} />
          <span>{isGirls ? 'girls' : 'boys'} postseason</span>
        </div>
      </div>

      {/* Gender toggle */}
      <div className="flex justify-center mb-6">
        <div className="flex rounded-none border border-slate-200 overflow-hidden text-sm">
          <Link
            href={q ? `/schools?q=${encodeURIComponent(raw ?? '')}` : '/schools'}
            className={`px-5 py-2 font-medium transition-colors ${!isGirls ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Boys
          </Link>
          <Link
            href={q ? `/schools?gender=girls&q=${encodeURIComponent(raw ?? '')}` : '/schools?gender=girls'}
            className={`px-5 py-2 font-medium transition-colors ${isGirls ? 'bg-rose-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Girls
          </Link>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6">
        {isGirls && <input type="hidden" name="gender" value="girls" />}
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={raw ?? ''}
            placeholder="Search by school name…"
            autoComplete="off"
            className={`flex-1 border border-slate-300 rounded-none px-4 py-2.5 text-base shadow-none focus:outline-none focus:ring-2 ${accentSearch}`}
          />
          <button
            type="submit"
            className={`${accentBtn} text-white px-5 py-2.5 rounded-none font-medium transition-colors`}
          >
            Filter
          </button>
          {q && (
            <Link
              href={clearHref}
              className="px-4 py-2.5 rounded-none border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-slate-500 text-sm">No schools match &ldquo;{raw}&rdquo;.</p>
      ) : (
        <div className="border border-black rounded-none overflow-x-auto shadow-none bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">School</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-500 whitespace-nowrap">
                  {seasonLabel} Points
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-500">Wrestlers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={`${r.school_id ?? r.school}-${gender}`} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={r.school_id ? `/schools/${r.school_id}?gender=${gender}` : '#'}
                      className={`font-medium text-slate-800 hover:underline ${accentHover}`}
                    >
                      {r.school_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {r.total_points > 0 ? r.total_points : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                    {r.wrestler_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
