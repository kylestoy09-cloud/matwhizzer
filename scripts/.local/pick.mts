import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const one = async (q: any) => (await q).data?.[0]
const bw = await one(db.from('wrestler_hammer_scores').select('wrestler_id').eq('season', '2025-26').eq('gender', 'M').order('hammer_score', { ascending: false }).limit(1))
const gw = await one(db.from('wrestler_hammer_scores').select('wrestler_id').eq('season', '2025-26').eq('gender', 'F').order('hammer_score', { ascending: false }).limit(1))
const bt = await one(db.from('in_season_tournaments').select('id, name').eq('season', '2025-26').eq('name', 'Mustang Invitational Tournament'))
const gt = await one(db.from('in_season_tournaments_girls').select('id, name').eq('season', '2025-26').eq('name', '2025 EB Lady Bear Invitational'))
const bm = await one(db.from('dual_meets').select('id').eq('season_id', 2026).eq('gender', 'M').eq('meet_date', '2026-02-21').order('id').limit(1))
const gm = await one(db.from('dual_meets_girls').select('id').eq('season_id', 2026).eq('meet_date', '2026-01-16').order('id').limit(1))
console.log(JSON.stringify({ bw: bw.wrestler_id, gw: gw.wrestler_id, bt: bt.id, gt: gt.id, bm: bm.id, gm: gm.id }))
