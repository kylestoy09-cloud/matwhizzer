import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const s of [2026, 2027]) {
  const { data } = await db.from('season_calendar').select('id,season_label,event_date,event_date_end,event_time,event_category,event_type,gender,label,notes').eq('season_id', s).order('event_date')
  console.log('=====', s); for (const r of data!) console.log([r.id, r.event_date, r.event_date_end ?? '', r.gender ?? '-', r.event_category, r.event_type, r.label, r.notes ?? ''].join(' | '))
}
