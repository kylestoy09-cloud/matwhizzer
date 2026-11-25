import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const bouts: any[] = []; for (let f = 0; ; f += 1000) { const { data } = await db.from('playoff_history_bouts').select('kind, num, weight, round, winner, winner_team, loser, loser_team, win_type').eq('gender', 'M').eq('season_id', 2013).order('id').range(f, f + 999); bouts.push(...(data ?? [])); if ((data ?? []).length < 1000) break }
const ents: any[] = []; for (let f = 0; ; f += 1000) { const { data } = await db.from('playoff_history_entrants').select('kind, num, weight, name, team, wrestler_id').eq('gender', 'M').eq('season_id', 2013).order('id').range(f, f + 999); ents.push(...(data ?? [])); if ((data ?? []).length < 1000) break }
const has = new Set(ents.filter(e => e.wrestler_id).map(e => `${e.kind}|${e.num}|${e.weight}|${e.name}|${e.team}`))
for (const b of bouts) if (!has.has(`${b.kind}|${b.num}|${b.weight}|${b.winner}|${b.winner_team}`)) console.log('skipped:', JSON.stringify(b))
