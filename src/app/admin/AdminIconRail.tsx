'use client'

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { RATING_SHORT } from '@/lib/rating'
import { adminHref, type AdminSide } from '@/lib/admin-side'

/* ─── Icon helper ─── */
function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      {children}
    </svg>
  )
}

const icons = {
  microcheck:   <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></Icon>,
  chat:        <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></Icon>,
  dashboards:  <Icon><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></Icon>,
  profiles:    <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></Icon>,
  calendar:    <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></Icon>,
  blog:        <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></Icon>,
  nonnjsiaa:   <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H9.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></Icon>,
  store:       <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></Icon>,
  pastSeasons: <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></Icon>,
  finances:    <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></Icon>,
  banners:     <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></Icon>,
  tools:       <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4.867 19.125h.008v.008h-.008v-.008z" /></Icon>,
  settings:    <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></Icon>,
  buildHealth: <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></Icon>,
}

/* ─── Nav data ─── */
type FlyoutGroup = { heading?: string; items: FlyoutItem[] }
type FlyoutItem  = { label: string; href: string; future?: boolean }
type RailEntry   = { id: string; label: string; icon: React.ReactNode; future?: boolean; clickAction?: () => void; groups: FlyoutGroup[] }

// Universal tools (top of the rail) belong to neither side; everything below the
// divider is a gender tool and links only to the side being worked on.
function buildUniversal(side: AdminSide, onChatClick?: () => void, onMicrocheckClick?: () => void): RailEntry[] {
  // WRR Formula and Tool Audit are kept per gender: these open the side being worked on
  const sideName = side === 'girls' ? 'Girls' : 'Boys'
  return [
  {
    id: 'microcheck', label: 'Micro Checks', icon: icons.microcheck,
    clickAction: onMicrocheckClick,
    groups: [],
  },
  {
    id: 'chat', label: 'Chat', icon: icons.chat, clickAction: onChatClick,
    groups: [],
  },
  {
    id: 'store', label: 'Store', icon: icons.store, future: true,
    groups: [{ items: [{ label: 'Store', href: '#', future: true }] }],
  },
  {
    id: 'finances', label: 'Finances', icon: icons.finances,
    groups: [{ items: [{ label: 'Finances', href: '/admin/finances' }] }],
  },
  {
    id: 'banners', label: 'Banners', icon: icons.banners, future: true,
    groups: [{ items: [{ label: 'Banner Manager', href: '#', future: true }] }],
  },
  {
    id: 'build-health', label: 'Build Health', icon: icons.buildHealth,
    groups: [{ items: [{ label: 'Admin Build Health', href: '/admin/build-health' }] }],
  },
  {
    id: 'settings', label: 'Admin Settings', icon: icons.settings,
    groups: [{ items: [
      { label: 'Help Desk',      href: '/admin/help-desk' },
      { label: 'Admin Profiles', href: '/admin/admin-profiles' },
      { label: 'Activity Log',   href: '/admin/activity-log' },
      { label: 'Data Browser',   href: '/admin/data-browser' },
      { label: 'Data Health',    href: '/admin/data-health' },
      { label: 'Page Layout',    href: '/admin/page-layout' },
      { label: 'Home Page Test', href: '/admin/homepage-test' },
    ]},
    { heading: 'Microcheck', items: [
      { label: 'Task Order',   href: '/admin/microcheck/priorities' },
      { label: 'Missing Data', href: '/admin/microcheck/tracker' },
    ]},
    { heading: `${sideName} side`, items: [
      { label: `${RATING_SHORT} Formula`, href: adminHref(side, '/hammer-scores/config') },
      { label: 'Tool Audit',              href: adminHref(side, '/tool-audit') },
    ]}],
  },
  ]
}

