import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const { data: schools } = await db
  .from('schools')
  .select('id, display_name, section, classification, is_combined')
  .ilike('display_name', '%roselle%')
console.log('Schools:', schools)

const { data: aliases } = await db
  .from('school_aliases')
  .select('alias, school_id')
  .ilike('alias', '%roselle%')
console.log('Aliases:', aliases)
