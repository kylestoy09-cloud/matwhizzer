import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('history_finishes').select('year, level, region, region_name, weight, place, name, school').in('school', ['St. Joseph', "St. Joseph's", 'St. Josephs']).order('year')
for (const r of data ?? []) console.log(r.year, r.level, r.region ?? '', r.region_name ?? '', r.weight, r.place, r.name, '|', r.school)
