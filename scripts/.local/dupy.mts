import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log(JSON.stringify((await db.from('wrestlers').select('id, first_name, last_name, gender, grade, main_weight, created_at').or('last_name.ilike.%farb%,last_name.ilike.%faber%,first_name.ilike.%reagan%farber%,first_name.ilike.%raegan%,last_name.ilike.%ferber%')).data))
const nh = (await db.from('wrestler_name_aliases').select('wrestler_id, raw_name').eq('school_id', 135)).data!.filter((a: any) => /reag|raeg|farb|faber/i.test(a.raw_name))
console.log('NH aliases', JSON.stringify(nh))
const T = '7579e761-8ad5-4b47-8b3e-e5048eb7d8ef'
console.log(JSON.stringify((await db.from('in_season_tournaments_girls').select('name, start_date').eq('id', T)).data))
const ids = ['f8ed474f-46d5-4eb4-b7a3-a31919cbaaf7', 'f882b7f5-67fd-4136-a9df-323dd20b9d60']
for (const r of (await db.from('tournament_bouts_girls').select('round, weight_class, wrestler1_id, wrestler1_name_raw, wrestler2_id, wrestler2_name_raw, result_type, winner').eq('in_season_tournament_id', T)).data!.filter((r: any) => ids.includes(r.wrestler1_id) || ids.includes(r.wrestler2_id)))
  console.log(r.weight_class, r.round, r.wrestler1_name_raw, 'vs', r.wrestler2_name_raw, r.result_type)
