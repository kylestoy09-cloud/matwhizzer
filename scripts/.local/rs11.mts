import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const a = await db.from('team_score_cache_dirty').select('*'); console.log('team_score_cache_dirty:', a.error?.message ?? JSON.stringify(a.data))
for (const f of ['refresh_dirty_team_score_caches', 'mark_team_score_cache_dirty']) { const r = await db.rpc(f, {}); console.log(f, r.error?.message ?? 'exists (ran)') }
