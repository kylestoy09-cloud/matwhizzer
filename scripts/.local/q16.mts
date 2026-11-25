import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const r = await db.from('weight_classes').select('*').limit(2); console.log(r.error?.message, r.data)
