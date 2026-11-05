import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log(JSON.stringify((await db.from('admin_season_config').select('*')).data))
console.log(JSON.stringify((await db.from('season_gender_state').select('*')).data))
const t = (await db.from('admin_tasks').select('dashboard, gender, due_date').limit(2000)).data ?? []
console.log('tasks', t.length, JSON.stringify(Object.entries(t.reduce((m: any, r: any) => { const k = `${r.gender}|${r.dashboard}|${r.due_date ? 'dated' : 'nodate'}`; m[k] = (m[k] ?? 0) + 1; return m }, {}))))
