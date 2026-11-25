'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useSeasons } from '@/components/SeasonsProvider'
import { seasonPickCookie, type Gender } from '@/lib/seasons'

// Inline variant — blends into page subtitles (dark text on light background)
// Pass `seasons` to restrict which season IDs are shown. If only one ID is
// provided the label is rendered as static text (no dropdown).
export function InlineSeasonPicker({
  activeSeason,
  gender,
  seasons,
  options,
  urlParam,
  arrows = false,
}: {
  activeSeason: number
  gender: Gender
  seasons?: number[]
  // postseason pages: their own list with labels, incl. Playoff History seasons (hidden ones for admins only, marked)
  options?: { id: number; label: string; hidden: boolean }[]
  // the page reads its year from ?season= (Individual Post Season); the session pick follows what it shows, so the
  // district / region / state pages it links to open on the same year
  urlParam?: boolean
  // tournament pages (Kyle 2026-11-19): ‹ › beside the picker — the season before / after; none past either end
  arrows?: boolean
}) {
  const router = useRouter()
  const path = usePathname()
  useEffect(() => { if (urlParam) document.cookie = `${seasonPickCookie(gender)}=${activeSeason}; path=/; samesite=lax` }, [urlParam, gender, activeSeason])
  const { seasons: all, label, sortIds } = useSeasons()

  function pickSeason(id: number) {
    // Session cookie: returning visitors always land on the live season.
    document.cookie = `${seasonPickCookie(gender)}=${id}; path=/; samesite=lax`
    if (urlParam) router.push(`${path}?season=${id}`)
    else router.refresh()
  }

  const ids = options ? options.map(o => o.id) : sortIds(seasons ?? all.filter(s => s.public_genders.includes(gender)).map(s => s.id))
  const text = (id: number) => { const o = options?.find(x => x.id === id); return o ? `${o.label}${o.hidden ? ' (hidden — admin preview)' : ''}` : label(id) ?? String(id) }

  // Single season — render as non-interactive label
  if (ids.length === 1) {
    return (
      <span className="font-medium text-slate-600 text-sm">
        {text(ids[0])}
      </span>
    )
  }

  // seasons are keyed by their end year, so lower = earlier
  const chrono = [...ids].sort((a, b) => a - b)
  const at = chrono.indexOf(activeSeason)
  const prev = at > 0 ? chrono[at - 1] : null
  const next = at >= 0 && at < chrono.length - 1 ? chrono[at + 1] : null
  const arrow = (id: number | null, dir: 'prev' | 'next') => id == null
    ? <span className="inline-block w-6" aria-hidden />
    : <button type="button" onClick={() => pickSeason(id)} title={`${dir === 'prev' ? 'Previous' : 'Next'} season: ${text(id)}`} aria-label={`${dir === 'prev' ? 'Previous' : 'Next'} season`}
        className="inline-flex items-center justify-center w-6 h-6 border border-amber-300 bg-amber-50 text-amber-800 font-bold text-sm leading-none hover:bg-amber-100">{dir === 'prev' ? '‹' : '›'}</button>

  const select = (
    <select
      value={activeSeason}
      onChange={e => pickSeason(Number(e.target.value))}
      className="bg-amber-50 border border-amber-300 rounded-none cursor-pointer font-semibold text-amber-800 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm py-0.5 pl-2 pr-6 appearance-none"
      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 20 20\'%3E%3Cpath fill=\'%23b45309\' d=\'M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
    >
      {ids.map(id => (
        <option key={id} value={id} className="text-slate-900 bg-white">
          {text(id)}
        </option>
      ))}
    </select>
  )
  if (!arrows) return select
  return <span className="inline-flex items-center gap-1">{arrow(prev, 'prev')}{select}{arrow(next, 'next')}</span>
}
