import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data, error } = await db.from('admin_activity_log').select('*').eq('action', 'scoring_run').order('created_at', { ascending: false }).limit(6)
console.log(error?.message, data?.map(d => `${d.created_at?.slice(0, 19)} ${JSON.stringify(d.details)}`).join('\n'))
