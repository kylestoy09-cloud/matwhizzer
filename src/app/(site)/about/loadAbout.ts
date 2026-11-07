// The About page's data (the live season's calendar). Used by /about and Insight's About tab.
import { createClient } from '@supabase/supabase-js'
import { getLiveSeason } from '@/lib/seasons-server'
import type { CalendarRow } from './AboutClient'

export async function loadAbout() {
  const SEASON_ID = (await getLiveSeason('M')).id
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

  if (error) console.error('[about] season_calendar fetch error:', error)

  const calendarRows: CalendarRow[] = data ?? []
  return { calendarRows, dbError: error?.message ?? null, rowCount: calendarRows.length }
}
