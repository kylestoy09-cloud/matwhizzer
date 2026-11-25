import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F']) {
  const { data: st } = await db.from('playoff_history_seasons').select('season_id, status, summary->bouts, summary->entrants').eq('gender', g).eq('season_id', 2019)
  const { count: ents } = await db.from('playoff_history_entrants').select('*', { count: 'exact', head: true }).eq('gender', g).eq('season_id', 2019)
  const { data: names } = await db.from('playoff_history_schools').select('raw_name, decision, school_id, seasons').eq('gender', g).contains('seasons', [2019])
  const c: Record<string, number> = {}; for (const n of names ?? []) c[n.decision] = (c[n.decision] ?? 0) + 1
  const { data: joins } = await db.from('playoff_history_joins').select('a_season, b_season').eq('gender', g)
  const j19 = (joins ?? []).filter(j => j.a_season === 2019 || j.b_season === 2019).length
  console.log(g, '| staged', JSON.stringify(st), '| entrants', ents, '| team names in 2018-19', JSON.stringify(c), '| candidates touching 2018-19', j19)
}
