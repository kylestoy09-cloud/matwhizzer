import Link from 'next/link'
import { supabase } from '@/lib/supabase/public-cached'
import { getActiveSeason } from '@/lib/get-season'
import { getSchoolLogos } from '@/lib/school-logos'
import { getSchoolSeasonNames } from '@/lib/schoolSeasonNames'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'
import { getGirlsTeamBracket, type BracketMatch } from '@/lib/girlsTeamBracket'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { SiteTabs } from '@/components/site/SiteTabs'
import { StdHeader } from '@/components/site/StdPage'
import { ComingSoon } from '@/components/site/ComingSoon'
import { IconHint } from '@/components/site/IconHint'

const BASE = '/postseason/team/girls'

export const revalidate = 300

// Girls team postseason: North and South brackets, then the state final (src/lib/girlsTeamBracket.ts)
export default async function GirlsTeamPostseasonPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const { section: sectionParam } = await searchParams
  const section = sectionParam === 'north' || sectionParam === 'south' ? sectionParam : ''
  const season = await getActiveSeason('F')
  const [bracket, logos] = await Promise.all([getGirlsTeamBracket(season), getSchoolLogos()])

  const ids = bracket?.schoolIds ?? []
  // the season's name (girls co-ops), else the school's name
  const [{ data: schoolRows }, seasonNames] = await Promise.all([
    ids.length ? supabase.from('schools').select('id, display_name').in('id', ids) : Promise.resolve({ data: [] }),
    getSchoolSeasonNames(supabase as never, season, 'F', ids),
  ])
  const schoolName = new Map((schoolRows ?? []).map(r => [r.id as number, r.display_name as string]))
  const nameOf = (id: number) => seasonNames.get(id) ?? schoolName.get(id) ?? 'TBD'

  function Match({ m, large }: { m: BracketMatch; large?: boolean }) {
    const rows = m.teams.map((t, i) => (
      <div key={i} className={`flex items-center gap-2 px-3 ${large ? 'py-2' : 'py-1.5'} ${i === 0 ? 'border-b border-slate-200' : ''}`}>
        {t ? (
          <>
            <SchoolLogoBadge {...logos.badgeById(t.schoolId)} />
            <Link href={`/girls/schools/${t.schoolId}`} className={`flex-1 min-w-0 truncate text-sm hover:underline ${t.won ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
              {nameOf(t.schoolId)}
            </Link>
            <span className={`tabular-nums text-sm ${t.won ? 'font-bold text-slate-900' : 'text-slate-500'}`}>{t.score ?? ''}</span>
          </>
        ) : (
          <span className="text-sm text-slate-400 italic">{m.bye ? 'Bye' : 'TBD'}</span>
        )}
      </div>
    ))
    return (
      <div className="bg-white border border-black">
        {rows}
        {m.meetId && (
          <Link href={`/meets/${m.meetId}`} className="block px-3 py-1 text-[11px] text-slate-400 hover:text-slate-700 border-t border-slate-100">
            Meet details →
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* the standard header; North / South tabs toggle (click again to show both) */}
      <StdHeader title="Girls Team Post Season" summaryKey="ps-team"
        picker={<InlineSeasonPicker gender="F" activeSeason={season} />}
        tabs={bracket ? <SiteTabs items={[['north', 'North'], ['south', 'South']].map(([k, l]) => ({ key: k, label: l, href: section === k ? BASE : `${BASE}?section=${k}` }))} active={section} /> : undefined} />

      {!bracket ? (
        <ComingSoon what="Brackets" />
      ) : (
        <>
          {bracket.stateFinal && !section && (
            <section className="mb-10 max-w-md">
              <h2 className="text-base font-semibold text-slate-800 mb-3">
                State Final{bracket.champion != null && <span className="ml-2 text-sm font-normal text-slate-500"><IconHint hint="Team state champion">🏆</IconHint> {nameOf(bracket.champion)}</span>}
              </h2>
              <Match m={bracket.stateFinal} large />
            </section>
          )}

          {bracket.regions.filter(r => !section || r.key === section).map(r => (
            <section key={r.key} className="mb-12">
              <h2 className="text-lg font-bold text-slate-900 mb-4">{r.title}</h2>
              <div className="overflow-x-auto">
                <div className="grid gap-4 min-w-[720px]" style={{ gridTemplateColumns: `repeat(${r.rounds.length}, minmax(0, 1fr))` }}>
                  {r.rounds.map(round => (
                    <div key={round.title} className="flex flex-col">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{round.title}</h3>
                      <div className="flex flex-col justify-around gap-3 flex-1">
                        {round.matches.map((m, i) => <Match key={i} m={m} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
