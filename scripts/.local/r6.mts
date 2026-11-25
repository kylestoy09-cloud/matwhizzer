import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [tid, wc] of [[177, 53], [172, 53], [126, 53], [147, 62]]) {
  const t = (await db.from('tournaments').select('name, season_id').eq('id', tid)).data![0]
  const ms = (await db.from('matches').select('round, bracket_side, loser_entry_id').eq('tournament_id', tid).eq('weight_class_id', wc)).data!
  const c: Record<string, number> = {}; for (const m of ms) c[`${m.bracket_side[0]}:${m.round}${m.loser_entry_id ? '' : '(bye)'}`] = (c[`${m.bracket_side[0]}:${m.round}${m.loser_entry_id ? '' : '(bye)'}`] ?? 0) + 1
  const e = (await db.from('tournament_entries').select('id', { count: 'exact', head: true }).eq('tournament_id', tid).eq('weight_class_id', wc)).count
  console.log(tid, t.name, t.season_id, `entries ${e}`, JSON.stringify(c))
}
