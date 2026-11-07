'use client'
// Insight (2026-11-07, Kyle): the nav's Insight section (was About), one per side at /boys/insight and
// /girls/insight. The standard page header, then five tabs: Daily Report, Rankings, Daily Challenge,
// Polls, About. Each tab is its own page under the side's insight folder; the tab follows the URL.
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { StdHeader } from '@/components/site/StdPage'
import { SiteTabs } from '@/components/site/SiteTabs'

export const INSIGHT_TABS = [
  { key: 'daily-report', label: 'Daily Report' },
  { key: 'rankings', label: 'Rankings' },
  { key: 'daily-challenge', label: 'Daily Challenge' },
  { key: 'polls', label: 'Polls' },
  { key: 'about', label: 'About' },
] as const

export function InsightShell({ side, children }: { side: 'boys' | 'girls'; children: ReactNode }) {
  const pathname = usePathname()
  const base = `/${side}/insight`
  const active = INSIGHT_TABS.find(t => pathname.startsWith(`${base}/${t.key}`))?.key ?? 'daily-report'
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <StdHeader
        title={`${side === 'boys' ? 'Boys' : 'Girls'} Insight`}
        summaryKey="about"
        tabs={<SiteTabs items={INSIGHT_TABS.map(t => ({ key: t.key, label: t.label, href: `${base}/${t.key}` }))} active={active} />}
      />
      {children}
    </div>
  )
}
