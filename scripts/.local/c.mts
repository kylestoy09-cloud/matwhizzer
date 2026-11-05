import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log(Object.keys((await db.from('wrestler_school_history').select('*').limit(1)).data?.[0] ?? {}).join(','))
