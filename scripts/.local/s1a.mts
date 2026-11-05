import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const acts = (await db.from('admin_activity_log').select('action').limit(20000)).data ?? []
console.log('activity actions:', JSON.stringify(Object.entries(acts.reduce((m: any, a: any) => (m[a.action] = (m[a.action] ?? 0) + 1, m), {}))))
// Luke Goss: grade on each postseason entry, and the Track roster row
const lg = (await db.from('wrestlers').select('id').eq('first_name', 'Luke').eq('last_name', 'Goss')).data![0].id
console.log('Luke Goss entries:', JSON.stringify((await db.from('tournament_entries').select('grade, grade_label, tournaments(season_id, name)').eq('wrestler_id', lg)).data))
console.log('Gloucester Catholic boys Track rows:', JSON.stringify((await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, status, season_id').eq('school_id', 269).eq('gender', 'M')).data))
// active boys: grade sources (to see whether boys grades were advanced for 2026-27)
const act = (await db.from('wrestlers').select('grade_confirmed_source, grade_confirmed_at').eq('gender', 'M').eq('is_active', true).limit(20000)).data ?? []
console.log('active boys grade sources:', JSON.stringify(Object.entries(act.reduce((m: any, w: any) => { const k = `${w.grade_confirmed_source}|${(w.grade_confirmed_at ?? '').slice(0, 7)}`; m[k] = (m[k] ?? 0) + 1; return m }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8)))
