// The About page's data for one side (Kyle 2026-11-11: the NJSIAA publishes boys and girls separately): the
// side's newest season — the one being set up or played — with its NJSIAA calendar and rule documents. Used by
// Insight's About tab (/boys/insight/about, /girls/insight/about) and /about (boys).
import { createClient } from '@supabase/supabase-js'
import { getWorkingSeason } from '@/lib/season-context'
import type { Gender } from '@/lib/seasons'
import type { CalendarRow } from './AboutClient'
import { njsiaaDocs } from './njsiaaDocs2027'

export async function loadAbout(gender: Gender) {
  const season = await getWorkingSeason(gender)
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await db
    .from('season_calendar')
    .select('id, season_label, event_date, event_date_end, event_time, event_category, event_type, gender, label, notes')
    .eq('season_id', season.id)
    .or(`gender.is.null,gender.eq.${gender}`)   // shared rows and this side's; the other side's never reach the page
    .order('event_date')
    .order('id')

  if (error) console.error('[about] season_calendar fetch error:', error)

  const calendarRows: CalendarRow[] = data ?? []
  const side = gender === 'F' ? 'girls' as const : 'boys' as const
  return { calendarRows, dbError: error?.message ?? null, rowCount: calendarRows.length, side, docs: njsiaaDocs(side, season.end_year) }
}
