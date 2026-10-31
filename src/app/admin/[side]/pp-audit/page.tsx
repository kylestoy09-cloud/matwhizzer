import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { PPAuditClient } from './PPAuditClient'

export const dynamic = 'force-dynamic'

export default async function PPAuditPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-2">
        <AdminBackButton />
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">PP Audit</h1>
        <p className="text-sm text-slate-500 mt-1">
          Compares final power point standings against imported dual meets in the database. Program follows the sidebar gender selector.
        </p>
      </div>
      <PPAuditClient />
    </div>
  )
}
