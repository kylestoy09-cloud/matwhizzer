import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const d = (await db.from('rtf_import_drafts').select('id, created_at, updated_at, status, step, wrestler_overrides').gte('updated_at', '2026-09-10T03:00').lte('updated_at', '2026-09-10T03:45')).data ?? []
for (const x of d) console.log(x.id, 'created', x.created_at, 'updated', x.updated_at, x.status, 'overrides', Object.keys(x.wrestler_overrides ?? {}).length)
