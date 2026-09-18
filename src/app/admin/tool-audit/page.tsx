import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminBackButton } from '../AdminBackButton'
import { ToolAuditClient } from './ToolAuditClient'

export const dynamic = 'force-dynamic'

export default async function ToolAuditPage() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-2">
        <AdminBackButton />
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tool Audit</h1>
        <p className="text-sm text-slate-500 mt-1">
          Check which dashboards each tool is available in. These determine which tools appear in the task tool-picker when creating a task.
          Click a column header to toggle the entire phase.
        </p>
      </div>
      <ToolAuditClient />
    </div>
  )
}
