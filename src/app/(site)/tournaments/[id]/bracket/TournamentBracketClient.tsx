'use client'

import { useState } from 'react'
import { BoutBracket } from '@/components/bracket/BoutBracket'
import { SplitBracket } from '@/components/bracket/SplitBracket'
import type { BracketLook } from '@/lib/bracketLook'
import type { WeightBracket } from '@/lib/boutBracket'

interface Props {
  tournamentName: string
  weights: number[]
  brackets: Record<number, WeightBracket>
  // the saved bracket format (Aesthetic tool → Brackets): the split, compact format once it's saved on for the site
  look?: BracketLook
  mixed?: boolean
}

export function TournamentBracketClient({ tournamentName, weights, brackets, look, mixed = false }: Props) {
  const [selectedWeight, setSelectedWeight] = useState<number>(weights[0] ?? 0)
  const bracket = brackets[selectedWeight]

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

      {bracket && (bracket.champ.length || bracket.cons.length) ? (
        look?.live ? <SplitBracket bracket={bracket} look={look} mixed={mixed} /> : <BoutBracket bracket={bracket} />
      ) : (
        <div className="border border-dashed border-slate-300 py-12 text-center">
          <p className="text-sm text-slate-400">No bouts for {selectedWeight} lbs.</p>
        </div>
      )}
    </div>
  )
}
