'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { AdminGenderSelector } from '@/components/admin/AdminGenderSelector'

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
      fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

type NavItem = {
  label: string
  href: string
  future?: boolean
}

type NavGroup = {
  heading?: string
  items: NavItem[]
}

type NavSection = {
  id: string
  label: string
  groups: NavGroup[]
}

// Always-visible utility rail — not tied to any season stage
const UTILITY: NavItem[] = [
  { label: 'Data Browser',           href: '/admin/data-browser' },
  { label: 'Page Layout',            href: '/admin/content/layout' },
  { label: 'Articles',               href: '/admin/content/articles' },
  { label: 'Data Health',            href: '/admin/data-health' },
  { label: 'Search / Edit Wrestlers', href: '/admin/wrestlers' },
  { label: 'Hammer Score Config',    href: '/admin/hammer-scores/config' },
  { label: 'OOS Schools',            href: '/admin/oos-schools' },
  { label: 'OOS Wrestlers',          href: '/admin/oos-wrestlers' },
]

type NonNjsiaaGroup = { heading: string; items: NavItem[] }

const NONNJSIAA_NAV: NonNjsiaaGroup[] = [
  {
    heading: 'MS Tournaments',
    items: [
      { label: 'Tournament Tiers',  href: '/admin/ms/tiers' },
      { label: 'Tournaments',       href: '/admin/ms/tournaments' },
      { label: 'Import Results',    href: '/admin/ms/import' },
      { label: 'Wrestler Profiles', href: '/admin/ms/wrestlers' },
    ],
  },
  {
    heading: 'HS Off-Season',
    items: [
      { label: 'Tournaments',    href: '/admin/nonnjsiaa/offseason' },
      { label: 'Import Results', href: '/admin/nonnjsiaa/offseason/import' },
    ],
  },
  {
    heading: 'Clubs',
    items: [
      { label: 'Club Profiles', href: '/admin/nonnjsiaa/clubs' },
    ],
  },
]

// Three-dashboard sections. Items intentionally repeat across sections —
// they link to the same underlying page, never duplicated.
const SECTIONS: NavSection[] = [
  {
    id: 'preseason',
    label: 'Preseason',
    groups: [{
      items: [
        { label: 'Groups & Alignment',    href: '/admin/groups' },
        { label: 'School Profiles',       href: '/admin/schools' },
        { label: 'Seasons & Roster',      href: '/admin/seasons' },
        { label: 'Bulk Schedule',         href: '/admin/schedule/bulk-import' },
        { label: 'Tournament Rollover',   href: '/admin/tournaments/rollover' },
        { label: 'Rankings Hub',          href: '/admin/rankings-hub' },
      ],
    }],
  },
  {
    id: 'season',
    label: 'Season',
    groups: [{
      items: [
        { label: 'Tournament Hub',             href: '/admin/tournament-hub' },
        { label: 'Dual Hub',                   href: '/admin/dual-hub' },
        { label: 'Rankings Hub',               href: '/admin/rankings-hub' },
        { label: 'Snap Shot (Boys)',           href: '/admin/snapshot' },
        { label: 'Snap Shot (Girls)',          href: '/admin/snapshot-girls' },
      ],
    }],
  },
  {
    id: 'postseason',
    label: 'Postseason',
    groups: [
      {
        heading: 'Team',
        items: [
          { label: 'Playoff Seeds', href: '/admin/playoff-seeds' },
          { label: 'Import Hub',    href: '/admin/import-hub' },
          { label: 'Team Scores',   href: '/admin/team-scores' },
          { label: 'PP Audit',      href: '/admin/pp-audit' },
        ],
      },
      {
        heading: 'Individual',
        items: [
          { label: 'Region Seeds',        href: '/admin/region-seeds' },
          { label: 'Post-Season Bracket', href: '/admin/bracket' },
        ],
      },
    ],
  },
]

