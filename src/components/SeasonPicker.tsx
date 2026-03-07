'use client'

import { useRouter } from 'next/navigation'
import { SEASONS } from '@/lib/seasons'

// Inline variant — blends into page subtitles (dark text on light background)
// Pass `seasons` to restrict which season IDs are shown. If only one ID is
// provided the label is rendered as static text (no dropdown).
export function InlineSeasonPicker({
  activeSeason,
  seasons,
}: {
  activeSeason: number
  seasons?: number[]
}) {
  const router = useRouter()

  function pickSeason(id: number) {
    document.cookie = `season=${id}; path=/; max-age=${60 * 60 * 24 * 365}`
    router.refresh()
  }

  const ids = (seasons ?? Object.keys(SEASONS).map(Number)).sort()

  // Single season — render as non-interactive label
  if (ids.length === 1) {
    return (
      <span className="font-medium text-slate-600 text-sm">
        {SEASONS[ids[0]]?.label ?? ids[0]}
      </span>
    )
  }

  return (
    <select
      value={activeSeason}
      onChange={e => pickSeason(Number(e.target.value))}
      className="bg-amber-50 border border-amber-300 rounded-md cursor-pointer font-semibold text-amber-800 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm py-0.5 pl-2 pr-6 appearance-none"
      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 20 20\'%3E%3Cpath fill=\'%23b45309\' d=\'M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
    >
      {ids.map(id => (
        <option key={id} value={id} className="text-slate-900 bg-white">
          {SEASONS[id].label}
        </option>
      ))}
    </select>
  )
}
