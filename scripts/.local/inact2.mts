import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const l = (await db.from('admin_activity_log').select('action, admin_email, created_at').or('action.ilike.%rollover%,action.ilike.%inactive%,action.ilike.%graduat%').order('created_at')).data
console.log(JSON.stringify(l))
const w = (await db.from('wrestlers').select('grade, grade_confirmed_source, grade_confirmed_at').eq('gender', 'M').eq('is_active', false).neq('grade', 'Sr').limit(1000)).data!
console.log(JSON.stringify(Object.entries(w.reduce((m: any, x: any) => { const k = `${x.grade_confirmed_source}|${(x.grade_confirmed_at ?? '').slice(0, 10)}`; m[k] = (m[k] ?? 0) + 1; return m }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8)))
