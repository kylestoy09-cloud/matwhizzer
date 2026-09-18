import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

type SeasonConfig = {
  preseason_start: string
  season_start: string
  postseason_start: string
  season_end: string
  postseason_end: string
}

function getDashboard(cfg: SeasonConfig | null): string {
  if (!cfg) return 'offseason'
  const today = new Date().toISOString().slice(0, 10)

  if (today >= cfg.postseason_start) return 'postseason'  // postseason takes priority from Jan 25
  if (today >= cfg.season_start)     return 'season'
  if (today >= cfg.preseason_start)  return 'preseason'
  return 'offseason'
}

export default async function AdminDashboard() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()
  const { data: seasonCfg } = await db
    .from('admin_season_config')
    .select('preseason_start, season_start, postseason_start, season_end, postseason_end')
    .eq('is_current', true)
    .maybeSingle()

  const dashboard = getDashboard(seasonCfg as SeasonConfig | null)
  redirect(`/admin/${dashboard}`)
}
