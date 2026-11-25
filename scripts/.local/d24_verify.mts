import { trophyIndex } from '../../src/lib/trophyCase'
import { createClient } from '@supabase/supabase-js'
const idx = await trophyIndex('M')
for (const id of [255, 252, 249, 254]) console.log(id, idx[id].individual.filter(f => f.year === 2013 && f.level === 'district').map(f => `${f.weight} ${f.name}`).join('; '))
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const { data } = await db.from('history_podiums').select('place, tournament:tournaments!inner(name, season_id)').eq('tournament.name', 'Boy_s Districts District 24').eq('tournament.season_id', 2013).is('weight', null)
console.log('team rows via public key', data?.length)
