import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const t of ['school_aliases', 'girls_schools', 'school_names']) { const { data, error } = await db.from(t).select('*').limit(2); console.log(t, error?.message ?? JSON.stringify(data)) }
