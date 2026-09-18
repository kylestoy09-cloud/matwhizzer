import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminBackButton } from '../AdminBackButton'
import { AlignmentImportClient } from './AlignmentImportClient'

export const dynamic = 'force-dynamic'

export default async function AlignmentImportPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-2">
        <AdminBackButton />
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Alignment Import (Boys)</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload the NJSIAA district/region alignment CSV to set school assignments for the current boys preseason season.
          Existing assignments for the season are overwritten on conflict.
        </p>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Expected columns: school_id, Region, District, School
        </p>
      </div>
      <AlignmentImportClient />
    </div>
  )
}
