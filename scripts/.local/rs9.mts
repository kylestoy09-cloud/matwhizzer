import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const r = await db.rpc('refresh_boys_team_score_cache', { season: 2026 }); console.log('refresh:', r.error?.message ?? 'ok')
for (const [t, s] of [[147, 42], [171, 264], [171, 281]]) console.log(t, s, JSON.stringify((await db.from('precomputed_team_scores').select('total_points').eq('tournament_id', t).eq('school_id', s)).data))
// Fort Lee D8: 3/21 entries+bouts vs now
const SOT = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/sot.json', 'utf8'))
const old = SOT.entries.filter((e: any) => e.tournament_id === '147' && e.school === 'Fort Lee')
for (const e of old) { const n = SOT.matches.filter((m: any) => m.winner_entry_id === e.entry_id || m.loser_entry_id === e.entry_id); const p = SOT.placements.filter((x: any) => x.entry_id === e.entry_id).map((x: any) => x.place)
  console.log(`3/21 ${e.weight} ${e.first_name} ${e.last_name}: ${n.map((m: any) => `${m.round}${m.winner_entry_id === e.entry_id ? 'W' : 'L'} ${m.win_type}`).join(', ')} place ${p}`) }
const now = (await db.from('tournament_entries').select('id, weight_class_id, wrestlers(first_name, last_name)').eq('tournament_id', 147).eq('school_id', 42)).data as any[]
for (const e of now) { const ms = (await db.from('matches').select('round, winner_entry_id, win_type').or(`winner_entry_id.eq.${e.id},loser_entry_id.eq.${e.id}`)).data as any[]; const p = (await db.from('placements').select('place').eq('entry_id', e.id)).data!.map((x: any) => x.place)
  console.log(`now wc${e.weight_class_id} ${e.wrestlers.first_name} ${e.wrestlers.last_name}: ${ms.map(m => `${m.round}${m.winner_entry_id === e.id ? 'W' : 'L'} ${m.win_type}`).join(', ')} place ${p}`) }
