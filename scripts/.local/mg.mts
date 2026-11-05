import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('tournament_bouts_girls').select('weight_class, wrestler1_id, wrestler1_school_id, wrestler2_school_id, in_season_tournament_id, in_season_tournaments_girls(name, season)').or('wrestler1_id.like.f5a8199c%,wrestler2_id.like.f5a8199c%')
const { data: w } = await db.from('wrestlers').select('id').eq('first_name', 'Madison').eq('last_name', 'Garcia')
const id = w!.find(x => x.id.startsWith('f5a8199c'))!.id
const { data: b } = await db.from('tournament_bouts_girls').select('weight_class, wrestler1_id, wrestler1_school_id, wrestler2_school_id, in_season_tournaments_girls(name, season)').or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`)
const { data: s } = await db.from('schools').select('id, display_name').in('id', (b as any[]).map(x => x.wrestler1_id === id ? x.wrestler1_school_id : x.wrestler2_school_id))
console.log(JSON.stringify((b as any[]).map(x => [x.in_season_tournaments_girls.name, x.in_season_tournaments_girls.season, x.weight_class])), s)
void data
