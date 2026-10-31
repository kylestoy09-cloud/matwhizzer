import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getWorkingSeason } from '@/lib/season-context'

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

export default async function AdminDashboard({ params }: { params: Promise<{ side: string }> }) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const { side } = await params

  // Girls follow the girls season's own stage; the dated config below is the boys calendar
  if (side === 'girls') {
    const stage = (await getWorkingSeason('F')).stages.F
    redirect(`/admin/girls/${stage === 'preseason' || stage === 'season' || stage === 'postseason' ? stage : 'offseason'}`)
  }

  const db = createSupabaseAdmin()
  const { data: seasonCfg } = await db
    .from('admin_season_config')
    .select('preseason_start, season_start, postseason_start, season_end, postseason_end')
    .eq('is_current', true)
    .maybeSingle()

  const dashboard = getDashboard(seasonCfg as SeasonConfig | null)
  redirect(`/admin/boys/${dashboard}`)
}
