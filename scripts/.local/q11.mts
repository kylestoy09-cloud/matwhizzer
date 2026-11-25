import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ids = ['5bb2d261-6d45-4816-88cd-f0fe93002ad1','1006f7a1-421c-4586-ba10-221ff81a118c','4702ff38-d824-4588-b4b9-ff97688d0598','9638def8-f4d7-447d-b028-0468b687ca18']
for (const t of ['in_season_tournament_participants_girls','in_season_tournament_seeds_girls','tournament_bracket_slots']) {
  const { data, error } = await db.from(t).select('*').in('in_season_tournament_id', ids)
  console.log(t, error?.message ?? data?.length, JSON.stringify(data?.slice(0,30)))
}
