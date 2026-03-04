'use client'

import { useRouter } from 'next/navigation'
import { SEASONS } from '@/lib/seasons'

export function SeasonPicker({ activeSeason }: { activeSeason: number }) {
  const router = useRouter()

  function pickSeason(id: number) {
    document.cookie = `season=${id}; path=/; max-age=${60 * 60 * 24 * 365}`
    router.refresh()
  }

  const ids = Object.keys(SEASONS).map(Number).sort()

  return (
    <div className="flex items-center gap-1 ml-3">
      {ids.map(id => (
        <button
          key={id}
          onClick={() => pickSeason(id)}
          className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
            id === activeSeason
              ? 'bg-white/20 text-white'
              : 'text-white/50 hover:text-white/80 hover:bg-white/10'
          }`}
        >
          {SEASONS[id].label}
        </button>
      ))}
    </div>
  )
}
