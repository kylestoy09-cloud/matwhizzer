import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { CalendarDashboard } from './CalendarDashboard'
import { getWorkingSeason } from '@/lib/season-context'

export const dynamic = 'force-dynamic'

type DbConfig = {
  preseason_start:  string
  season_start:     string
  postseason_start: string
  season_end:       string
  postseason_end:   string
  season_label:     string
}

// Season-in-progress bounds from seasons + season_calendar: girls always, boys when
// there is no admin_season_config row (that dated config is the boys calendar)
async function boundsFromSeasonCalendar(db: ReturnType<typeof createSupabaseAdmin>, gender: 'M' | 'F'): Promise<DbConfig> {
  const season = await getWorkingSeason(gender)
  const g = gender === 'F' ? 'girls' : 'boys'
  const [{ data: seasonRow }, { data: rows }] = await Promise.all([
    db.from('seasons').select('start_date, end_date').eq('id', season.id).maybeSingle(),
    db.from('season_calendar').select('event_date, event_date_end, event_category, event_type')
      .eq('season_id', season.id).order('event_date'),
  ])
  const cal = rows ?? []
  const first = (pred: (r: typeof cal[number]) => boolean) => cal.find(pred)?.event_date as string | undefined
  const state     = cal.find(r => r.event_type === `individual_state_${g}`)
  const teamFinal = cal.find(r => r.event_type === (gender === 'F' ? 'team_playoff_state_final_girls' : 'team_playoff_state_final_public'))
  const isTeamPlayoff = (t: string) => t.startsWith('team_playoff_') && (gender === 'F' ? t.endsWith('_girls') : !t.endsWith('_girls'))
  return {
    preseason_start:  first(r => r.event_category === 'preseason') ?? `${season.start_year}-10-01`,
    season_start:     seasonRow?.start_date ?? `${season.start_year}-12-01`,
    postseason_start: first(r => isTeamPlayoff(r.event_type ?? '')) ?? `${season.end_year}-02-01`,
    season_end:       teamFinal?.event_date ?? `${season.end_year}-02-28`,
    postseason_end:   state?.event_date_end ?? state?.event_date ?? seasonRow?.end_date ?? `${season.end_year}-03-15`,
    season_label:     season.label,
  }
}

export default async function CalendarPage({ params }: { params: Promise<{ side: string }> }) {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()
  const { side } = await params

  let bounds: DbConfig
  if (side === 'girls') {
    bounds = await boundsFromSeasonCalendar(db, 'F')
  } else {
    const { data: cfg } = await db
      .from('admin_season_config')
      .select('preseason_start, season_start, postseason_start, season_end, postseason_end, season_label')
      .eq('is_current', true)
      .maybeSingle()
    bounds = (cfg as DbConfig | null) ?? await boundsFromSeasonCalendar(db, 'M')
  }

  return (
    <CalendarDashboard
      bounds={bounds}
      currentUser={user.email ?? ''}
    />
  )
}
