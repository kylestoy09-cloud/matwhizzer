import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const row = { school_id: 5, season_id: 2026, gender: 'F', completed_by: 'write test 20261104' }
const had = (await db.from('roster_grade_school_complete').select('school_id').match({ school_id: 5, season_id: 2026, gender: 'F' })).data!.length
if (had) { console.log('5 already complete; pick another'); process.exit(0) }
console.log('upsert', (await db.from('roster_grade_school_complete').upsert(row)).error?.message ?? 'ok')
console.log('delete', (await db.from('roster_grade_school_complete').delete().match({ school_id: 5, season_id: 2026, gender: 'F' })).error?.message ?? 'ok')
console.log('left', (await db.from('roster_grade_school_complete').select('*', { count: 'exact', head: true }).eq('gender', 'F')).count)
