import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
for (const r of [1, 2, 3, 4]) { const x = await db.rpc('girls_region_mat_time', { p_region: String(r), p_season: 2026 }); console.log('region', r, x.error?.message ?? `${x.data.length} rows, top: ${x.data[0]?.wrestler_name} (${x.data[0]?.school_name}) ${x.data[0]?.match_count} wins ${x.data[0]?.total_seconds}s`) }
