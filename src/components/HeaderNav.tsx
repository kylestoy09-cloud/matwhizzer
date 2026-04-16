'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// Swap /boys ↔ /girls in the current path, falling back to the gender root.
function genderHref(pathname: string, target: 'boys' | 'girls'): string {
  const from = target === 'girls' ? '/boys' : '/girls'
  const to   = target === 'girls' ? '/girls' : '/boys'
  if (pathname.startsWith(from)) {
    const rest = pathname.slice(from.length)
    return rest ? to + rest : to
  }
  return `/${target}`
}

type WrestlerResult = {
  id: string
  first_name: string
  last_name: string
}

type SchoolResult = {
  id: number
  display_name: string
}

export function HeaderNav() {
  const pathname  = usePathname()
  const router    = useRouter()
  const userMenuRef = useRef<HTMLDivElement>(null)
  const searchRef   = useRef<HTMLDivElement>(null)
  const [userOpen, setUserOpen] = useState(false)
  const [user, setUser]         = useState<User | null>(null)
  const [username, setUsername] = useState<string | null>(null)

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [wrestlers,   setWrestlers]   = useState<WrestlerResult[]>([])
  const [schools,     setSchools]     = useState<SchoolResult[]>([])
  const [searchOpen,  setSearchOpen]  = useState(false)

  const isBoys = !pathname.startsWith('/girls')

  // ── Colour tokens ────────────────────────────────────────────────────────
  const rowOneBg    = isBoys ? 'bg-slate-900'  : 'bg-rose-900'
  const rowTwoBg    = isBoys ? 'bg-slate-800'  : 'bg-rose-800'
  const dropdownBg  = isBoys ? 'bg-slate-800 border-slate-700' : 'bg-rose-800 border-rose-700'
  const dropdownHov = isBoys ? 'hover:bg-slate-700' : 'hover:bg-rose-700'

  // ── Nav links (gender-aware) ─────────────────────────────────────────────
  const homeHref = isBoys ? '/boys' : '/girls'
  const navItems = [
    { href: isBoys ? '/boys/state'        : '/girls/state',        label: 'State'        },
    { href: isBoys ? '/boys/regions'      : '/girls/regions',      label: 'Regions'      },
    { href: isBoys ? '/boys/districts'    : '/girls/districts',    label: 'Districts'    },
    { href: '/conferences',                                         label: 'Conferences'  },
    { href: isBoys ? '/boys/leaderboards' : '/girls/leaderboards', label: 'Leaderboards' },
    { href: '/schools',                                             label: 'Schools'      },
    { href: '/feedback',                                            label: 'Feedback'     },
  ]

  // ── Auth ─────────────────────────────────────────────────────────────────
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
    document.cookie = 'wrestling_pref=;path=/;max-age=0'
    setUser(null)
    setUsername(null)
    setUserOpen(false)
    router.refresh()
  }

  // ── Close user menu on outside click ─────────────────────────────────────
  useEffect(() => {
    if (!userOpen) return
    function onMouseDown(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [userOpen])

  // ── Close everything on route change ─────────────────────────────────────
  useEffect(() => {
    setUserOpen(false)
    setSearchOpen(false)
    setSearchQuery('')
  }, [pathname])

  // ── Search: debounced parallel fetch ─────────────────────────────────────
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setWrestlers([])
      setSchools([])
      setSearchOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      const supabase = createSupabaseBrowser()
      const parts = q.split(/\s+/)

      let wrestlerQuery = supabase
        .from('wrestlers')
        .select('id, first_name, last_name')
        .limit(5)

      if (parts.length >= 2) {
        wrestlerQuery = wrestlerQuery
          .ilike('first_name', `%${parts[0]}%`)
          .ilike('last_name', `%${parts[parts.length - 1]}%`)
      } else {
        wrestlerQuery = wrestlerQuery
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      }

      const schoolQuery = supabase
        .from('schools')
        .select('id, display_name')
        .ilike('display_name', `%${q}%`)
        .limit(5)

      const [wrestlerRes, schoolRes] = await Promise.all([wrestlerQuery, schoolQuery])

setWrestlers((wrestlerRes.data ?? []) as WrestlerResult[])
      setSchools((schoolRes.data ?? []) as SchoolResult[])
      setSearchOpen(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // ── Close search dropdown on outside click ────────────────────────────────
  useEffect(() => {
    if (!searchOpen) return
    function onMouseDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setSearchOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [searchOpen])

  function handleResultClick() {
    setSearchOpen(false)
    setSearchQuery('')
  }

  const genderParam    = isBoys ? 'boys' : 'girls'
  const hasWrestlers   = wrestlers.length > 0
  const hasSchools     = schools.length > 0

  return (
    <header className={`${rowOneBg} sticky top-0 z-40 shadow-none`}>

      {/* ── Row 1 — logo + auth ──────────────────────────────────────────── */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-black/30">

        {/* Logo */}
        <Link href={homeHref} className="flex items-center hover:opacity-90 transition-opacity">
          <Image
            src="/images/Logo Tuesday.png"
            alt="Mat Whizzer"
            width={3229}
            height={323}
            className="h-10 w-auto"
            priority
          />
        </Link>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserOpen(v => !v)}
                className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors px-2 py-1 rounded-none hover:bg-white/10"
              >
                <span className="w-7 h-7 rounded-none bg-white/20 flex items-center justify-center text-xs font-bold">
                  {(username ?? '?')[0].toUpperCase()}
                </span>
                <span className="hidden sm:inline text-sm">{username}</span>
              </button>
              {userOpen && (
                <div className={`absolute right-0 top-full mt-1 w-44 rounded-none shadow-none border border-black z-50 overflow-hidden ${dropdownBg}`}>
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="text-sm text-white font-medium truncate">{username}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setUserOpen(false)}
                    className={`block w-full text-left px-4 py-3 text-sm text-slate-100 ${dropdownHov} hover:text-white transition-colors`}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className={`block w-full text-left px-4 py-3 text-sm text-slate-100 ${dropdownHov} hover:text-white transition-colors`}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/signin"
              className="text-sm text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-none border border-white/20 hover:border-white/50"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* ── Row 2 — sub-nav ──────────────────────────────────────────────── */}
      <div className={`${rowTwoBg} border-b border-black overflow-x-auto`}>
        <div className="flex items-center gap-0.5 px-3 py-1.5 whitespace-nowrap min-w-max">

          {/* Boys / Girls segmented toggle */}
          <div className="flex border border-white/30 mr-4 flex-shrink-0">
            <button
              onClick={() => router.push(genderHref(pathname, 'boys'))}
              className={`px-4 py-1 text-xs font-bold tracking-wide transition-colors ${
                isBoys
                  ? 'bg-white text-slate-900'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Boys
            </button>
            <button
              onClick={() => router.push(genderHref(pathname, 'girls'))}
              className={`px-4 py-1 text-xs font-bold tracking-wide transition-colors border-l border-white/30 ${
                !isBoys
                  ? 'bg-rose-200 text-rose-900'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Girls
            </button>
          </div>

          {/* Nav links */}
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1 text-sm transition-colors rounded-none ${
                  isActive
                    ? 'text-white font-semibold underline underline-offset-4'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Row 3 — combined search ───────────────────────────────────────── */}
      <div className={`${rowTwoBg} border-b border-black/60`}>
        <div className="px-4 py-2">
          <div ref={searchRef} className="relative w-full max-w-lg">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') }
              }}
              placeholder="Search wrestlers or schools…"
              autoComplete="off"
              className="w-full border border-slate-300 rounded-none px-4 py-2.5 text-base shadow-none focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white text-slate-900 placeholder-slate-400"
            />

            {searchOpen && (
              <div className={`absolute left-0 right-0 top-full z-50 border border-black overflow-hidden ${dropdownBg}`}>
                {!hasWrestlers && !hasSchools ? (
                  <div className="px-4 py-3 text-sm text-white/50">
                    No results found
                  </div>
                ) : (
                  <>
                    {hasWrestlers && (
                      <div>
                        <div className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white/40 border-b border-white/10">
                          Wrestlers
                        </div>
                        {wrestlers.map(w => (
                          <Link
                            key={w.id}
                            href={`/wrestlers/${w.id}`}
                            onClick={handleResultClick}
                            className={`block px-4 py-2.5 text-sm text-white ${dropdownHov} transition-colors`}
                          >
                            <span className="font-medium">{w.first_name} {w.last_name}</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {hasSchools && (
                      <div className={hasWrestlers ? 'border-t border-white/10' : ''}>
                        <div className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white/40 border-b border-white/10">
                          Schools
                        </div>
                        {schools.map(s => (
                          <Link
                            key={s.id}
                            href={`/schools/${s.id}?gender=${genderParam}`}
                            onClick={handleResultClick}
                            className={`block px-4 py-2.5 text-sm text-white ${dropdownHov} transition-colors`}
                          >
                            {s.display_name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </header>
  )
}
