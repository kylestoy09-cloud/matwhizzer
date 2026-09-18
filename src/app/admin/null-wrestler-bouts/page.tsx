import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminBackButton } from '../AdminBackButton'
import { NullWrestlerBoutsClient } from './NullWrestlerBoutsClient'

export const dynamic = 'force-dynamic'

export default async function NullWrestlerBoutsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-2">
        <AdminBackButton />
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Unlinked Wrestler Review</h1>
        <p className="text-sm text-slate-500 mt-1">
          Bouts where one or both wrestlers have no linked ID — these cause incorrect bonus % on the leaderboard.
          Search for the correct wrestler and link them to fix.
        </p>
      </div>
      <NullWrestlerBoutsClient />
    </div>
  )
}
