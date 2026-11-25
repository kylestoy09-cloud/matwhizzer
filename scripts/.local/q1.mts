import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const tt of ['in_season_tournaments','in_season_tournaments_girls']) {
  const { data } = await db.from(tt).select('*').order('start_date')
  console.log(tt, data?.length, Object.keys(data?.[0]??{}).join(','))
  const types: Record<string,number> = {}
  for (const t of data??[]) types[`${t.season}|${t.tournament_type}`]=(types[`${t.season}|${t.tournament_type}`]??0)+1
  console.log(types)
  for (const t of data??[]) console.log(`  ${t.id}\t${t.season}\t${t.start_date}\t${t.tournament_type}\t${t.name}`)
}
