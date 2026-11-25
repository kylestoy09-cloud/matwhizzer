import { createClient } from '@supabase/supabase-js'
import { fetchAllRows as fa } from '../../src/lib/fetchAllRows'
const fetchAllRows = async <T,>(f:any):Promise<T[]> => { const r = await fa<T>(f); if (r.error) throw new Error(r.error.message); return r.data }
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const meets = await fetchAllRows<any>((f,t)=>db.from('dual_meets_girls').select('id, meet_date').eq('meet_kind','jamboree').order('id').range(f,t))
const mDate = new Map(meets.map(m=>[m.id,m.meet_date]))
const ids = meets.map(m=>m.id)
const bouts:any[] = []
for (let i=0;i<ids.length;i+=200) bouts.push(...await fetchAllRows<any>((f,t)=>db.from('dual_meet_matches_girls').select('id,dual_meet_id, wrestler_a_id, wrestler_b_id, weight_class').in('dual_meet_id', ids.slice(i,i+200)).order('id').range(f,t)))
const tours = await fetchAllRows<any>((f,t)=>db.from('in_season_tournaments_girls').select('id,name,start_date,end_date').order('id').range(f,t))
const tb = await fetchAllRows<any>((f,t)=>db.from('tournament_bouts_girls').select('id,in_season_tournament_id, wrestler1_id, wrestler2_id').order('id').range(f,t))
const tName = new Map(tours.map(t=>[t.id, `${t.name} ${t.start_date}`]))
const key = (a:number,b:number)=>[a,b].sort((x,y)=>x-y).join('-')
const tIdx = new Map<string,Set<string>>()
for (const b of tb) if (b.wrestler1_id&&b.wrestler2_id) { const k=key(b.wrestler1_id,b.wrestler2_id); (tIdx.get(k) ?? tIdx.set(k,new Set()).get(k)!).add(b.in_season_tournament_id) }
const perDate: Record<string,{bouts:number, dup:number, tours:Record<string,number>}> = {}
for (const b of bouts) {
  const d = mDate.get(b.dual_meet_id)!; const r = perDate[d] ??= {bouts:0,dup:0,tours:{}}; r.bouts++
  if (b.wrestler_a_id && b.wrestler_b_id) { const ts = tIdx.get(key(b.wrestler_a_id,b.wrestler_b_id)); if (ts) { r.dup++; for (const t of ts) r.tours[tName.get(t)!]=(r.tours[tName.get(t)!]??0)+1 } }
}
for (const [d,r] of Object.entries(perDate).sort()) console.log(d, 'bouts', r.bouts, 'same pair in a tournament', r.dup, JSON.stringify(r.tours))
