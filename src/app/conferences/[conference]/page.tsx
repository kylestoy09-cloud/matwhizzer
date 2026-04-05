import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { conferenceFromSlug } from '@/lib/conferences'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'

export const dynamic = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────────

type StandingRow = {
  id: number
  division: string
  school_id: number | null
  school_name: string
  overall_wins: number
  overall_losses: number
  div_wins: number
  div_losses: number
  pf: number
  pa: number
  school: { id: number; display_name: string; logo_url: string | null } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function divRecord(row: StandingRow): number {
  const total = row.div_wins + row.div_losses
  return total === 0 ? 0 : row.div_wins / total
}

function ovRecord(row: StandingRow): number {
  const total = row.overall_wins + row.overall_losses
  return total === 0 ? 0 : row.overall_wins / total
}

function recordStr(w: number, l: number): string {
  return `${w}-${l}`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ConferencePage({
  params,
  searchParams,
}: {
  params: Promise<{ conference: string }>
  searchParams: Promise<{ gender?: string; season?: string }>
}) {
  const { conference: slug } = await params
  const { gender: genderParam } = await searchParams
  const gender = genderParam === 'girls' ? 'girls' : 'boys'
  const season = await getActiveSeason()

  const conferenceName = conferenceFromSlug(slug)
  if (!conferenceName) notFound()

  // Fetch conference logo
  const { data: conferenceData } = await supabase
    .from('conferences')
    .select('logo_url')
    .eq('slug', slug)
    .maybeSingle()

  const logoUrl = conferenceData?.logo_url ?? null

  // Fetch division standings — join schools for display_name and logo_url
  const { data: standingsData } = await supabase
    .from('conference_standings')
    .select('id,division,school_id,school_name,overall_wins,overall_losses,div_wins,div_losses,pf,pa,school:schools(id,display_name,logo_url)')
    .eq('conference_slug', slug)
    .eq('season_id', season ?? 2)
    .order('division')

  const rows = (standingsData ?? []) as unknown as StandingRow[]

  // Fetch abbreviations from school_names for all joined display_names
  const displayNames = [...new Set(rows.map(r => r.school?.display_name).filter(Boolean))] as string[]
  const abbrevMap = new Map<string, string>()
  if (displayNames.length > 0) {
    const { data: abbrevData } = await supabase
      .from('school_names')
      .select('school_name, abbreviation')
      .in('school_name', displayNames)
    for (const a of abbrevData ?? []) {
      if (a.abbreviation) abbrevMap.set(a.school_name, a.abbreviation)
    }
  }

  // Group by division, sort rows within each division by div record desc
  const divisionNames = [...new Set(rows.map(r => r.division).filter(Boolean))]
  const byDivision = new Map<string, StandingRow[]>()
  for (const div of divisionNames) {
    const divRows = rows
      .filter(r => r.division === div)
      .sort((a, b) => divRecord(b) - divRecord(a) || ovRecord(b) - ovRecord(a) || b.pf - a.pf)
    byDivision.set(div, divRows)
  }

  const subtitle = `${rows.length} team${rows.length !== 1 ? 's' : ''} · Dual Meet Standings`
  const accentColor = '#0f172a'

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/conferences?gender=${gender}`}
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors px-4 pt-6 block"
      >
        ← All Conferences
      </Link>

      {/* ── Mobile: logo banner + sticky info bar (exact school pattern) ── */}
      <div className="md:hidden sticky top-0 z-20">
        {/* Logo banner */}
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={conferenceName!}
            width={1079}
            height={647}
            className="w-full h-auto"
          />
        ) : (
          <div
            className="w-full aspect-video flex items-center justify-center text-6xl font-bold"
            style={{ backgroundColor: accentColor, color: '#ffffff' }}
          >
            {conferenceName![0]}
          </div>
        )}

        {/* Info bar */}
        <div className="bg-white border-b border-black shadow-none px-4 py-3" style={{ borderTop: `3px solid ${accentColor}` }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate">{conferenceName}</h1>
              <p className="text-xs text-slate-500 truncate">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex rounded-none border border-slate-200 overflow-hidden text-xs">
                <Link href={`/conferences/${slug}?gender=boys`}
                  className={`px-2.5 py-1 font-medium ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>B</Link>
                <Link href={`/conferences/${slug}?gender=girls`}
                  className={`px-2.5 py-1 font-medium ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500'}`}>G</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Desktop: sticky header with logo left + info right (exact school pattern) ── */}
      <div className="hidden md:block sticky top-0 z-20 bg-white border border-black rounded-none shadow-none mb-8" style={{ borderTop: `3px solid ${accentColor}` }}>
        <div className="flex items-center gap-5 p-4">
          {/* Logo left */}
          <div className="shrink-0">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={conferenceName!}
                width={1079}
                height={647}
                className="w-[240px] h-auto rounded-none"
              />
            ) : (
              <div
                className="w-[160px] h-[96px] rounded-none flex items-center justify-center text-4xl font-bold"
                style={{ backgroundColor: accentColor, color: '#ffffff' }}
              >
                {conferenceName![0]}
              </div>
            )}
          </div>

          {/* Info right */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 truncate">{conferenceName}</h1>
                <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex rounded-none border border-slate-200 overflow-hidden text-sm">
                  <Link href={`/conferences/${slug}?gender=boys`}
                    className={`px-3 py-1.5 font-medium transition-colors ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Boys</Link>
                  <Link href={`/conferences/${slug}?gender=girls`}
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

      {/* ── Standings ────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pb-10">
        {rows.length === 0 && (
          <div className="border border-black rounded-none bg-white px-6 py-10 text-center text-slate-500 text-sm">
            No standings data available for this conference.
          </div>
        )}

        <div className="space-y-8">
          {divisionNames.map(div => {
            const divRows = byDivision.get(div) ?? []
            return (
              <div key={div} className="border border-black rounded-none overflow-hidden shadow-none bg-white">
                {/* Division header */}
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    {div && div.match(/^[A-H]$/) ? `Division ${div}` : `${div ?? ''} Division`}
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[520px] w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-center px-3 py-2 font-medium text-slate-500 w-10">#</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-500">School</th>
                        <th className="text-center px-3 py-2 font-medium text-slate-500 w-20">Overall</th>
                        <th className="text-center px-3 py-2 font-medium text-slate-500 w-16">Div</th>
                        <th className="text-center px-3 py-2 font-medium text-slate-500 w-16">PF</th>
                        <th className="text-center px-3 py-2 font-medium text-slate-500 w-16">PA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {divRows.map((row, i) => {
                        const displayName = row.school?.display_name ?? row.school_name
                        const logoUrl = row.school?.logo_url ?? null
                        const abbreviation = row.school?.display_name ? abbrevMap.get(row.school.display_name) ?? null : null
                        return (
                          <tr key={row.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5 text-center text-slate-400 text-xs font-medium">
                              {i + 1}
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-800">
                              <div className="flex items-center gap-2">
                                {logoUrl && (
                                  <Image
                                    src={logoUrl}
                                    alt={displayName}
                                    width={1022}
                                    height={505}
                                    className="w-6 h-auto shrink-0"
                                  />
                                )}
                                {abbreviation ? (
                                  <Link
                                    href={`/schools/${encodeURIComponent(abbreviation)}?gender=${gender}`}
                                    className="hover:text-blue-600 transition-colors"
                                  >
                                    {displayName}
                                  </Link>
                                ) : (
                                  displayName
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-600 tabular-nums">
                              {recordStr(row.overall_wins, row.overall_losses)}
                            </td>
                            <td className="px-3 py-2.5 text-center font-semibold text-slate-800 tabular-nums">
                              {recordStr(row.div_wins, row.div_losses)}
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-500 tabular-nums">
                              {row.pf}
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-500 tabular-nums">
                              {row.pa}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
