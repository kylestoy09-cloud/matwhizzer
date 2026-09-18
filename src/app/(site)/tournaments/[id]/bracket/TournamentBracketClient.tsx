'use client'

import { useState } from 'react'
import { BracketTree, type PublicBracketSlot } from '@/components/bracket/BracketTree'

interface Props {
  tournamentName: string
  weights: number[]
  byWeight: Record<number, PublicBracketSlot[]>
}

export function TournamentBracketClient({ tournamentName, weights, byWeight }: Props) {
  const [selectedWeight, setSelectedWeight] = useState<number>(weights[0] ?? 0)

  const slots = byWeight[selectedWeight] ?? []

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">{tournamentName}</h1>
      <p className="text-xs text-slate-400 uppercase tracking-widest mb-6">Bracket</p>

      {/* Weight tabs */}
      <div className="flex flex-wrap gap-1.5 mb-6" role="group" aria-label="Weight class">
        {weights.map(wt => (
          <button
            key={wt}
            onClick={() => setSelectedWeight(wt)}
            className={`px-3 py-1 text-sm font-medium border transition-colors ${
              wt === selectedWeight
                ? 'bg-black text-white border-black'
                : 'bg-white text-slate-700 border-black hover:bg-slate-50'
            }`}
          >
            {wt}
          </button>
        ))}
      </div>

      {/* Bracket */}
      {slots.length > 0 ? (
        <BracketTree slots={slots} />
      ) : (
        <div className="border border-dashed border-slate-300 py-12 text-center">
          <p className="text-sm text-slate-400">No bracket data for {selectedWeight} lbs yet.</p>
        </div>
      )}
    </div>
  )
}
