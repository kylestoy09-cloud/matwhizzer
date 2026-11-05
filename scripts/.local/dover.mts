import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F']) {
  const rows = (await db.from('roster_grade_import').select('status').eq('school_id', 61).eq('gender', g).eq('season_id', 2026)).data ?? []
  const by = rows.reduce((m: any, r: any) => (m[r.status] = (m[r.status] ?? 0) + 1, m), {})
  const done = (await db.from('roster_grade_school_complete').select('*').eq('school_id', 61).eq('gender', g)).data
  const log = (await db.from('microcheck_task_log').select('field, status, created_at').eq('school_id', 61).eq('gender', g).eq('field', 'roster_match')).data
  console.log(g, 'import rows', JSON.stringify(by), '| complete mark', done?.length, '| microcheck log', JSON.stringify(log))
}
const types = (await db.from('microcheck_task_types').select('key, gender, field, enabled').eq('field', 'roster_match')).data
console.log(JSON.stringify(types))
