import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [d, wc, rd] of [[5, 58, 'QF'], [32, 54, 'R2']]) {
  const t = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2025).eq('name', `Boy_s Districts District ${d}`)).data![0].id
  const ms = (await db.from('matches').select('id, win_type, w:winner_entry_id(wrestlers(first_name,last_name), school_context_raw)').eq('tournament_id', t).eq('weight_class_id', wc).eq('round', rd).is('loser_entry_id', null)).data as any[]
  console.log(d, wc, rd, JSON.stringify(ms.map(m => `${m.win_type} ${m.w?.wrestlers?.first_name} ${m.w?.wrestlers?.last_name} (${m.w?.school_context_raw})`)))
}
