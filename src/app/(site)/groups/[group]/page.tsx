import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { groupFromSlugRaw, getSectionsForGroup, sectionToSlug } from '@/lib/sections'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'

type SchoolRow = {
  id: number
  display_name: string
  mascot: string | null
  primary_color: string | null
  logo_url: string | null
  header_background: string | null
  section: string | null
}

type PPRow = {
  school_id: number
  power_points: number
  frozen_power_points: number | null
  overall_wins: number
  overall_losses: number
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ group: string }>
  searchParams: Promise<{ gender?: string }>
}) {
  const { group: slug } = await params
  const { gender: genderParam } = await searchParams
  const gender = genderParam === 'girls' ? 'girls' : 'boys'
  const dbGender = gender === 'girls' ? 'F' : 'M'
  const season = await getActiveSeason()

  const groupName = groupFromSlugRaw(slug)
  if (!groupName) notFound()

  const label = isNaN(Number(groupName)) ? `Non-Public ${groupName}` : `Group ${groupName}`
  const isNonPublic = groupName === 'A' || groupName === 'B'

  const { data: schoolsData } = await supabase
    .from('schools')
    .select('id, display_name, mascot, primary_color, logo_url, header_background, section')
    .eq('classification', groupName)
    .eq('is_combined', false)
    .eq('is_nj', true)
    .order('display_name')

  const schools = (schoolsData ?? []) as SchoolRow[]
  if (schools.length === 0) notFound()

  const schoolIds = schools.map(s => s.id)

  const { data: ppData } = await supabase
    .from('power_points')
    .select('school_id, power_points, frozen_power_points, overall_wins, overall_losses')
    .in('school_id', schoolIds)
    .eq('season_id', season)
    .eq('gender', dbGender)

  const ppMap = new Map<number, PPRow>()
  for (const r of (ppData ?? []) as PPRow[]) ppMap.set(r.school_id, r)

  const sections = getSectionsForGroup(groupName)
  const bySectionPP = new Map<string, (SchoolRow & { pp: PPRow | null })[]>()
  for (const sec of sections) bySectionPP.set(sec, [])

  for (const s of schools) {
    const sec = s.section ?? sections[0]
    bySectionPP.get(sec)?.push({ ...s, pp: ppMap.get(s.id) ?? null })
  }

  for (const [, rows] of bySectionPP) {
    rows.sort((a, b) => (b.pp ? (b.pp.frozen_power_points ?? b.pp.power_points) : 0) - (a.pp ? (a.pp.frozen_power_points ?? a.pp.power_points) : 0))
  }

  const hasPP = ppData && ppData.length > 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/groups" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        ← All Groups
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{label}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {schools.length} schools statewide · {gender === 'girls' ? 'Girls' : 'Boys'} Wrestling
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex rounded-none border border-slate-200 overflow-hidden text-sm">
            <Link href={`/groups/${slug}?gender=boys`} className={`px-3 py-1.5 font-medium transition-colors ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Boys</Link>
            <Link href={`/groups/${slug}?gender=girls`} className={`px-3 py-1.5 font-medium transition-colors ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Girls</Link>
          </div>
          <div className="text-xs text-slate-400"><InlineSeasonPicker activeSeason={season} /></div>
        </div>
      </div>

      {/* Section links */}
      <div className="flex flex-wrap gap-2 mb-8">
        {sections.map(sec => (
          <Link key={sec} href={`/sections/${sectionToSlug(sec)}/${slug}?gender=${gender}`}
            className="px-3 py-1.5 rounded-none border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
            {sec}
          </Link>
        ))}
      </div>

      {isNonPublic && (
        <p className="text-sm text-slate-500 mb-6 italic">
          Non-Public schools are seeded by committee — Power Points are used as one of several criteria, not the sole determinant.
        </p>
      )}

      {!hasPP ? (
        <div className="border border-black rounded-none bg-white px-6 py-8 text-center text-slate-500 text-sm">
          Power Points not yet computed for this season.
          Run <code className="font-mono bg-slate-100 px-1">scripts/compute_power_points.mts</code> to generate them.
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map(sec => {
            const rows = bySectionPP.get(sec) ?? []
            if (rows.length === 0) return null
            return (
              <div key={sec} className="border border-black rounded-none overflow-hidden shadow-none bg-white">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{sec}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[480px] w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-center px-3 py-2 font-medium text-slate-500 w-10">#</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-500">School</th>
                        <th className="text-center px-3 py-2 font-medium text-slate-500 w-20">Record</th>
                        <th className="text-right px-4 py-2 font-medium text-slate-500 w-28">Power Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, i) => {
                        const pp = row.pp
                        return (
                          <tr key={row.id} className={`hover:bg-slate-50 ${!isNonPublic && i >= 8 ? 'opacity-60' : ''}`}>
                            <td className="px-3 py-2.5 text-center text-slate-400 text-xs font-medium">
                              {i + 1}
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-800">
                              <div className="flex items-center gap-2">
                                <SchoolLogoBadge
                                  logoUrl={row.logo_url}
                                  bgColor={row.header_background ?? row.primary_color ?? null}
                                />
                                <Link href={`/${gender}/schools/${row.id}`} className="hover:text-blue-600 transition-colors">
                                  {row.display_name}
                                </Link>
                                {row.mascot && <span className="text-xs text-slate-400">{row.mascot}</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-600 tabular-nums">
                              {pp ? `${pp.overall_wins}-${pp.overall_losses}` : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
                              {pp ? (pp.frozen_power_points ?? pp.power_points).toFixed(2) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {!isNonPublic && (
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-400">
                    Top 8 qualify for the team tournament
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
