import { getActiveSeason } from '@/lib/get-season'
import { getSeasonLabel } from '@/lib/seasons-server'
import { buildGirlsPowerPointGroups } from '@/lib/standings'
import { PowerPointTable } from '@/components/StandingsTable'
import { ConferenceGrid, StandingsHeader, type StandingsView } from './StandingsContent'
import { GirlsListButtons } from './StandingsButtons'

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
        <StandingsHeader gender="girls" view={view} base={base} />
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
      <StandingsHeader gender="girls" view={view} base={base} />
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Power Points</h2>
          <p className="text-sm text-slate-500 mt-1">Official {seasonLabel ?? ''} girls standings</p>
        </div>
        {empty ? (
          <p className="text-sm text-slate-500">Power Points have not been released for this season yet.</p>
        ) : (
          <>
            <div className="mb-6"><GirlsListButtons buttons={GROUPS.map(g => ({ key: g.key, label: g.title, href: `${base}?view=group&group=${g.key}` }))} /></div>
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
