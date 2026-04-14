import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminBackButton } from '../AdminBackButton'
import { DataHealthClient } from './DataHealthClient'

export const dynamic = 'force-dynamic'

export default async function DataHealthPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-2">
        <AdminBackButton />
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Data Health</h1>
        <p className="text-sm text-slate-500 mt-1">
          Database integrity checks and production site availability
        </p>
      </div>
      <DataHealthClient />
    </div>
  )
}
