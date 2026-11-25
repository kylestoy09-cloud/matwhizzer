import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: sch } = await db.from('schools').select('id, display_name'); const nm = new Map(sch!.map(s=>[s.id,s.display_name]))
const { data: c, error } = await db.from('school_coops').select('*'); console.log(error?.message, c?.length, Object.keys(c?.[0]??{}))
const pairs: [string,string][] = [['Cherry Hill East','Cherry Hill West'],['Burlington Township','Lenape'],['St. Joseph Metuchen','Sayreville War Memorial'],['Jefferson','Sparta'],['Ramsey','Northern Highlands'],['St Joseph (Montvale) HS','West Essex'],['Cinnaminson','Holy Cross'],['Christian Brothers','Brick Memorial']]
const id = (n:string)=>sch!.find(s=>s.display_name===n)?.id
for (const [a,b] of pairs) { const ia=id(a), ib=id(b); console.log(a,ia,b,ib, JSON.stringify((c??[]).filter((r:any)=>Object.values(r).includes(ia)||Object.values(r).includes(ib)))) }
const { data: ssn } = await db.from('school_season_names').select('*').in('school_id', pairs.flat().map(id).filter(Boolean) as number[]); console.log(ssn)
