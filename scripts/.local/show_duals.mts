import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const t of ['boys_hub_tournaments', 'girls_hub_tournaments', 'mixed_hub_tournaments'])
  console.log(t, (await db.from(t).update({ is_active: true }).in('name', ['NHSCA National Duals', 'AAU Scholastic Duals (Disney Duals)', 'NHSCA National Duals (MS Division)']).select('name')).data?.map(x => x.name))
