import { createClient } from '@supabase/supabase-js'
import { AboutClient, type CalendarRow } from './AboutClient'

export const revalidate = 86400

const SEASON_ID = 2

export default async function AboutPage() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await db
    .from('season_calendar')
    .select('id, season_label, event_date, event_date_end, event_time, event_category, event_type, gender, label, notes')
    .eq('season_id', SEASON_ID)
    .order('event_date')
    .order('id')

  if (error) console.error('[about/page] season_calendar fetch error:', error)

  const calendarRows: CalendarRow[] = data ?? []

  return <AboutClient calendarRows={calendarRows} dbError={error?.message ?? null} rowCount={calendarRows.length} />
}
