import { createSupabaseServer } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SnapshotClient } from '../snapshot/SnapshotClient'

export const dynamic = 'force-dynamic'

export default async function SnapshotGirlsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: appUser } = user
    ? await supabase.from('app_users').select('role').eq('id', user.id).single()
    : { data: null }
  if (!appUser || appUser.role !== 'admin') notFound()

  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, label')
    .order('id', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 pb-16">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Snap Shot — Girls</h1>
      <p className="text-sm text-slate-500 mb-6">Daily overview of match results, streaks, and rankings.</p>
      <SnapshotClient seasons={seasons ?? []} gender="F" />
    </div>
  )
}
