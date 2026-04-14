export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PageHeader } from '@/components/PageHeader'

type SchoolRow = {
  id: number
  display_name: string
  section: string | null
  classification: string | null
}

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; gender?: string }>
}) {
  const { q: raw, gender: genderParam } = await searchParams
  const q = raw?.trim().toLowerCase() ?? ''
  const gender = genderParam === 'girls' ? 'girls' : 'boys'

  const boysTypes = ['boys_districts', 'regions', 'boys_state']
  const girlsTypes = ['girls_districts', 'girls_regions', 'girls_state']
  const relevantTypes = gender === 'girls' ? girlsTypes : boysTypes

  const season = await getActiveSeason()

  const [schoolsResult, scoresResult] = await Promise.all([
    supabase
      .from('schools')
      .select('id, display_name, section, classification')
      .order('display_name'),
    supabase
      .from('precomputed_team_scores')
      .select('school_id, tournament_type, total_points')
      .eq('season_id', season)
      .in('tournament_type', relevantTypes),
  ])

  const allSchools = (schoolsResult.data ?? []) as SchoolRow[]

  // Sum postseason points per school for the selected gender
  const pointsMap = new Map<number, number>()
  for (const row of (scoresResult.data ?? []) as { school_id: number; tournament_type: string; total_points: number }[]) {
    pointsMap.set(row.school_id, (pointsMap.get(row.school_id) ?? 0) + Number(row.total_points))
  }

  const filtered = q
    ? allSchools.filter(s => s.display_name.toLowerCase().includes(q))
    : allSchools

  const isGirls = gender === 'girls'
  const accentSearch = isGirls ? 'focus:ring-rose-500' : 'focus:ring-slate-500'
  const accentBtn    = isGirls ? 'bg-rose-800 hover:bg-rose-700' : 'bg-slate-800 hover:bg-slate-700'
  const clearHref    = `/schools${isGirls ? '?gender=girls' : ''}`
  const seasonLabel  = season === 1 ? '2024–25' : '2025–26'

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-6 text-center">
        <PageHeader title="NJ Wrestling Schools" />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
          <span>{allSchools.length} schools · NJSIAA</span>
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

      {filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">No schools match &ldquo;{raw}&rdquo;.</p>
      ) : (
        <div className="border border-black rounded-none overflow-x-auto shadow-none bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">School</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500 hidden sm:table-cell">Section / Group</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-500 whitespace-nowrap">
                  {seasonLabel} Pts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => {
                const pts = pointsMap.get(s.id)
                const sectionGroup = s.section && s.classification
                  ? `${s.section} G${s.classification}`
                  : s.section ?? null
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/schools/${s.id}?gender=${gender}`}
                        prefetch={false}
                        className={`font-medium text-slate-800 hover:underline ${isGirls ? 'hover:text-rose-700' : 'hover:text-slate-600'}`}
                      >
                        {s.display_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">
                      {sectionGroup ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                      {pts ? pts.toFixed(1).replace(/\.0$/, '') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
