import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ids = [4, 18, 287, 267, 314, 24, 76, 56, 78, 62, 321, 44, 83, 130, 383]
console.log('season names (girls):', JSON.stringify((await db.from('school_season_names').select('*').in('school_id', ids).eq('gender', 'F')).data))
const { data: r } = await db.rpc('school_display_name', { p_school_id: 4, p_season_id: 2025, p_gender: 'F' }); console.log('Jefferson girls 2024-25 shows as:', r)
for (const id of [18, 287, 267, 314, 56, 78]) { const { data } = await db.rpc('school_display_name', { p_school_id: id, p_season_id: 2025, p_gender: 'F' }); console.log(id, '2024-25 girls name:', data) }
