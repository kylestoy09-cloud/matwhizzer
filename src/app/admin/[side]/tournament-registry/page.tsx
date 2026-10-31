import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { TournamentRegistryClient } from './TournamentRegistryClient'
import { getWorkingSeason } from '@/lib/season-context'

export const dynamic = 'force-dynamic'

export default async function TournamentRegistryPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const [boys, girls] = await Promise.all([getWorkingSeason('M'), getWorkingSeason('F')])

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-6">
        <a href="/admin" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">← Admin</a>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Tournament Registry</h1>
        <p className="text-sm text-slate-500 mt-1">Master list of all tournaments and jamborees — dates, point values, import status.</p>
      </div>
      <TournamentRegistryClient seasonByGender={{ M: boys.label, F: girls.label }} />
    </div>
  )
}
