import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getWorkingSeason } from '@/lib/season-context'
import { OffseasonDashboard } from './OffseasonDashboard'

export const dynamic = 'force-dynamic'

export default async function OffseasonPage({ params }: { params: Promise<{ side: string }> }) {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) redirect('/admin/login')

  const { side } = await params
  let seasonLabel: string
  if (side === 'girls') {
    seasonLabel = (await getWorkingSeason('F')).label
  } else {
    // Boys: the dated admin calendar config
    const { data: seasonCfg } = await createSupabaseAdmin()
      .from('admin_season_config')
      .select('season_label')
      .eq('is_current', true)
      .maybeSingle()
    seasonLabel = (seasonCfg as { season_label?: string } | null)?.season_label ?? 'Current Season'
  }

  return (
    <OffseasonDashboard
      seasonLabel={seasonLabel}
    />
  )
}
