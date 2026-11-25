import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log('wrestler 69f2782a now:', JSON.stringify((await db.from('wrestlers').select('id').eq('id', '69f2782a-ea05-4d89-ab58-8fe8bff7257b')).data))
console.log('entry 466f2842 now:', JSON.stringify((await db.from('tournament_entries').select('id, wrestler_id').eq('id', '466f2842-39fd-454b-b952-20bfb4e06df5')).data))
console.log('tournament ids now (D8 2026):', JSON.stringify((await db.from('tournaments').select('id, name').eq('gender', 'M').eq('season_id', 2026).eq('name', 'Boy_s Districts District 8')).data))
