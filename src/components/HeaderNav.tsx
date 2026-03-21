'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function HeaderNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState<string | null>(null)

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

  const toggleHref = isBoys ? '/girls' : '/boys'

  const navItems = [
    { href: stateHref,        label: 'State' },
    { href: regionsHref,      label: 'Regions' },
    { href: districtsHref,    label: 'Districts' },
    { href: leaderboardsHref, label: 'Leaderboards' },
    { href: schoolsHref,      label: 'Schools' },
    { href: '/feedback',      label: 'Feedback' },
  ]

  // Load auth state
  useEffect(() => {
    const supabase = createSupabaseBrowser()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase.from('users').select('username').eq('id', data.user.id).maybeSingle()
          .then(({ data: profile }) => {
            setUsername(profile?.username ?? data.user?.user_metadata?.username ?? null)
          })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase.from('users').select('username').eq('id', session.user.id).maybeSingle()
          .then(({ data: profile }) => {
            setUsername(profile?.username ?? session.user?.user_metadata?.username ?? null)
          })
      } else {
        setUsername(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    setUser(null)
    setUsername(null)
    setUserOpen(false)
    router.refresh()
  }

  // Close menus on outside click
  useEffect(() => {
    if (!open && !userOpen) return
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open, userOpen])

  useEffect(() => { setOpen(false); setUserOpen(false) }, [pathname])

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
          href="/"
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

        {/* Right side — toggle + auth */}
        <div className="ml-auto flex items-center gap-3 z-10">
          {/* Boys/Girls toggle */}
          <Link
            href={toggleHref}
            className={`text-sm font-semibold px-4 py-1.5 rounded-full border transition-colors ${
              isBoys
                ? 'border-rose-400 text-rose-300 hover:bg-rose-800 hover:text-rose-100'
                : 'border-slate-400 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            {isBoys ? 'Girls \u2192' : '\u2190 Boys'}
          </Link>

          {/* Auth */}
          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserOpen(v => !v)}
                className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/10"
              >
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {(username ?? '?')[0].toUpperCase()}
                </span>
                <span className="hidden sm:inline">{username}</span>
              </button>
              {userOpen && (
                <div className={`absolute right-0 top-full mt-2 w-40 rounded-lg shadow-xl border z-50 overflow-hidden ${dropdownBg}`}>
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="text-sm text-white font-medium truncate">{username}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className={`block w-full text-left px-4 py-3 text-sm text-slate-100 ${dropdownHover} hover:text-white transition-colors`}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/signin"
              className="text-sm text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/10"
            >
              Sign In
            </Link>
          )}
        </div>

      </header>
    </>
  )
}
