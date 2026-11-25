import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ents = (await db.from('tournament_entries').select('id, weight_class_id, wrestlers(first_name,last_name)').eq('tournament_id', 147).eq('school_id', 42)).data as any[]
for (const e of ents) {
  const ms = (await db.from('matches').select('round, bracket_side, win_type, winner_entry_id, loser_entry_id').or(`winner_entry_id.eq.${e.id},loser_entry_id.eq.${e.id}`)).data as any[]
  console.log(`${e.wrestlers.first_name} ${e.wrestlers.last_name}: ${ms.map(m => `${m.round}/${m.bracket_side[0]} ${m.winner_entry_id === e.id ? 'W' : 'L'} ${m.win_type}${m.loser_entry_id ? '' : ' (no loser)'}`).join(' | ')}`)
}