function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Track which sections are expanded; default all open
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    preseason: false,
    season: false,
    postseason: false,
    nonnjsiaa: false,
    tools: false,
  })

  function toggle(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  if (pathname === '/admin/login') return null

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-slate-700">
        <Link href="/admin" onClick={() => setOpen(false)}>
          <span className="text-xs font-bold tracking-widest uppercase text-slate-400">MatWhizzer</span>
          <p className="text-white font-bold text-sm mt-0.5">Admin</p>
        </Link>
      </div>

      {/* Gender selector */}
      <div className="px-4 py-3 border-b border-slate-700">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Program</p>
        <AdminGenderSelector className="w-full" />
      </div>

      {/* Dashboard link */}
      <div className="px-3 pt-3 pb-1">
        <Link
          href="/admin"
          onClick={() => setOpen(false)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded transition-colors ${
            isActive('/admin') && pathname === '/admin'
              ? 'bg-white text-slate-900'
              : 'text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
        >
          Dashboard
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 mt-2 space-y-1">

        {/* Three collapsible dashboard sections */}
        {SECTIONS.map(section => {
          const isExpanded = expanded[section.id]
          const sectionActive = pathname.startsWith(`/admin/${section.id}`) ||
            section.groups.some(g => g.items.some(i => isActive(i.href) && pathname !== '/admin'))
          return (
            <div key={section.id}>
              <div className="flex items-center">
                <Link
                  href={`/admin/${section.id}`}
                  onClick={() => setOpen(false)}
                  className={`flex-1 px-3 py-2 text-xs font-bold uppercase tracking-widest rounded-l transition-colors ${
                    sectionActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {section.label}
                </Link>
                <button
                  onClick={() => toggle(section.id)}
                  className="px-2 py-2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={isExpanded ? `Collapse ${section.label}` : `Expand ${section.label}`}
                >
                  <ChevronIcon open={isExpanded} />
                </button>
              </div>

              {isExpanded && (
                <div className="mt-0.5 mb-1">
                  {section.groups.map((group, gi) => (
                    <div key={gi} className={gi > 0 ? 'mt-2' : ''}>
                      {group.heading && (
                        <p className="px-3 mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          {group.heading}
                        </p>
                      )}
                      <ul className="space-y-0.5">
                        {group.items.map(item => (
                          <li key={item.href + item.label}>
                            {item.future ? (
                              <span className="flex items-center pl-5 pr-3 py-1.5 text-sm text-slate-600 cursor-not-allowed select-none">
                                {item.label}
                              </span>
                            ) : (
                              <Link
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={`flex items-center pl-5 pr-3 py-1.5 text-sm rounded transition-colors ${
                                  isActive(item.href)
                                    ? 'bg-white text-slate-900 font-medium'
                                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                                }`}
                              >
                                {item.label}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Divider */}
        <div className="border-t border-slate-700/60 my-2" />

        {/* Non-NJSIAA Tracking section */}
        <div>
          <div className="flex items-center">
            <span className="flex-1 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              Non-NJSIAA
            </span>
            <button
              onClick={() => toggle('nonnjsiaa')}
              className="px-2 py-2 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={expanded.nonnjsiaa ? 'Collapse Non-NJSIAA Tracking' : 'Expand Non-NJSIAA Tracking'}
            >
              <ChevronIcon open={!!expanded.nonnjsiaa} />
            </button>
          </div>

          {expanded.nonnjsiaa && (
            <div className="mt-0.5 mb-1 space-y-2">
              {NONNJSIAA_NAV.map(group => (
                <div key={group.heading}>
                  <p className="px-3 mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    {group.heading}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map(item => (
                      <li key={item.href}>
                        {item.future ? (
                          <span className="flex items-center pl-5 pr-3 py-1.5 text-sm text-slate-600 cursor-not-allowed select-none">
                            {item.label}
                          </span>
                        ) : (
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={`flex items-center pl-5 pr-3 py-1.5 text-sm rounded transition-colors ${
                              isActive(item.href)
                                ? 'bg-white text-slate-900 font-medium'
                                : 'text-slate-300 hover:text-white hover:bg-slate-700'
                            }`}
                          >
                            {item.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700/60 my-2" />

        {/* Collapsible Tools section */}
        <div>
          <div className="flex items-center">
            <span className="flex-1 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              Tools
            </span>
            <button
              onClick={() => toggle('tools')}
              className="px-2 py-2 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={expanded.tools ? 'Collapse Tools' : 'Expand Tools'}
            >
              <ChevronIcon open={expanded.tools} />
            </button>
          </div>

          {expanded.tools && (
            <ul className="mt-0.5 mb-1 space-y-0.5">
              {UTILITY.map(item => (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center pl-5 pr-3 py-1.5 text-sm rounded transition-colors ${
                      isActive(item.href)
                        ? 'bg-white text-slate-900 font-medium'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>

      {/* Admin Profiles — always visible */}
      <div className="px-3 pb-2">
        <Link
          href="/admin/admin-profiles"
          onClick={() => setOpen(false)}
          className={`flex items-center px-3 py-2 text-sm rounded transition-colors ${
            isActive('/admin/admin-profiles')
              ? 'bg-white text-slate-900 font-medium'
              : 'text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
        >
          Admin Profiles
        </Link>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700">
        <Link
          href="/"
          target="_blank"
          className="block text-xs text-slate-500 hover:text-slate-300 transition-colors mb-3"
        >
          ↗ View public site
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full text-left text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded shadow-lg"
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle navigation"
      >
        {open ? <XIcon /> : <MenuIcon />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — desktop: static, mobile: slide-in */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-56 bg-slate-900 flex flex-col
          transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto lg:flex lg:flex-col lg:shrink-0
        `}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
