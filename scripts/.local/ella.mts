import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log((await db.from('wrestlers').select('id').eq('first_name', 'Ella').eq('last_name', 'Poalillo')).data?.[0]?.id)
