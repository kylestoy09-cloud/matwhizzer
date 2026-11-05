import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const ws = (await db.from('wrestlers').select('id, first_name, last_name, grade, is_active, created_at').eq('first_name', 'Tyler').eq('last_name', 'French')).data!
for (const w of ws) console.log(w.id.slice(0, 8), w.grade, 'active', w.is_active, 'created', w.created_at.slice(0, 10), '| Track rows linked:', JSON.stringify((await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, school_id, status').eq('wrestler_id', w.id)).data?.map((r: any) => `${r.first_name_raw} ${r.last_name_raw} ${r.grade} @ ${names.get(r.school_id)} ${r.status}`)))
console.log('Tyler French Track rows anywhere:', JSON.stringify((await db.from('roster_grade_import').select('grade, school_id, status, wrestler_id').eq('first_name_raw', 'Tyler').eq('last_name_raw', 'French')).data?.map((r: any) => `${r.grade} @ ${names.get(r.school_id)} ${r.status} → ${r.wrestler_id?.slice(0, 8)}`)))
