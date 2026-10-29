import { getActiveSeason } from '@/lib/get-season'
import { getSeasonLabel } from '@/lib/seasons-server'
import { buildGirlsPowerPointGroups } from '@/lib/standings'
import { PowerPointTable } from '@/components/StandingsTable'
import { ConferenceGrid } from './StandingsContent'

// Girls standings follow the official girls Power Points lists, not the boys
// section / group structure: North and South (schools competing for team
// titles) and Non-classified (display only, no team playoffs).
const GROUPS = [
  { key: 'north',          title: 'North',          note: 'Competing for the North team title' },
  { key: 'south',          title: 'South',          note: 'Competing for the South team title' },
  { key: 'non_classified', title: 'Non-classified', note: 'Schools not competing for team titles — standings for display only' },
] as const

export async function GirlsStandingsContent() {
  const season = await getActiveSeason('F')
  const [groups, seasonLabel] = await Promise.all([buildGirlsPowerPointGroups(season), getSeasonLabel(season)])
  const empty = GROUPS.every(g => groups[g.key].length === 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Power Points</h2>
          <p className="text-sm text-slate-500 mt-1">Official {seasonLabel ?? ''} girls standings</p>
        </div>
        {empty ? (
          <p className="text-sm text-slate-500">Power Points have not been released for this season yet.</p>
        ) : (
          <div className="space-y-10">
            {GROUPS.map(g => groups[g.key].length > 0 && (
              <div key={g.key}>
                <h3 className="text-lg font-bold text-slate-900">{g.title}</h3>
                <p className="text-xs text-slate-500 mb-3">{g.note}</p>
                <PowerPointTable standings={groups[g.key]} gender="girls" />
              </div>
            ))}
          </div>
        )}
      </section>

      <ConferenceGrid gender="girls" />
    </div>
  )
}
