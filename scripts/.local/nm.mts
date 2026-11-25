import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log((await db.from('schools').select('id, display_name').in('id', [394, 37, 22]).limit(5)).data)
const { data } = await db.from('schools').select('id, display_name').or('display_name.ilike.%Delbarton%,display_name.ilike.%Joseph (Montvale)%')
console.log(data)
console.log((await db.from('school_season_names').select('school_id, season_id, gender, display_name').in('school_id', (data ?? []).map(d => d.id))).data)
