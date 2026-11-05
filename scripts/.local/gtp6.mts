import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
for (const t of ['girls_schools', 'boys_schools', 'schools', 'school_season_names']) {
  const r = await db.from(t).select('*', { count: 'exact', head: true })
  console.log(t, r.count, r.error?.message ?? '')
}
