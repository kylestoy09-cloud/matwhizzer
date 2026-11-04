import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { CalendarDashboard } from './CalendarDashboard'
import { getWorkingSeason } from '@/lib/season-context'
import { phaseOn } from '@/lib/phaseDates'
import { loadPhaseDates } from '@/lib/phaseDatesServer'

export const dynamic = 'force-dynamic'

type DbConfig = {
  preseason_start:  string
  season_start:     string
  postseason_start: string
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
  const isTeamPlayoff = (t: string) => t.startsWith('team_playoff_') && (gender === 'F' ? t.endsWith('_girls') : !t.endsWith('_girls'))
  return {
    preseason_start:  first(r => r.event_category === 'preseason') ?? `${season.start_year}-10-01`,
    season_start:     seasonRow?.start_date ?? `${season.start_year}-12-01`,
    postseason_start: first(r => isTeamPlayoff(r.event_type ?? '')) ?? `${season.end_year}-02-01`,
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

  // The side's phase dates (Season Dates panel); the season under way today, or the next one.
  // Without any, the season calendar's dates as before.
  const gender = side === 'girls' ? 'F' : 'M'
  const phaseDates = await loadPhaseDates(db, gender)
  const today = new Date().toISOString().slice(0, 10)
  const row = phaseOn(phaseDates, today).row ?? phaseDates[0] ?? null
  const bounds: DbConfig = row
    ? { preseason_start: row.preseason_start, season_start: row.season_start, postseason_start: row.postseason_start, postseason_end: row.postseason_end, season_label: row.label }
    : await boundsFromSeasonCalendar(db, gender)

  return (
    <CalendarDashboard
      bounds={bounds}
      phaseDates={phaseDates}
      gender={gender}
      currentUser={user.email ?? ''}
    />
  )
}
