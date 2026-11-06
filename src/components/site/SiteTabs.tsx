// The standard tab row (2026-11-06): the leaderboard look, underline tabs. Level 1 is a page's main
// choice (Team / Individual, Group / Conference, the months); level 2 sits under it on a light bar
// (categories). Tabs are links on the site; the Aesthetic Tool passes onClick instead.
import Link from 'next/link'

export type SiteTab = { key: string; label: string; href?: string; onClick?: () => void }

export function SiteTabs({ items, active, level = 1 }: { items: SiteTab[]; active: string; level?: 1 | 2 }) {
  const row = level === 1 ? 'border-b border-slate-200' : 'border-b border-slate-100 bg-slate-50'
  return (
    <div className={`flex items-center overflow-x-auto ${row}`}>
      {items.map(it => {
        const on = it.key === active
        const cls = `px-4 ${level === 1 ? 'py-2.5 font-semibold' : 'py-2 font-medium'} text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${on ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`
        return it.href
          ? <Link key={it.key} href={it.href} scroll={false} className={cls}>{it.label}</Link>
          : <button key={it.key} type="button" onClick={it.onClick} className={cls}>{it.label}</button>
      })}
    </div>
  )
}
