import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { ArchiveClient } from './ArchiveClient'

export const dynamic = 'force-dynamic'

export default function RankingsArchivePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Rankings Archive</h1>
      <p className="text-sm text-slate-500 mb-8">
        Browse all published ranking snapshots across every scope. Select a scope to view the full
        timeline with week-over-week movement indicators.
      </p>
      <ArchiveClient />
    </div>
  )
}
