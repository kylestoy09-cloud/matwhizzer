import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const t of ['matches']) { const r = await db.from(t).select('*').limit(1); console.log(t, r.error?.message ?? Object.keys(r.data?.[0] ?? {}).join(',')) }
