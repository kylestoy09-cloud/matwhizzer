'use client'

import Link from 'next/link'

type ChampionRow = {
  weight: number
  wrestler_id: string
  wrestler_name: string
  school: string
  dominance_score: number
  seed: number | null
}

export function StateChampions({
  rows,
  seasonYear,
}: {
  rows: ChampionRow[]
  seasonYear: number
}) {
  if (!rows.length) return null

  return (
    <section>
      <h2 className="text-lg font-bold text-slate-900 mb-3">
        {seasonYear} State Champions
      </h2>
      <div className="bg-white rounded-none border border-black shadow-none overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-3 py-2 text-left w-14">Wt</th>
              <th className="px-3 py-2 text-left">Wrestler</th>
              <th className="px-3 py-2 text-left hidden sm:table-cell">School</th>
              <th className="px-3 py-2 text-right w-20">Hammer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const isGhost = r.seed != null && r.seed >= 5
              return (
                <tr key={r.weight} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-500 font-medium">{r.weight}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/wrestler/${r.wrestler_id}`}
                      className="font-medium text-slate-800 hover:underline"
                    >
                      {r.wrestler_name}
                    </Link>
                    {isGhost && <span className="ml-1" title={`#${r.seed} seed — Ghost Champion`}>👻</span>}
                    <span className="sm:hidden text-xs text-slate-400 ml-1">
                      {r.school}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">{r.school}</td>
                  <td className="px-3 py-2 text-right font-semibold text-amber-600">
                    {r.dominance_score.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
