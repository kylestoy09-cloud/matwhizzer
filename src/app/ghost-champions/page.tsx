import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getActiveSeason } from '@/lib/get-season'
import { PageHeader } from '@/components/PageHeader'

type WinOnPath = {
  round: string
  opponent: string
  opponent_seed: number | null
  win_type: string
  fall_time: number | null
}

type GhostChamp = {
  seed: number
  wrestler_id: string
  wrestler_name: string
  school: string
  weight: number
  gender: string
  tournament_name: string
  tournament_type: string
  wins_on_path: WinOnPath[]
}

const ROUND_SHORT: Record<string, string> = {
  R1: 'R1', R2: 'R2', QF: 'QF', SF: 'SF', F: 'Final',
}

function formatTournament(name: string, type: string): string {
  if (type === 'boys_state') return 'Boys State'
  if (type === 'girls_state') return 'Girls State'
  const m = name.match(/r(\d+)$/)
  if (m) return `${name.includes('Girl') ? 'Girls' : 'Boys'} Region ${m[1]}`
  const d = name.match(/District (\d+)/)
  if (d) return `${name.includes('Girl') ? 'Girls' : 'Boys'} D${d[1]}`
  return name
}

export default async function GhostChampionsPage() {
  const season = await getActiveSeason()
  const { data } = await supabase.rpc('ghost_champions', { p_season: season })
  const ghosts = (data ?? []) as GhostChamp[]

  // Group by tournament
  const byTournament = new Map<string, GhostChamp[]>()
  for (const g of ghosts) {
    const key = g.tournament_name
    const list = byTournament.get(key) ?? []
    list.push(g)
    byTournament.set(key, list)
  }

  // Order tournament groups: state first, then regions, then districts
  const typeOrder: Record<string, number> = { boys_state: 0, girls_state: 1, regions: 2, girls_regions: 3, districts: 4 }
  const sortedGroups = [...byTournament.entries()].sort((a, b) => {
    const aType = a[1][0].tournament_type
    const bType = b[1][0].tournament_type
    return (typeOrder[aType] ?? 9) - (typeOrder[bType] ?? 9)
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <PageHeader title="Ghost Champions" />

      <p className="text-slate-500 text-sm mb-8">
        Wrestlers seeded 5th or lower who won a championship. Ranked by seed — the higher the number, the bigger the upset.
      </p>

      {ghosts.length === 0 && (
        <p className="text-slate-400 text-sm">No ghost champions found this season.</p>
      )}

      {sortedGroups.map(([tournamentName, champs]) => (
        <section key={tournamentName} className="mb-10">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            {formatTournament(tournamentName, champs[0].tournament_type)}
          </h2>

          <div className="space-y-4">
            {champs.map((g, i) => (
              <div
                key={`${g.wrestler_id}-${g.weight}`}
                className="bg-white border border-black rounded-none shadow-none overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-2xl font-black text-amber-500 w-10 text-center shrink-0">
                    {g.seed}
                  </span>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/wrestler/${g.wrestler_id}`}
                      className="text-base font-semibold text-slate-900 hover:underline"
                    >
                      {g.wrestler_name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {g.school} · {g.weight}lb
                    </div>
                  </div>
                </div>

                {g.wins_on_path && g.wins_on_path.length > 0 && (
                  <div className="border-t border-slate-100 px-4 py-2 bg-slate-50">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {g.wins_on_path.map((w, j) => (
                        <span key={j}>
                          <span className="font-medium text-slate-600">{ROUND_SHORT[w.round] ?? w.round}</span>
                          {' '}beat{' '}
                          <span className="text-slate-700">
                            {w.opponent_seed != null && <span className="text-amber-600">#{w.opponent_seed} </span>}
                            {w.opponent}
                          </span>
                          {' '}
                          <span className="text-slate-400">({w.win_type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
