import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const tours = (await db.from('tournaments').select('id, name').eq('gender', 'M').eq('season_id', 2026).eq('tournament_type', 'districts')).data!
const T = new Map(tours.map((t: any) => [t.id, t.name]))
const ids = tours.map((t: any) => t.id)
const ms: any[] = []; for (let i = 0; ; i += 1000) { const d = (await db.from('matches').select('id, tournament_id, weight_class_id, round, win_type, winner_entry_id, loser_entry_id').in('tournament_id', ids).range(i, i + 999)).data!; ms.push(...d); if (d.length < 1000) break }
const noLoser = ms.filter(m => !m.loser_entry_id)
const by: Record<string, number> = {}; for (const m of noLoser) { const k = `${m.round} ${m.win_type}`; by[k] = (by[k] ?? 0) + 1 }
console.log('2025-26 district bouts stored with NO loser:', noLoser.length, JSON.stringify(by))
const pl = (await db.from('placements').select('tournament_id, weight_class_id, place').in('tournament_id', ids)).data!
const brackets = new Set(ms.map(m => `${m.tournament_id}|${m.weight_class_id}`))
const missingPl: Record<number, number> = {}
for (const b of brackets) { const [t, w] = b.split('|').map(Number); for (const p of [1, 2, 3, 4]) if (!pl.some((x: any) => x.tournament_id === t && x.weight_class_id === w && x.place === p)) missingPl[p] = (missingPl[p] ?? 0) + 1 }
console.log(`brackets ${brackets.size}; placement rows missing by place:`, JSON.stringify(missingPl))
