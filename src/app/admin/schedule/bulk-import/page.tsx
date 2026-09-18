import { AdminBackButton } from '../../AdminBackButton'
import { ScheduleBulkImportClient } from './ScheduleBulkImportClient'

export const dynamic = 'force-dynamic'

export default function ScheduleBulkImportPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Bulk Schedule Import</h1>
      <p className="text-sm text-slate-500 mb-8">
        Import scheduled dual meets from multiple schools at once. Matches where both schools report
        the same event are cross-confirmed and created automatically. Single-sided matches against
        tracked opponents are flagged for review. Tournament entries are matched to 2025-26 events
        from the rollover tool.
      </p>
      <ScheduleBulkImportClient />
    </div>
  )
}
