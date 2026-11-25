import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
for (const s of [2026, 2027]) { const { data, error } = await db.rpc('school_directory', { p_gender: 'M', p_season: s }); console.log(s, error?.message, (data ?? []).length, JSON.stringify((data ?? [])[0])) }
