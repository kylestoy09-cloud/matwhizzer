import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const t = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2025).eq('name', 'Boy_s Districts District 10')).data![0].id
const ms = (await db.from('matches').select('round, win_type, w:winner_entry_id(wrestlers(last_name), school_context_raw), l:loser_entry_id(wrestlers(last_name), school_context_raw)').eq('tournament_id', t).eq('weight_class_id', 53)).data as any[]
for (const m of ms) console.log(m.round, m.win_type, `${m.w?.wrestlers?.last_name} (${m.w?.school_context_raw})`, 'over', `${m.l?.wrestlers?.last_name} (${m.l?.school_context_raw})`)
