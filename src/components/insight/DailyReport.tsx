// Insight → Daily Report: two tabs, 7 Things (first) and the Report. Content comes later.
import { SiteTabs } from '@/components/site/SiteTabs'
import { ComingSoon } from './ComingSoon'

export function DailyReport({ side, tab }: { side: 'boys' | 'girls'; tab: string | undefined }) {
  const active = tab === 'report' ? 'report' : '7-things'
  const base = `/${side}/insight/daily-report`
  return (
    <>
      <div className="-mt-2 mb-6">
        <SiteTabs level={2} active={active} items={[{ key: '7-things', label: '7 Things', href: base }, { key: 'report', label: 'Report', href: `${base}?tab=report` }]} />
      </div>
      <ComingSoon what={active === 'report' ? 'The Daily Report' : '7 Things'} />
    </>
  )
}
