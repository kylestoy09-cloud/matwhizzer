import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const WCW: Record<number, number> = {53:106,54:113,55:120,56:126,57:132,58:138,59:144,60:150,61:157,62:165,63:175,64:190,65:215,66:285}
const t = (await db.from('tournaments').select('id').eq('gender','M').eq('season_id',2026).eq('name','Boy_s Districts District 5')).data![0].id
const ents = (await db.from('tournament_entries').select('id, weight_class_id, wrestlers(first_name,last_name)').eq('tournament_id', t).eq('school_id', 75)).data as any[]
for (const e of ents.sort((a, b) => a.weight_class_id - b.weight_class_id)) {
  const ms = (await db.from('matches').select('round, bracket_side, win_type, winner_entry_id, loser_entry_id, l:loser_entry_id(wrestlers(last_name)), w:winner_entry_id(wrestlers(last_name))').or(`winner_entry_id.eq.${e.id},loser_entry_id.eq.${e.id}`)).data as any[]
  const pl = (await db.from('placements').select('place').eq('entry_id', e.id)).data!.map((x: any) => x.place)
  console.log(`${WCW[e.weight_class_id]} ${e.wrestlers.first_name} ${e.wrestlers.last_name} place ${pl}: ${ms.map(m => `${m.round} ${m.winner_entry_id === e.id ? 'W' : 'L'} ${m.win_type} vs ${(m.winner_entry_id === e.id ? m.l : m.w)?.wrestlers?.last_name ?? '(none)'}`).join(' | ')}`)
}
