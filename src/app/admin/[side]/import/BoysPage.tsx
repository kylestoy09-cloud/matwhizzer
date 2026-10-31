import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { ImportClientBoys } from './ImportClientBoys'

export const dynamic = 'force-dynamic'

export default async function ImportBoysPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-2">
        <AdminBackButton />
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Boys Dual Meet Import</h1>
        <p className="text-sm text-slate-500 mt-1">
          Paste TrackWrestling dual meet results to review and import into the database.
        </p>
      </div>
      <ImportClientBoys />
    </div>
  )
}
