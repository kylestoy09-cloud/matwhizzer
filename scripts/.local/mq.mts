import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const t = (await db.from('microcheck_task_types').select('*')).data!
console.log('columns:', Object.keys(t[0]).join(','))
console.log(JSON.stringify(t.filter((x: any) => x.source === 'queue').map((x: any) => ({ key: x.key, queue_type: x.queue_type, gender: x.gender, label: x.label }))))
const q = (await db.from('microcheck_tasks').select('task_type, entity_id, metadata').eq('status', 'pending').limit(5)).data
console.log('pending sample:', JSON.stringify(q))
console.log('pending by type:', JSON.stringify(((await db.from('microcheck_tasks').select('task_type').eq('status', 'pending')).data ?? []).reduce((a: any, r: any) => (a[r.task_type] = (a[r.task_type] ?? 0) + 1, a), {})))
