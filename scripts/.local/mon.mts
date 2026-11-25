import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log('Monga profiles:', JSON.stringify((await db.from('wrestlers').select('id, first_name, last_name').ilike('last_name', 'monga')).data))
