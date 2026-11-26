// The Tournament Hub's 5 tabs (Kyle 2026-11-26): In-season tournaments · Team postseason · District · Region · State,
// each with a History switch where past seasons exist (docs/plans/tournament_hub_5_tabs.md)
import Link from 'next/link'

export const HUB_TABS = [
  { id: 'inseason', label: 'In-season tournaments', history: true },
  { id: 'team', label: 'Team postseason', history: false },
  { id: 'district', label: 'District', history: true },
  { id: 'region', label: 'Region', history: true },
  { id: 'state', label: 'State', history: true },
] as const
export type HubTab = (typeof HUB_TABS)[number]['id']

export function HubTabs({ side, tab, history }: { side: string; tab: HubTab; history: boolean }) {
  const href = (t: string, h: boolean) => `/admin/${side}/tournament-hub?tab=${t}${h ? '&history=1' : ''}`
  const cur = HUB_TABS.find(t => t.id === tab)!
  return (
    <div className="px-4 pt-4 flex items-end justify-between gap-4">
      <div className="flex gap-1 border-b border-slate-200">
        {HUB_TABS.map(t => (
          <Link key={t.id} href={href(t.id, false)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${t.id === tab ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t.label}</Link>
        ))}
      </div>
      {cur.history && (
        <div className="flex border border-slate-300 text-xs font-semibold">
          <Link href={href(tab, false)} className={`px-3 py-1 ${!history ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>This season</Link>
          <Link href={href(tab, true)} className={`px-3 py-1 ${history ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>History</Link>
        </div>
      )}
    </div>
  )
}