function buildGender(side: AdminSide): RailEntry[] {
  const a = (path: string) => adminHref(side, path)
  return [
  {
    id: 'dashboards', label: 'Dashboards', icon: icons.dashboards,
    groups: [
      { heading: 'Season', items: [
        { label: 'Preseason',       href: a('/preseason') },
        { label: 'Season',          href: a('/season') },
        { label: 'Postseason',      href: a('/postseason') },
      ]},
      { heading: 'Season Hubs', items: [
        { label: 'Tournament Hub',  href: a('/tournament-hub') },
        { label: 'Dual Hub',        href: a('/dual-hub') },
        { label: 'Rankings Hub',    href: a('/rankings-hub') },
        { label: 'Snap Shot',       href: a('/snapshot') },
      ]},
      { heading: 'Postseason Hubs', items: [
        { label: 'Team Playoffs',   href: a('/team-playoffs') },
        { label: 'Districts',       href: a('/districts') },
        { label: 'Regions',         href: a('/region-seeds') },
        { label: 'States',          href: a('/states-hub') },
      ]},
    ],
  },
  {
    id: 'profiles', label: 'Profiles', icon: icons.profiles,
    groups: [{ items: [
      { label: 'School Profiles',  href: a('/schools') },
      { label: 'Wrestler Profiles', href: a('/wrestlers') },
      { label: 'OOS Schools',      href: a('/oos-schools') },
      { label: 'OOS Wrestlers',    href: a('/oos-wrestlers') },
    ]}],
  },
  {
    id: 'calendar', label: 'Calendar', icon: icons.calendar,
    groups: [{ items: [{ label: 'Calendar & Tasks', href: a('/calendar') }] }],
  },
  {
    id: 'blog', label: 'Articles', icon: icons.blog,
    groups: [{ items: [
      { label: 'All Articles', href: a('/content/articles') },
      { label: 'New Article',  href: a('/content/articles/new') },
    ]}],
  },
  {
    id: 'nonnjsiaa', label: 'Non-NJSIAA', icon: icons.nonnjsiaa,
    groups: [
      { heading: 'MS Tournaments', items: [
        { label: 'Tournament Tiers',  href: a('/ms/tiers') },
        { label: 'Tournaments',       href: a('/ms/tournaments') },
        { label: 'Import Results',    href: a('/ms/import') },
        { label: 'Wrestler Profiles', href: a('/ms/wrestlers') },
      ]},
      { heading: 'HS Off-Season', items: [
        { label: 'Tournaments',    href: a('/nonnjsiaa/offseason') },
        { label: 'Import Results', href: a('/nonnjsiaa/offseason/import') },
      ]},
      { heading: 'Clubs', items: [
        { label: 'Club Profiles', href: a('/nonnjsiaa/clubs') },
      ]},
    ],
  },
  {
    id: 'past-seasons', label: 'Past Seasons', icon: icons.pastSeasons,
    groups: [{ items: [{ label: 'View Past Seasons', href: a('/past-seasons') }] }],
  },
  {
    id: 'tools', label: 'Tools', icon: icons.tools,
    groups: [
      { heading: 'Season Tools', items: [
        { label: 'Groups & Alignment',  href: a('/groups') },
        { label: 'Bulk Schedule',       href: a('/schedule/bulk-import') },
        { label: 'Import Hub',          href: a('/import-hub') },
        { label: 'Team Scores',         href: a('/team-scores') },
        { label: 'Post-Season Bracket', href: a('/bracket') },
        { label: 'Match Card',          href: a('/match-card') },
        { label: 'Roster Grade Import', href: a('/roster-grade-import') },
      ]},
      { heading: 'Admin Tools', items: [
        { label: 'Tie Resolution',          href: a('/tie-resolution') },
        { label: 'Resolve Unknowns',        href: a('/resolve-unknowns') },
      ]},
      { heading: 'Coming Soon', items: [
        { label: 'Settings',    href: '#', future: true },
        { label: 'Help',        href: '#', future: true },
        { label: 'Scoring App', href: '#', future: true },
        { label: 'Email',       href: '#', future: true },
      ]},
    ],
  },
  ]
}


const FLYOUT_EDGE_GAP = 8

