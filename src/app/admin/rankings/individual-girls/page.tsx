import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getWorkingSeason } from '@/lib/season-context'
import { AdminBackButton } from '../../AdminBackButton'
import { IndividualRankingsShellGirls } from '../individual/IndividualRankingsShellGirls'

export const dynamic = 'force-dynamic'

export default async function IndividualRankingsGirlsPage() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  const currentSeason = (await getWorkingSeason('F')).label

  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Individual Rankings — Girls</h1>
      <p className="text-sm text-slate-500 mb-6">
        {currentSeason} · District → Region → Section → State ranking workbench
      </p>
      <IndividualRankingsShellGirls currentSeason={currentSeason} />
    </div>
  )
}
