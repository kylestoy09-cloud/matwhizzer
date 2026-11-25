import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['F', 'M']) {
  const c = async (t: string, f: (q: any) => any) => (await f(db.from(t).select('*', { count: 'exact', head: true }).eq('gender', g))).count ?? 0
  const pending = await c('playoff_history_joins', q => q.eq('decision', 'pending'))
  const decided = await c('playoff_history_joins', q => q.neq('decision', 'pending'))
  const ents = await c('playoff_history_entrants', q => q)
  const assigned = await c('playoff_history_entrants', q => q.not('wrestler_id', 'is', null))
  const made = await c('playoff_history_profiles', q => q.eq('created', true)), linked = await c('playoff_history_profiles', q => q.eq('created', false))
  console.log(g, `| maybes decided ${decided}, pending ${pending} | entries with a wrestler ${assigned} of ${ents} | profiles made ${made}, linked ${linked}`)
}
