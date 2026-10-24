import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// 1. Any tournament named East Coast Catholic Classic?
for (const table of ['tournaments', 'nonnjsiaa_offseason_tournaments']) {
  const { data, error } = await db.from(table).select('*').ilike('name', '%catholic classic%')
  console.log(`\n${table} matching "catholic classic":`, error?.message ?? JSON.stringify(data))
}

// 2. Any OOS school named "Christian Brothers High School" or similar?
const { data: oosLike } = await db.from('schools').select('id, display_name, is_oos, state').ilike('display_name', '%christian brothers%')
console.log('\nAll "christian brothers" school records:', JSON.stringify(oosLike))

// 3. Broader: any school record with "Christian Brothers" AND state != NJ, or an is_oos flag
const { data: allCB } = await db.from('schools').select('*').ilike('display_name', '%christian brothers%')
console.log('\nFull records:', JSON.stringify(allCB, null, 2))
