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

export function HeaderNav() {
  const pathname  = usePathname()
  const router    = useRouter()
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [userOpen, setUserOpen] = useState(false)
  const [user, setUser]         = useState<User | null>(null)
  const [username, setUsername] = useState<string | null>(null)

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

  useEffect(() => {
    if (!userOpen) return
    function onMouseDown(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [userOpen])

  useEffect(() => { setUserOpen(false) }, [pathname])

  return (
    <header className={`${rowOneBg} sticky top-0 z-40 shadow-none`}>

      {/* ── Row 1 — logo + auth ──────────────────────────────────────────── */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-black/30">

        {/* Logo */}
        <Link href={homeHref} className="flex items-center hover:opacity-90 transition-opacity">
          <Image
            src="/images/mat-whizzer-header.png"
            alt="Mat Whizzer"
            width={2950}
            height={574}
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

    </header>
  )
}