/* ─── Rail item with fixed-position flyout ─── */
function RailItem({ entry, isActive, chatActive, microcheckActive }: { entry: RailEntry; isActive: boolean; chatActive?: boolean; microcheckActive?: boolean }) {
  const [open, setOpen]           = useState(false)
  const [anchorTop, setAnchorTop] = useState(0)
  const [flyoutTop, setFlyoutTop] = useState(0)
  const itemRef                   = useRef<HTMLDivElement>(null)
  const flyoutRef                 = useRef<HTMLDivElement>(null)
  const closeTimerRef             = useRef<ReturnType<typeof setTimeout> | null>(null)

  // HubSpot-style: top aligns to the hovered icon, but if the menu would run
  // past the bottom of the viewport it slides up so its bottom sits at the page bottom.
  useLayoutEffect(() => {
    if (!open || !flyoutRef.current) return
    const height = flyoutRef.current.offsetHeight
    const maxTop = window.innerHeight - height - FLYOUT_EDGE_GAP
    setFlyoutTop(Math.max(FLYOUT_EDGE_GAP, Math.min(anchorTop, maxTop)))
  }, [open, anchorTop])

  const scheduleClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setOpen(false), 150)
  }, [])

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
  }, [])

  useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current) }, [])

  function handleMouseEnter() {
    cancelClose()
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect()
      setAnchorTop(rect.top)
      setFlyoutTop(rect.top)
    }
    setOpen(true)
  }

  // Click-action entries (e.g. Chat, Microcheck) skip the flyout entirely
  if (entry.clickAction) {
    const isOn = chatActive || microcheckActive
    return (
      <button
        onClick={entry.clickAction}
        className={`flex items-center justify-center w-14 h-10 transition-colors ${
          isOn ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`}
        title={entry.label}
      >
        {entry.icon}
      </button>
    )
  }

  return (
    <div ref={itemRef} onMouseEnter={handleMouseEnter} onMouseLeave={scheduleClose}>
      <div
        className={`flex items-center justify-center w-14 h-10 transition-colors ${
          isActive
            ? 'text-white bg-white/10'
            : entry.future
              ? 'text-slate-500 cursor-default'
              : 'text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer'
        }`}
      >
        {entry.icon}
      </div>

      {/* Fixed-position flyout — escapes overflow-y:auto clipping */}
      {open && !entry.future && (
        <div
          ref={flyoutRef}
          className="fixed z-[300] w-52 bg-slate-800 border border-slate-700 rounded-r shadow-2xl overflow-hidden flex flex-col"
          style={{ left: 56, top: flyoutTop, maxHeight: `calc(100vh - ${FLYOUT_EDGE_GAP * 2}px)` }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {/* Section label */}
          <div className="px-3 py-2 border-b border-slate-700/60 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {entry.label}
            </span>
          </div>

          <div className="py-1 overflow-y-auto min-h-0">
            {entry.groups.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-1 border-t border-slate-700/40 pt-1' : ''}>
                {group.heading && (
                  <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {group.heading}
                  </p>
                )}
                {group.items.map(item =>
                  item.future ? (
                    <div key={item.label} className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-sm text-slate-600">{item.label}</span>
                      <span className="text-[9px] font-bold uppercase text-slate-700 border border-slate-700 rounded px-1">soon</span>
                    </div>
                  ) : (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                      {item.label}
                    </Link>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main rail ─── */
export function AdminIconRail({
  onChatClick,
  chatOpen,
  onMicrocheckClick,
  microcheckOpen,
}: {
  onChatClick?:      () => void
  chatOpen?:         boolean
  onMicrocheckClick?: () => void
  microcheckOpen?:    boolean
}) {
  const pathname    = usePathname()
  const { gender, side } = useAdminGender()

  if (pathname === '/admin/login') return null

  const isGirls = gender === 'F'
  const bg      = isGirls ? 'bg-rose-900' : 'bg-slate-900'
  const logoHov = isGirls ? 'hover:bg-rose-800' : 'hover:bg-slate-800'
  const divider = { borderColor: 'rgba(0,0,0,0.35)' }

  function isActive(entry: RailEntry) {
    return entry.groups.some(g =>
      g.items.some(i => !i.future && i.href !== '#' && pathname.startsWith(i.href))
    )
  }

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-50 w-14 ${bg} flex flex-col overflow-x-visible transition-colors duration-200`}
      style={{ boxShadow: '1px 0 0 rgba(0,0,0,0.4)' }}
    >
      {/* Logo */}
      <Link
        href={adminHref(side)}
        className={`flex items-center justify-center h-12 shrink-0 border-b ${logoHov} transition-colors`}
        style={divider}
      >
        <Image
          src="/mw-headgear-white.png"
          alt="MatWhizzer Admin"
          width={30}
          height={30}
          className="object-contain"
          priority
        />
      </Link>

      {/* Icons — no overflow-y:auto so flyouts aren't clipped */}
      <div className="flex-1 flex flex-col">
        {buildUniversal(side, onChatClick, onMicrocheckClick).map(entry => (
          <RailItem
            key={entry.id}
            entry={entry}
            isActive={isActive(entry)}
            chatActive={entry.id === 'chat' ? chatOpen : undefined}
            microcheckActive={entry.id === 'microcheck' ? microcheckOpen : undefined}
          />
        ))}
        <div className="mx-3 my-1.5 border-t border-white/20" />
        {buildGender(side).map(entry => (
          <RailItem key={entry.id} entry={entry} isActive={isActive(entry)} />
        ))}
      </div>
    </aside>
  )
}
