import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('tournament_registry').select('*').limit(2000)
console.log(data?.length, Object.keys(data?.[0]??{}).join(','))
const c: Record<string,number> = {}
for (const r of data??[]) { const k=`${r.gender}|${r.season_id ?? r.season}|${r.event_type}|linked=${!!(r.tournament_id ?? r.in_season_tournament_id)}`; c[k]=(c[k]??0)+1 }
console.log(c)
for (const r of (data??[]).filter((r:any)=>r.event_type==='jamboree')) console.log(JSON.stringify(r))
const { data: dm } = await db.from('dual_meets_girls').select('*').eq('meet_kind','jamboree').limit(1)
console.log(Object.keys(dm?.[0]??{}).join(','))
const { data: dmb } = await db.from('dual_meets').select('*').limit(1)
console.log(Object.keys(dmb?.[0]??{}).join(','))
