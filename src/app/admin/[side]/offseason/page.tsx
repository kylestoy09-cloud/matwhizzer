import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { OffseasonDashboard } from './OffseasonDashboard'

export const dynamic = 'force-dynamic'

export default async function OffseasonPage() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()
  const { data: seasonCfg } = await db
    .from('admin_season_config')
    .select('season_label')
    .eq('is_current', true)
    .maybeSingle()

  const cfg = seasonCfg as { season_label?: string } | null

  return (
    <OffseasonDashboard
      seasonLabel={cfg?.season_label ?? 'Current Season'}
    />
  )
}
