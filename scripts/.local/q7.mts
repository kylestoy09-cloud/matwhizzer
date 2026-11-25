import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SP = '/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/'
const rep = JSON.parse(fs.readFileSync(SP+'other_report.json','utf8'))
const meetIds = rep.events.flatMap((e:any)=>e.pairings.filter((p:any)=>p.existing).map((p:any)=>p.existing.id))
const cnt = new Map<string,number>()
for (let i=0;i<meetIds.length;i+=100) {
  const { data } = await db.from('dual_meet_matches_girls').select('dual_meet_id').in('dual_meet_id', meetIds.slice(i,i+100)).limit(5000)
  for (const r of data??[]) cnt.set(r.dual_meet_id,(cnt.get(r.dual_meet_id)??0)+1)
}
const owner = new Map<string,string[]>()
let tp=0, td=0
for (const e of rep.events) {
  let parsed=0, stored=0; const kinds:Record<string,number>={}; const schools=new Set<string>()
  for (const p of e.pairings) { parsed+=p.bouts.length; schools.add(p.team1.name); schools.add(p.team2.name)
    if (p.existing) { stored+=cnt.get(p.existing.id)??0; kinds[p.existing.kind]=(kinds[p.existing.kind]??0)+1; (owner.get(p.existing.id) ?? owner.set(p.existing.id,[]).get(p.existing.id)!).push(e.name) } }
  tp+=parsed; td+=stored
  console.log(`${e.date}\t${e.name}\tteams ${schools.size}\tpairings ${e.pairings.length}\tparsed ${parsed}\tstored ${stored}\t${JSON.stringify(kinds)}`)
}
console.log('total parsed', tp, 'stored', td)
console.log('meets claimed by >1 event', [...owner.entries()].filter(([,v])=>v.length>1).map(([k,v])=>k+' '+v.join(' + ')))
