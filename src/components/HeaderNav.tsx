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

  const bgClass       = isBoys ? 'bg-sky-100' : 'bg-red-100'
  const textClass     = isBoys ? 'text-blue-900' : 'text-purple-900'
  const dropdownBg    = isBoys ? 'bg-blue-900 border-blue-800' : 'bg-purple-900 border-purple-800'
  const dropdownHover = isBoys ? 'hover:bg-blue-800' : 'hover:bg-purple-800'
  const hamburgerHover = isBoys ? 'hover:bg-sky-200' : 'hover:bg-red-200'

  const homeHref         = isBoys ? '/boys' : '/girls'
  const leaderboardsHref = isBoys ? '/boys/leaderboards' : '/girls/leaderboards'
  const schoolsHref      = isBoys ? '/boys/schools' : '/girls/schools'
  const districtsHref    = isBoys ? '/boys/districts' : '/girls/districts'
  const regionsHref      = isBoys ? '/boys/regions' : '/girls/regions'
  const stateHref        = isBoys ? '/boys/state' : '/girls/state'

  // Swap /boys ↔ /girls prefix for "equivalent page" toggle
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

  // Close on outside click
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

  // Close when navigating
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <header className={`${bgClass} ${textClass} px-6 py-5 shadow-md flex items-center`}>

      {/* Hamburger + dropdown — left side */}
      <div ref={menuRef} className="relative mr-4">
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          className={`p-2 rounded-md ${hamburgerHover} transition-colors`}
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

      {/* Brand — logo replaces text */}
      <Link href={homeHref} className="hover:opacity-80 transition-opacity">
        <Image
          src="/whizzer-logo.jpg"
          alt="Mat Whizzer"
          width={140}
          height={60}
          className="h-12 w-auto"
          priority
        />
      </Link>

      {/* Boys ↔ Girls toggle — right side */}
      <Link
        href={toggleHref}
        className={`ml-auto text-sm font-semibold px-4 py-1.5 rounded-full border transition-colors ${
          isBoys
            ? 'border-purple-400 text-purple-700 hover:bg-purple-100 hover:text-purple-900'
            : 'border-blue-400 text-blue-700 hover:bg-blue-100 hover:text-blue-900'
        }`}
      >
        {isBoys ? 'Girls \u2192' : '\u2190 Boys'}
      </Link>

    </header>
  )
}
