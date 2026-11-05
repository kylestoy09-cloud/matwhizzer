import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const r = await db.from('wrestler_match_score_log').select('*', { count: 'estimated', head: true })
console.log('rows ~', r.count, r.error?.message ?? '')
