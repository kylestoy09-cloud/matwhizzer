import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

for (const id of [55, 59]) {
  const { data } = await db.from('school_districts').select('*').eq('school_id', id)
  console.log(`school_districts for school ${id}:`, data)
}
