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
    <div className="ml-3">
      <select
        value={activeSeason}
        onChange={e => pickSeason(Number(e.target.value))}
        className="text-xs font-medium bg-white/10 text-white border border-white/20 rounded-md px-2 py-0.5 cursor-pointer hover:bg-white/20 transition-colors focus:outline-none"
      >
        {ids.map(id => (
          <option key={id} value={id} className="text-slate-900 bg-white">
            {SEASONS[id].label}
          </option>
        ))}
      </select>
    </div>
  )
}
