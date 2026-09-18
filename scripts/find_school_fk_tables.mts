import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const { data, error } = await db.rpc('get_school_fk_tables' as any)
if (error) {
  // Fall back to information_schema query
  const { data: d2, error: e2 } = await (db as any)
    .from('information_schema.referential_constraints')
    .select('*')
  console.log(e2 ?? d2)
}
