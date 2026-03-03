'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export function HeaderNav() {
  const pathname = usePathname()
  const isBoys = !pathname.startsWith('/girls')

  const bgClass = isBoys ? 'bg-slate-900' : 'bg-rose-900'
  const homeHref = isBoys ? '/boys' : '/girls'
  const leaderboardsHref = isBoys ? '/boys/leaderboards' : '/girls/leaderboards'
  const schoolsHref    = isBoys ? '/boys/schools' : null
  const districtsHref  = isBoys ? '/boys/districts' : null
  const regionsHref    = isBoys ? '/boys/regions' : null
  const stateHref      = isBoys ? '/boys/state' : null

  // Swap /boys ↔ /girls prefix for "equivalent page" toggle
  const toggleHref = isBoys
    ? (pathname.startsWith('/boys') ? '/girls' + pathname.slice('/boys'.length) : '/girls')
    : '/boys' + pathname.slice('/girls'.length)

  return (
    <header className={`${bgClass} text-white px-6 py-4 shadow-md flex items-center`}>
      <Link href={homeHref} className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
        Mat Whizzer
      </Link>
      <span className="ml-3 text-slate-400 text-sm hidden sm:inline">NJSIAA Wrestling · 2024–25</span>
      <nav className="ml-auto flex items-center gap-4">
        <Link
          href={leaderboardsHref}
          className="text-sm text-slate-300 hover:text-white transition-colors"
        >
          Leaderboards
        </Link>
        {stateHref && (
          <Link
            href={stateHref}
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            State
          </Link>
        )}
        {regionsHref && (
          <Link
            href={regionsHref}
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Regions
          </Link>
        )}
        {districtsHref && (
          <Link
            href={districtsHref}
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Districts
          </Link>
        )}
        {schoolsHref && (
          <Link
            href={schoolsHref}
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Schools
          </Link>
        )}
        <Link
          href={toggleHref}
          className={`text-sm font-semibold px-4 py-1.5 rounded-full border transition-colors ${
            isBoys
              ? 'border-rose-400 text-rose-300 hover:bg-rose-800 hover:text-rose-100'
              : 'border-slate-400 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
          }`}
        >
          {isBoys ? 'Girls →' : '← Boys'}
        </Link>
      </nav>
    </header>
  )
}
