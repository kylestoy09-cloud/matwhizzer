import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const WC: Record<number, number> = {106:53,113:54,120:55,126:56,132:57,138:58,144:59,150:60,157:61,165:62,175:63,190:64,215:65,285:66}
for (const [d, w, f, l, tw] of [[5, 165, 'Jack', 'Wans', 4], [16, 106, 'Aidan', 'Wright', 13], [16, 113, 'James', 'Grant', 13], [7, 113, 'Anthony', 'Riotto', 24], [7, 113, 'Tommy', 'Perrota', 9], [14, 150, 'Ethan', 'Delacruz', 24.5], [14, 175, 'Nicholas', 'Romaniello', 13]] as const) {
  const t = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2026).eq('name', `Boy_s Districts District ${d}`)).data![0].id
  const ws = (await db.from('wrestlers').select('id').eq('first_name', f).eq('last_name', l)).data!.map((x: any) => x.id)
  const e = (await db.from('tournament_entries').select('id').eq('tournament_id', t).eq('weight_class_id', WC[w]).in('wrestler_id', ws)).data![0]
  const ms = (await db.from('matches').select('round, bracket_side, win_type, winner_entry_id, w:winner_entry_id(wrestlers(last_name)), l:loser_entry_id(wrestlers(last_name))').or(`winner_entry_id.eq.${e.id},loser_entry_id.eq.${e.id}`)).data as any[]
  console.log(`D${d} ${w} ${f} ${l} (TrackWrestling ${tw}): ${ms.map(m => `${m.round} ${m.winner_entry_id === e.id ? 'W' : 'L'} ${m.win_type} vs ${(m.winner_entry_id === e.id ? m.l : m.w)?.wrestlers?.last_name ?? '(none)'}`).join(' | ')}`)
}
