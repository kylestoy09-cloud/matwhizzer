import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const t of ['boys_articles','girls_articles']) { const { data, error } = await db.from(t).select('id, season_id, article_type, section, match_date, status, title, created_at').order('created_at'); console.log(t, error?.message ?? data) }
