import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ws = (await db.from('wrestlers').select('id, first_name, last_name, created_at').gte('created_at', '2026-08-21T01:45:00').lte('created_at', '2026-08-21T02:45:00').order('created_at')).data!
console.log('profiles created 8/21 01:45–02:45 UTC:', ws.length, JSON.stringify(ws.slice(0, 12).map((w: any) => `${w.first_name} ${w.last_name} ${w.created_at.slice(11, 19)}`)))
const log = (await db.from('admin_activity_log').select('created_at, action, admin_email, entity_type, details').gte('created_at', '2026-08-20T20:00:00').lte('created_at', '2026-08-21T06:00:00').order('created_at')).data ?? []
console.log('admin log 8/20 20:00 – 8/21 06:00 UTC:', log.length, JSON.stringify(log.map((l: any) => `${l.created_at.slice(5, 19)} ${l.action} ${l.entity_type} ${JSON.stringify(l.details).slice(0, 120)}`)))
const al = (await db.from('wrestler_name_aliases').select('*').eq('wrestler_id', 'ce3511b1-94fe-4ae9-81e4-88513db19185')).data
console.log('alias row:', JSON.stringify(al))
