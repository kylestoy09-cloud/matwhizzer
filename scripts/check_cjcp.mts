import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const { data } = await db
  .from('schools')
  .select('id, display_name, section, classification')
  .ilike('display_name', '%central jersey%')

console.log(data)
