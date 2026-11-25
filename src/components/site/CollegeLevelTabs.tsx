'use client'
// The college list's level tabs (Kyle 2026-11-17: boys DI / DII / DIII / NAIA — Juco dropped 2026-11-18 — girls NCWWC / NAIA / NCAA): the
// site's standard header with the standard tabs; each level's list arrives drawn from the server
import { useState, type ReactNode } from 'react'
import { StdHeader } from '@/components/site/StdPage'
import { SiteTabs } from '@/components/site/SiteTabs'

// each level's summary line sits in the header like every standard page's (Kyle 2026-11-18)
// embedded: inside Insight · Collegiate (Kyle 2026-11-18) — the levels as the second row of tabs, the summary under them
export function CollegeLevelTabs({ title, tabs, embedded = false }: { title: string; tabs: { key: string; label: string; summary?: ReactNode; panel: ReactNode }[]; embedded?: boolean }) {
  const [on, setOn] = useState(tabs[0]?.key ?? '')
  if (embedded) return (
    <>
      <div className="-mt-2 mb-6"><SiteTabs level={2} items={tabs.map(t => ({ key: t.key, label: t.label, onClick: () => setOn(t.key) }))} active={on} /></div>
      {tabs.find(t => t.key === on)?.summary && <div className="mb-4 text-sm text-slate-500">{tabs.find(t => t.key === on)?.summary}</div>}
      {tabs.find(t => t.key === on)?.panel}
    </>
  )
  return (
    <>
      <StdHeader title={title} summaryKey="h2h" hideSummary summary={tabs.find(t => t.key === on)?.summary} tabs={<SiteTabs items={tabs.map(t => ({ key: t.key, label: t.label, onClick: () => setOn(t.key) }))} active={on} />} />
      {tabs.find(t => t.key === on)?.panel}
    </>
  )
}
