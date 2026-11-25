import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const r = await db.from('season_stages').select('*'); console.log(r.error?.message, r.data)
const { data } = await db.from('season_calendar').select('season_id, gender, event_category, event_type, label, event_date').order('season_id').order('event_date')
const by: Record<string, number> = {}; for (const x of data!) by[`${x.season_id}|${x.gender}`] = (by[`${x.season_id}|${x.gender}`] ?? 0) + 1; console.log(by)
