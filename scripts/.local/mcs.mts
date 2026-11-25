import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log(JSON.stringify((await db.from('wrestlers').select('id, first_name, last_name').or('last_name.ilike.%mcsorley%,last_name.ilike.%fearon%,last_name.ilike.%palmisano%,first_name.ilike.%pinhao%')).data))
for (const n of ['Arjun', 'Terrance', 'Charles']) { const w = (await db.from('wrestlers').select('id').eq('first_name', n).eq('last_name', '')).data!; for (const x of w) { const e = (await db.from('tournament_entries').select('school_context_raw, tournaments(name)').eq('wrestler_id', x.id)).data; console.log(n, x.id.slice(0, 8), JSON.stringify(e)) } }
