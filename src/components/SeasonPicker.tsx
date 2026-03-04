'use client'

import { useRouter } from 'next/navigation'
import { SEASONS } from '@/lib/seasons'

// Inline variant — blends into page subtitles (dark text on light background)
export function InlineSeasonPicker({ activeSeason }: { activeSeason: number }) {
  const router = useRouter()

  function pickSeason(id: number) {
    document.cookie = `season=${id}; path=/; max-age=${60 * 60 * 24 * 365}`
    router.refresh()
  }

  const ids = Object.keys(SEASONS).map(Number).sort()

  return (
    <select
      value={activeSeason}
      onChange={e => pickSeason(Number(e.target.value))}
      className="bg-transparent border-0 border-b border-dotted border-slate-400 cursor-pointer font-medium text-slate-600 hover:text-slate-800 focus:outline-none text-sm py-0 pl-0 pr-5 appearance-none"
      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 20 20\'%3E%3Cpath fill=\'%2394a3b8\' d=\'M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0px center' }}
    >
      {ids.map(id => (
        <option key={id} value={id} className="text-slate-900 bg-white">
          {SEASONS[id].label}
        </option>
      ))}
    </select>
  )
}
