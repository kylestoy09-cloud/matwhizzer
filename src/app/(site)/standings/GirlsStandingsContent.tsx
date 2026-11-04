import { getActiveSeason } from '@/lib/get-season'
import { getSeasonLabel } from '@/lib/seasons-server'
import { buildGirlsPowerPointGroups } from '@/lib/standings'
import { PowerPointTable } from '@/components/StandingsTable'
import Link from 'next/link'
import { ConferenceGrid, StandingsTabs, type StandingsView } from './StandingsContent'

// Girls standings follow the official girls Power Points lists, not the boys
// section / group structure: North and South (schools competing for team
// titles) and Non-classified (display only, no team playoffs).
const GROUPS = [
  { key: 'north',          title: 'North',          note: 'Competing for the North team title' },
  { key: 'south',          title: 'South',          note: 'Competing for the South team title' },
  { key: 'non_classified', title: 'Non-classified', note: 'Schools not competing for team titles — standings for display only' },
] as const

type GroupKey = typeof GROUPS[number]['key']

export async function GirlsStandingsContent({ view, group }: { view: StandingsView; group?: string }) {
  const base = '/girls/standings'
  if (view === 'conference') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <StandingsTabs base={base} view={view} />
        <ConferenceGrid gender="girls" />
      </div>
    )
  }
  const selected: GroupKey = GROUPS.find(g => g.key === group)?.key ?? 'north'
  const season = await getActiveSeason('F')
  const [groups, seasonLabel] = await Promise.all([buildGirlsPowerPointGroups(season), getSeasonLabel(season)])
  const empty = GROUPS.every(g => groups[g.key].length === 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <StandingsTabs base={base} view={view} />
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Power Points</h2>
          <p className="text-sm text-slate-500 mt-1">Official {seasonLabel ?? ''} girls standings</p>
        </div>
        {empty ? (
          <p className="text-sm text-slate-500">Power Points have not been released for this season yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {GROUPS.map(g => (
                <Link
                  key={g.key}
                  href={`${base}?view=group&group=${g.key}`}
                  className={`px-4 py-1.5 border border-black text-sm font-semibold transition-colors ${
                    selected === g.key ? 'bg-rose-800 text-white' : 'bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {g.title}
                </Link>
              ))}
            </div>
            {GROUPS.filter(g => g.key === selected).map(g => (
              <div key={g.key}>
                <h3 className="text-lg font-bold text-slate-900">{g.title}</h3>
                <p className="text-xs text-slate-500 mb-3">{g.note}</p>
                {groups[g.key].length > 0
                  ? <PowerPointTable standings={groups[g.key]} gender="girls" />
                  : <p className="text-sm text-slate-500">No schools in this list.</p>}
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  )
}
