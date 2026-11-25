import { createClient } from '@supabase/supabase-js'
const R = await import('../../src/app/api/admin/playoff-history/route')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F'] as const) console.log(g, '\n' + ((await R.sameConflict(db as never, g, [], true)) ?? 'no problems'))
