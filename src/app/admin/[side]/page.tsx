import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getWorkingSeason } from '@/lib/season-context'
import { phaseOn } from '@/lib/phaseDates'
import { loadPhaseDates } from '@/lib/phaseDatesServer'

export const dynamic = 'force-dynamic'

// The admin home opens the dashboard for today's phase, from the side's Season Dates (Calendar
// tool). A side with none set yet: boys follow the old admin_season_config row, girls their
// season's stage.
export default async function AdminDashboard({ params }: { params: Promise<{ side: string }> }) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const { side } = await params
  const gender = side === 'girls' ? 'F' : 'M'
  const db = createSupabaseAdmin()
  const today = new Date().toISOString().slice(0, 10)

  const rows = await loadPhaseDates(db, gender)
  if (rows.length) redirect(`/admin/${side}/${phaseOn(rows, today).phase}`)

  if (gender === 'F') {
    const stage = (await getWorkingSeason('F')).stages.F
    redirect(`/admin/girls/${stage === 'preseason' || stage === 'season' || stage === 'postseason' ? stage : 'offseason'}`)
  }
  const { data: cfg } = await db
    .from('admin_season_config')
    .select('preseason_start, season_start, postseason_start, postseason_end, season_label')
    .eq('is_current', true)
    .maybeSingle()
  const phase = cfg ? phaseOn([{ season_id: 0, gender: 'M', label: cfg.season_label, ...cfg }], today).phase : 'offseason'
  redirect(`/admin/boys/${phase}`)
}
