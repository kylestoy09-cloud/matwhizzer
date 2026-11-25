import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const n of ['Hunterdon Central', 'Whippany Park']) console.log(n, JSON.stringify((await db.from('schools').select('id').eq('display_name', n)).data))
