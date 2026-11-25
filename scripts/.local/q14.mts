import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('tournament_bouts_girls').select('weight_class,round,wrestler1_name_raw,wrestler2_name_raw,result_type').eq('in_season_tournament_id','e9c7a4cc-7cee-4424-89d5-19fa627282f6')
const c: Record<number,number> = {}; for (const b of data!) c[b.weight_class]=(c[b.weight_class]??0)+1; console.log(c)
console.log(data!.filter(b=>[185,235].includes(b.weight_class)))
