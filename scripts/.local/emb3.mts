import { createClient } from '@supabase/supabase-js'
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
for (const t of ['dual_meet_matches', 'dual_meet_matches_girls']) { const r = await a.from(t).select('id, wa:wrestlers!wrestler_a_id(first_name,last_name), wb:wrestlers!wrestler_b_id(first_name,last_name)').limit(1); console.log(t, r.error?.message ?? 'ok') }
const r = await a.from('tournament_bracket_slots').select('id, tw:wrestlers!top_wrestler_id(first_name,last_name), bw:wrestlers!bottom_wrestler_id(first_name,last_name)').limit(1); console.log('slots', r.error?.message ?? 'ok')
const m = await a.from('matches').select('id, winner_entry:tournament_entries!winner_entry_id(id)').limit(1); console.log('matches', m.error?.message ?? 'ok')
