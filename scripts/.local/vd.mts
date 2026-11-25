import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [f, l] of [['Valen', 'Delaney'], ['Charles', 'Palmisano'], ['Aidan', 'Wright']]) {
  const ws = (await db.from('wrestlers').select('id').eq('first_name', f).eq('last_name', l)).data!.map((x: any) => x.id)
  const es = (await db.from('tournament_entries').select('id, tournaments(name, season_id)').in('wrestler_id', ws)).data!.filter((e: any) => e.tournaments.season_id === 2026 && e.tournaments.name.includes('District'))
  for (const e of es as any[]) { const ms = (await db.from('matches').select('round, bracket_side, win_type, loser_entry_id, winner_entry_id').or(`winner_entry_id.eq.${e.id},loser_entry_id.eq.${e.id}`)).data!; console.log(f, l, e.tournaments.name, JSON.stringify(ms.map((m: any) => `${m.round}/${m.bracket_side} ${m.winner_entry_id === e.id ? 'W' : 'L'} ${m.win_type} loser=${m.loser_entry_id ? 'yes' : 'NULL'}`))) }
}
