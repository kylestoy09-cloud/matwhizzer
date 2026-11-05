import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const T = '606d5f59-a59c-42f9-b932-e34cf9ef36ac'
console.log(JSON.stringify((await db.from('in_season_tournaments_girls').select('name, start_date').eq('id', T)).data))
const cols = Object.keys((await db.from('tournament_bouts_girls').select('*').limit(1)).data![0])
console.log(cols.join(','))
const ids = ['057e83ee-9aa3-486d-ad0a-d02db52d7816', 'a5f7de8d-d1e9-4207-a8fe-497e07c07b1c']
const b = (await db.from('tournament_bouts_girls').select('*').eq('in_season_tournament_id', T).eq('weight_class', 132)).data!
for (const r of b.filter((r: any) => ids.includes(r.wrestler1_id) || ids.includes(r.wrestler2_id)))
  console.log(JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => /round|name|raw|result|winner|_id$|score|bracket/.test(k)))))
