import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { OffseasonTournamentsClient } from './OffseasonTournamentsClient'

export const dynamic = 'force-dynamic'

export default async function OffseasonTournamentsPage() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Non-NJSIAA · HS Off-Season</p>
        <h1 className="text-lg font-bold text-slate-900">Tournaments</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track HS off-season events (summer duals, invitationals, folkstyle nationals). Results are reference data — no hammer score impact.
        </p>
      </div>
      <OffseasonTournamentsClient />
    </div>
  )
}
