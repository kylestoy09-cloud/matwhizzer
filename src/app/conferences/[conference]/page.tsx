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
  searchParams: Promise<{ gender?: string }>
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

  // Fetch division standings
  const { data: standingsData } = await supabase
    .from('conference_standings')
    .select('id,division,school_id,school_name,overall_wins,overall_losses,div_wins,div_losses,pf,pa')
    .eq('conference_slug', slug)
    .eq('season_id', season ?? 2)
    .order('division')

  console.log('[conference page]', { slug, season, rows: standingsData?.length ?? 0 })
  const rows = (standingsData ?? []) as StandingRow[]

  // Group by division, sort rows within each division by div record desc
  const divisionNames = [...new Set(rows.map(r => r.division).filter(Boolean))]
  const byDivision = new Map<string, StandingRow[]>()
  for (const div of divisionNames) {
    const divRows = rows
      .filter(r => r.division === div)
      .sort((a, b) => divRecord(b) - divRecord(a) || ovRecord(b) - ovRecord(a) || b.pf - a.pf)
    byDivision.set(div, divRows)
  }

  // School lookup for profile links (slug = display_name URL-encoded)
  const schoolSlugs = new Map<number, string>()
  if (rows.length > 0) {
    const ids = [...new Set(rows.filter(r => r.school_id).map(r => r.school_id!))]
    const { data: schoolData } = await supabase
      .from('schools')
      .select('id, display_name')
      .in('id', ids)
    for (const s of schoolData ?? []) {
      schoolSlugs.set(s.id, s.display_name)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link
        href={`/conferences?gender=${gender}`}
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← All Conferences
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {logoUrl && (
            <Image
              src={logoUrl}
              alt={conferenceName!}
              width={512}
              height={512}
              className="w-16 h-16 object-contain rounded-none shrink-0"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{conferenceName}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {rows.length} team{rows.length !== 1 ? 's' : ''} · Dual Meet Standings
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-xs text-slate-400">
            <InlineSeasonPicker activeSeason={season ?? 2} />
          </div>
        </div>
      </div>

      {/* No data state */}
      {rows.length === 0 && (
        <div className="border border-black rounded-none bg-white px-6 py-10 text-center text-slate-500 text-sm">
          No standings data available for this conference.
        </div>
      )}

      {/* One table per division */}
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
                      const profileName = row.school_id ? schoolSlugs.get(row.school_id) : null
                      return (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-center text-slate-400 text-xs font-medium">
                            {i + 1}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-slate-800">
                            {profileName ? (
                              <Link
                                href={`/schools/${encodeURIComponent(profileName)}?gender=${gender}`}
                                className="hover:text-blue-600 transition-colors"
                              >
                                {row.school_name}
                              </Link>
                            ) : (
                              row.school_name
                            )}
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
  )
}
