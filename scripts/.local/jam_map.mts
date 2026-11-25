import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { fetchAllRows as fa } from '../../src/lib/fetchAllRows'
const all = async <T,>(f:any):Promise<T[]> => { const r = await fa<T>(f); if (r.error) throw new Error(r.error.message); return r.data }
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SP = '/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/'
const events = JSON.parse(fs.readFileSync(SP+'jam_events.json','utf8'))
const norm = (s:string)=>s.toLowerCase().replace(/[`'’.\-]/g,'').replace(/\s+/g,' ').trim()
const meets = await all<any>((f:number,t:number)=>db.from('dual_meets_girls').select('id, meet_date, meet_kind, team1_school_id, team2_school_id').gte('meet_date','2025-11-01').lte('meet_date','2026-03-31').order('id').range(f,t))
const mById = new Map(meets.map(m=>[m.id,m]))
const ids = meets.map(m=>m.id); const bouts:any[]=[]
for (let i=0;i<ids.length;i+=150) bouts.push(...await all<any>((f:number,t:number)=>db.from('dual_meet_matches_girls').select('id,dual_meet_id,wrestler_a_name_raw,wrestler_b_name_raw').in('dual_meet_id',ids.slice(i,i+150)).order('id').range(f,t)))
const idx = new Map<string, any[]>()
for (const b of bouts) { const k=[norm(b.wrestler_a_name_raw??''),norm(b.wrestler_b_name_raw??'')].sort().join('|'); (idx.get(k) ?? idx.set(k,[]).get(k)!).push(b) }
const res:any[] = []
const meetEvent = new Map<string, Record<string,number>>()
for (const e of events) {
  const kinds: Record<string,number> = {}; const dates: Record<string,number> = {}; let hit=0
  const ms = new Set<string>()
  const miss: string[] = []
  for (const line of e.bouts) {
    const p = JSON.parse(line); const m = [null, p[0], p[1], p[2], p[3]]
    const k=[norm(m[1]),norm(m[3])].sort().join('|')
    const cands = idx.get(k) ?? []
    if (!cands.length) { miss.push(line); continue }
    hit++
    for (const c of cands) { const mt = mById.get(c.dual_meet_id); ms.add(mt.id); kinds[mt.meet_kind]=(kinds[mt.meet_kind]??0)+1; dates[mt.meet_date]=(dates[mt.meet_date]??0)+1
      const me = meetEvent.get(mt.id) ?? meetEvent.set(mt.id,{}).get(mt.id)!; me[e.title]=(me[e.title]??0)+1 }
  }
  res.push({ ...e, hit, kinds, dates, meets: [...ms], miss })
  console.log(`${e.title}\t${e.bouts.length}\thit ${hit}\t${JSON.stringify(kinds)}\t${JSON.stringify(dates)}\tmeets ${ms.size}`)
}
fs.writeFileSync(SP+'jam_map.json', JSON.stringify({ res, meetEvent: Object.fromEntries(meetEvent) }))
// jamboree meets not tied to any event
const jm = meets.filter(m=>m.meet_kind==='jamboree')
const un = jm.filter(m=>!meetEvent.has(m.id)); console.log('jamboree meets', jm.length, 'unmapped', un.length, un.map(m=>m.meet_date).join(','))
const multi = jm.filter(m=>Object.keys(meetEvent.get(m.id)??{}).length>1); console.log('jamboree meets in >1 event', multi.length, multi.map(m=>JSON.stringify(meetEvent.get(m.id))).join('\n'))
