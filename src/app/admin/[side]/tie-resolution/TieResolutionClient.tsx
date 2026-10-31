'use client'

import { useState } from 'react'
import { useSeasons } from '@/components/SeasonsProvider'
import type { TieMeet } from './page'


function searchUrl(name: string, gender: 'M' | 'F') {
  const g = gender === 'F' ? 'Girls' : 'Boys'
  return `https://www.google.com/search?q=${encodeURIComponent(`${name} ${g} wrestling schedule results`)}`
}

export function TieResolutionClient({ ties: initialTies }: { ties: TieMeet[] }) {
  const { label: seasonLabelOf } = useSeasons()
  const [ties, setTies] = useState<TieMeet[]>(initialTies)
  const [resolving, setResolving] = useState<string | null>(null)

  async function resolve(meet: TieMeet, winner: 'team1' | 'team2') {
    setResolving(meet.id)
    try {
      const res = await fetch(`/api/admin/tie-resolution/${meet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner, gender: meet.gender }),
      })
      if (!res.ok) throw new Error(await res.text())
      setTies(prev => prev.filter(t => t.id !== meet.id))
    } catch (e) {
      alert(`Error: ${e instanceof Error ? e.message : e}`)
    } finally {
      setResolving(null)
    }
  }

  const remaining = ties.length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tie Resolution</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tied dual meets — click Search to find the result, then pick the winner.
          </p>
        </div>
        <span className="text-sm font-semibold px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
          {remaining} remaining
        </span>
      </div>

      {remaining === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">All ties resolved</div>
      )}

      <div className="space-y-3">
        {ties.map(meet => {
          const busy = resolving === meet.id
          const genderLabel = meet.gender === 'F' ? 'Girls' : 'Boys'
          const season = seasonLabelOf(meet.season_id) ?? `Season ${meet.season_id}`
          const dateStr = new Date(meet.meet_date + 'T12:00:00').toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })

          return (
            <div
              key={meet.id}
              className="border border-slate-200 bg-white rounded-none p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{season}</span>
                  <span>·</span>
                  <span>{genderLabel}</span>
                  <span>·</span>
                  <span>{dateStr}</span>
                </div>
                <a
                  href={searchUrl(meet.team1_name, meet.gender)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Search {meet.team1_name} →
                </a>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => resolve(meet, 'team1')}
                  disabled={busy}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold border-2 border-slate-800 bg-white hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {meet.team1_name} won
                </button>

                <div className="flex flex-col items-center shrink-0">
                  <span className="text-2xl font-bold text-slate-800 tabular-nums">
                    {meet.score}–{meet.score}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">tie</span>
                </div>

                <button
                  onClick={() => resolve(meet, 'team2')}
                  disabled={busy}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold border-2 border-slate-800 bg-white hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {meet.team2_name} won
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
