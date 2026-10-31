import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { RosterGradeImportClient } from './RosterGradeImportClient'

export const dynamic = 'force-dynamic'

export default async function RosterGradeImportPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-2">
        <AdminBackButton />
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Boys Roster Grade Import</h1>
        <p className="text-sm text-slate-500 mt-1">
          Match Track Wrestling roster data to live wrestlers and confirm grades.
          Step 1: match schools. Step 2: match wrestlers per school. Step 3: confirm grades.
        </p>
      </div>
      <RosterGradeImportClient gender="M" />
    </div>
  )
}
