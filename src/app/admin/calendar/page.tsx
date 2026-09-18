import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { CalendarDashboard } from './CalendarDashboard'

export const dynamic = 'force-dynamic'

type DbConfig = {
  preseason_start:  string
  season_start:     string
  postseason_start: string
  season_end:       string
  postseason_end:   string
  season_label:     string
}

export default async function CalendarPage() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()

  const { data: cfg } = await db
    .from('admin_season_config')
    .select('preseason_start, season_start, postseason_start, season_end, postseason_end, season_label')
    .eq('is_current', true)
    .maybeSingle()

  const bounds = cfg as DbConfig | null ?? {
    preseason_start:  '2026-10-01',
    season_start:     '2026-12-07',
    postseason_start: '2027-01-25',
    season_end:       '2027-02-07',
    postseason_end:   '2027-03-15',
    season_label:     'Current Season',
  }

  return (
    <CalendarDashboard
      bounds={bounds}
      currentUser={user.email ?? ''}
    />
  )
}
