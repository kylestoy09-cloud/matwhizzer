import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const r = await db.rpc('district_team_pts', { p_district: 8, p_gender: 'M', p_season: 2026 })
console.log(r.error?.message, (r.data ?? []).length, JSON.stringify((r.data ?? []).slice(0, 2)))
