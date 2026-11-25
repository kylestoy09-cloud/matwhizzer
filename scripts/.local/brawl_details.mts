import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const t of ['boys_hub_tournaments', 'girls_hub_tournaments', 'mixed_hub_tournaments'])
  console.log(t, (await db.from(t).update({ location: "Bally's Atlantic City, Atlantic City, NJ", time_of_year: 'Mid-July' }).like('name', 'Brawl at the Beach%').select('name')).data)
