import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { TransfersTool } from './TransfersTool'

export default function TransfersPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="mt-4 mb-1 text-xl font-bold text-slate-900">Transfers</h1>
      <p className="mb-2 text-sm text-slate-500">Search a wrestler and pick their new team: it is logged as a transfer for this season and their name is linked at the new school, so the next upload there finds them. The list runs all season and is complete once the season is archived.</p>
      <TransfersTool />
    </div>
  )
}
