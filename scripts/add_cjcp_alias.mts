import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { error } = await db.from('school_aliases').insert({ alias: 'Central Jersey College Charter', school_id: 168, alias_type: 'display_name' })
console.log(error ?? 'Done')
