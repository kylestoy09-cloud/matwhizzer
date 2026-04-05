export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'

const SLUG = 'independent'
const NAME = 'Independent'
const ACCENT = '#0f172a'

type DirRow = { school: string; school_name: string }
type SchoolRow = { id: number; display_name: string; section: string | null; classification: string | null; logo_url: string | null }

function classLabel(s: SchoolRow) {
  if (!s.section || !s.classification) return null
  return s.section === 'Non-Public'
    ? `NP-${s.classification}`
    : `${s.section} G${s.classification}`
}

export default async function IndependentConferencePage({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string }>
}) {
  const { gender: genderParam } = await searchParams
  const gender = genderParam === 'girls' ? 'girls' : 'boys'
  const season = await getActiveSeason()

  // Conference logo
  const { data: confData } = await supabase
    .from('conferences')
    .select('logo_url')
    .eq('slug', SLUG)
    .maybeSingle()
  const logoUrl = confData?.logo_url ?? null

  // All boys schools in season via school_directory
  const { data: dirData } = await supabase
    .rpc('school_directory', { p_gender: 'M', p_season: season })
  const dirNameToAbbrev = new Map<string, string>(
    ((dirData ?? []) as DirRow[]).map(r => [r.school_name, r.school])
  )

  // All school_ids in conference_standings for season
  const { data: csData } = await supabase
    .from('conference_standings')
    .select('school_id')
    .eq('season_id', season)
    .not('school_id', 'is', null)
  const csIds = new Set((csData ?? []).map(r => (r as { school_id: number }).school_id))

  // All schools — build display_name → school lookup
  const { data: allSchoolsData } = await supabase
    .from('schools')
    .select('id, display_name, section, classification, logo_url')
    .order('display_name')
  const allSchools = (allSchoolsData ?? []) as SchoolRow[]
  const nameToSchool = new Map(allSchools.map(s => [s.display_name, s]))

  // Schools present in directory but absent from conference_standings
  const independentSchools: (SchoolRow & { abbreviation: string })[] = []
  for (const [schoolName, abbrev] of dirNameToAbbrev) {
    const school = nameToSchool.get(schoolName)
    if (!school) continue
    if (csIds.has(school.id)) continue
    independentSchools.push({ ...school, abbreviation: abbrev })
  }
  independentSchools.sort((a, b) => a.display_name.localeCompare(b.display_name))

  const subtitle = `${independentSchools.length} school${independentSchools.length !== 1 ? 's' : ''} · No Conference Affiliation`

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/conferences?gender=${gender}`}
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors px-4 pt-6 block"
      >
        ← All Conferences
      </Link>

      {/* ── Mobile: logo banner + sticky info bar ── */}
      <div className="md:hidden sticky top-0 z-20">
        {logoUrl ? (
          <Image src={logoUrl} alt={NAME} width={1079} height={647} className="w-full h-auto" />
        ) : (
          <div
            className="w-full aspect-video flex items-center justify-center text-6xl font-bold"
            style={{ backgroundColor: ACCENT, color: '#ffffff' }}
          >
            I
          </div>
        )}
        <div className="bg-white border-b border-black shadow-none px-4 py-3" style={{ borderTop: `3px solid ${ACCENT}` }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate">{NAME}</h1>
              <p className="text-xs text-slate-500 truncate">{subtitle}</p>
            </div>
            <div className="flex rounded-none border border-slate-200 overflow-hidden text-xs">
              <Link href={`/conferences/${SLUG}?gender=boys`}
                className={`px-2.5 py-1 font-medium ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>B</Link>
              <Link href={`/conferences/${SLUG}?gender=girls`}
                className={`px-2.5 py-1 font-medium ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500'}`}>G</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Desktop: sticky header ── */}
      <div className="hidden md:block sticky top-0 z-20 bg-white border border-black rounded-none shadow-none mb-8" style={{ borderTop: `3px solid ${ACCENT}` }}>
        <div className="flex items-center gap-5 p-4">
          <div className="shrink-0">
            {logoUrl ? (
              <Image src={logoUrl} alt={NAME} width={1079} height={647} className="w-[240px] h-auto rounded-none" />
            ) : (
              <div
                className="w-[160px] h-[96px] rounded-none flex items-center justify-center text-4xl font-bold"
                style={{ backgroundColor: ACCENT, color: '#ffffff' }}
              >
                I
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 truncate">{NAME}</h1>
                <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex rounded-none border border-slate-200 overflow-hidden text-sm">
                  <Link href={`/conferences/${SLUG}?gender=boys`}
                    className={`px-3 py-1.5 font-medium transition-colors ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Boys</Link>
                  <Link href={`/conferences/${SLUG}?gender=girls`}
                    className={`px-3 py-1.5 font-medium transition-colors ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Girls</Link>
                </div>
                <div className="flex items-center text-xs text-slate-400">
                  <InlineSeasonPicker activeSeason={season ?? 2} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── School list ── */}
      <div className="max-w-5xl mx-auto px-4 pb-10">
        {gender === 'girls' || independentSchools.length === 0 ? (
          <div className="border border-black rounded-none bg-white px-6 py-10 text-center text-slate-500 text-sm">
            No independent school data available.
          </div>
        ) : (
          <div className="border border-black rounded-none overflow-hidden shadow-none bg-white divide-y divide-slate-100">
            {independentSchools.map((s, i) => {
              const label = classLabel(s)
              return (
                <Link
                  key={s.id}
                  href={`/schools/${encodeURIComponent(s.abbreviation)}?gender=${gender}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xs text-slate-400 w-6 shrink-0 text-right tabular-nums">{i + 1}</span>
                  {s.logo_url ? (
                    <Image
                      src={s.logo_url}
                      alt={s.display_name}
                      width={1022}
                      height={505}
                      className="w-7 h-auto shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 shrink-0 bg-slate-100 border border-slate-200 rounded-none" />
                  )}
                  <span className="flex-1 text-sm font-medium text-slate-800">{s.display_name}</span>
                  {label && (
                    <span className="text-[10px] text-slate-400 shrink-0">{label}</span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
