'use client'

import { createContext, useContext } from 'react'
import { seasonLabel, seasonLabelsBackTo, sortSeasonIds, type SeasonInfo } from '@/lib/seasons'

const SeasonsContext = createContext<SeasonInfo[]>([])

export function SeasonsProvider({ seasons, children }: { seasons: SeasonInfo[]; children: React.ReactNode }) {
  return <SeasonsContext.Provider value={seasons}>{children}</SeasonsContext.Provider>
}

export function useSeasons() {
  const seasons = useContext(SeasonsContext)
  return {
    seasons,
    label: (id: number) => seasonLabel(seasons, id),
    sortIds: (ids: number[]) => sortSeasonIds(seasons, ids),
    labelsBackTo: (oldestStartYear: number) => seasonLabelsBackTo(seasons, oldestStartYear),
  }
}
