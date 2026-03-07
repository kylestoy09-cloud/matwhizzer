'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export function HeaderNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isBoys = !pathname.startsWith('/girls')

  const bgClass       = isBoys ? 'bg-slate-900' : 'bg-rose-900'
  const dropdownBg    = isBoys ? 'bg-slate-800 border-slate-700' : 'bg-rose-800 border-rose-700'
  const dropdownHover = isBoys ? 'hover:bg-slate-700' : 'hover:bg-rose-700'

  const homeHref         = isBoys ? '/boys' : '/girls'
  const leaderboardsHref = isBoys ? '/boys/leaderboards' : '/girls/leaderboards'
  const schoolsHref      = isBoys ? '/boys/schools' : '/girls/schools'
  const districtsHref    = isBoys ? '/boys/districts' : '/girls/districts'
  const regionsHref      = isBoys ? '/boys/regions' : '/girls/regions'
  const stateHref        = isBoys ? '/boys/state' : '/girls/state'

  const toggleHref = isBoys
    ? (pathname.startsWith('/boys') ? '/girls' + pathname.slice('/boys'.length) : '/girls')
    : '/boys' + pathname.slice('/girls'.length)

  const navItems = [
    { href: stateHref,        label: 'State' },
    { href: regionsHref,      label: 'Regions' },
    { href: districtsHref,    label: 'Districts' },
    { href: leaderboardsHref, label: 'Leaderboards' },
    { href: schoolsHref,      label: 'Schools' },
    { href: '/feedback',      label: 'Feedback' },
  ]

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      <header className={`${bgClass} text-white px-6 py-6 shadow-md flex items-center relative sticky top-0 z-40`}>

        {/* Hamburger + dropdown — left side */}
        <div ref={menuRef} className="relative z-10">
          <button
            onClick={() => setOpen(v => !v)}
            aria-label="Open navigation menu"
            aria-expanded={open}
            className="p-2 rounded-md hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <rect y="3"  width="20" height="2" rx="1" />
              <rect y="9"  width="20" height="2" rx="1" />
              <rect y="15" width="20" height="2" rx="1" />
            </svg>
          </button>

          {open && (
            <div className={`absolute left-0 top-full mt-2 w-44 rounded-lg shadow-xl border z-50 overflow-hidden ${dropdownBg}`}>
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 text-sm text-slate-100 ${dropdownHover} hover:text-white transition-colors`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Brand — centered logo in white circle */}
        <Link
          href={homeHref}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hover:opacity-90 transition-opacity"
        >
          <div className="bg-white rounded-full p-2 shadow-lg border-2 border-blue-900">
            <Image
              src="/mwl-word.png"
              alt="Mat Whizzer"
              width={180}
              height={78}
              className="h-14 w-auto"
              priority
            />
          </div>
        </Link>

        {/* Boys / Girls toggle — right side */}
        <Link
          href={toggleHref}
          className={`ml-auto z-10 text-sm font-semibold px-4 py-1.5 rounded-full border transition-colors ${
            isBoys
              ? 'border-rose-400 text-rose-300 hover:bg-rose-800 hover:text-rose-100'
              : 'border-slate-400 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
          }`}
        >
          {isBoys ? 'Girls \u2192' : '\u2190 Boys'}
        </Link>

      </header>
    </>
  )
}
