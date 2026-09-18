import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { TournamentRegistryClient } from './TournamentRegistryClient'

export const dynamic = 'force-dynamic'

export default async function TournamentRegistryPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-6">
        <a href="/admin" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">← Admin</a>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Tournament Registry</h1>
        <p className="text-sm text-slate-500 mt-1">Master list of all tournaments and jamborees — dates, point values, import status.</p>
      </div>
      <TournamentRegistryClient season="2025-26" />
    </div>
  )
}
