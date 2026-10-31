import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { ImportJamboreeClientGirls } from './ImportJamboreeClientGirls'

export const dynamic = 'force-dynamic'

export default async function ImportJamboreeGirlsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-2">
        <AdminBackButton />
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Girls Jamboree / Round Robin Import</h1>
        <p className="text-sm text-slate-500 mt-1">
          Import jamboree or round-robin results. Paste the raw bout lines — duplicates across team
          sections are de-duplicated automatically. Each unique school pairing becomes a dual meet
          entry, so bouts count toward wrestler records and streaks.
        </p>
      </div>
      <ImportJamboreeClientGirls />
    </div>
  )
}
