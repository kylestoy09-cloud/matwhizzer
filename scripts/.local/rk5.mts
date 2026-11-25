import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log('matches columns:', Object.keys((await db.from('matches').select('*').limit(1)).data![0]).join(','))
console.log('entries columns:', Object.keys((await db.from('tournament_entries').select('*').limit(1)).data![0]).join(','))
const t = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2026).eq('name', 'Boy_s Districts District 8')).data![0].id
const rk = (await db.from('wrestlers').select('id').eq('first_name', 'Ryan').eq('last_name', 'Kim')).data!.map((w: any) => w.id).find((x: string) => x.startsWith('ce3511b1'))
const e = (await db.from('tournament_entries').select('*').eq('wrestler_id', rk).eq('tournament_id', t)).data![0]
const ms = (await db.from('matches').select('*').eq('tournament_id', t).eq('weight_class_id', e.weight_class_id)).data!
console.log(JSON.stringify(ms.map((m: any) => ({ round: m.round, created: m.created_at, w: m.winner_entry_id?.slice(0, 8), l: m.loser_entry_id?.slice(0, 8) }))))
