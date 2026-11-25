import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const n = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
console.log('existing TF-1 bouts:', (await db.from('matches').select('id', { count: 'exact', head: true }).eq('win_type', 'TF-1')).count)
const cases: [string, string, string, number, string][] = [
  ['Salvatore Borrometi', 'Joaquin Duque', 'M', 2025, 'regions'], ['Adelaide Reist', 'Hayden Wagner', 'F', 2025, 'girls_regions'],
  ['Anthony Riotto', 'Chuck Willoe', 'M', 2026, 'districts'], ['Tommy Perrota', 'Xavian Robinson', 'M', 2026, 'districts'],
  ['Ethan Delacruz', 'Matthew Vazquez', 'M', 2026, 'districts'], ['Nicholas Romaniello', 'Oscar Casas', 'M', 2026, 'districts'], ['Yehuda Pincus', 'Selah Davis', 'M', 2026, 'districts']]
for (const [w, l, g, s, type] of cases) {
  const tids = (await db.from('tournaments').select('id').eq('gender', g).eq('season_id', s).eq('tournament_type', type)).data!.map((t: any) => t.id)
  const [wf, ...wl] = w.split(' '); const ws = (await db.from('wrestlers').select('id').eq('first_name', wf).eq('last_name', wl.join(' ')).eq('gender', g)).data!.map((x: any) => x.id)
  const es = (await db.from('tournament_entries').select('id').in('tournament_id', tids).in('wrestler_id', ws)).data!.map((x: any) => x.id)
  const ms = es.length ? (await db.from('matches').select('id, round, win_type, score_raw, winner_score, loser_score, fall_time_seconds, l:loser_entry_id(wrestlers(first_name, last_name))').in('winner_entry_id', es)).data as any[] : []
  const hit = ms.filter(m => n(`${m.l?.wrestlers?.first_name}${m.l?.wrestlers?.last_name}`) === n(l))
  console.log(`${w} over ${l} (${g} ${s} ${type}): ${hit.length ? hit.map(m => `${m.id} ${m.round} ${m.win_type} score_raw=${m.score_raw} ${m.winner_score}-${m.loser_score} t=${m.fall_time_seconds}`).join(' | ') : 'NOT FOUND'}`)
}
