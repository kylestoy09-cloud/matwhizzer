import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { AdminBackButton } from '../../AdminBackButton'
import { IndividualRankingsShellBoys } from './IndividualRankingsShellBoys'

export const dynamic = 'force-dynamic'

export default async function IndividualRankingsPage() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()
  const { data: seasons } = await db
    .from('seasons')
    .select('id, year_label')
    .order('id', { ascending: false })
    .limit(5)

  const currentSeason = seasons?.[0]?.year_label ?? '2025-26'

  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Individual Rankings — Boys</h1>
      <p className="text-sm text-slate-500 mb-6">
        {currentSeason} · District → Region → Section → State ranking workbench
      </p>
      <IndividualRankingsShellBoys currentSeason={currentSeason} />
    </div>
  )
}
