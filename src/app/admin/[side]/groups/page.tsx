import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { GroupsClient } from './GroupsClient'

export const dynamic = 'force-dynamic'

export default function GroupsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">School Groups</h1>
      <p className="text-sm text-slate-500 mb-6">
        View and edit which schools belong to each conference, section, group, district, or region.
      </p>
      <GroupsClient />
    </div>
  )
}
