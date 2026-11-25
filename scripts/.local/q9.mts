import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SP = '/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/'
const rep = JSON.parse(fs.readFileSync(SP+'other_report2.json','utf8'))
const fixes:any[] = []; let checked=0, nf=0
for (const e of rep.events) for (const p of e.pairings) {
  if (!p.existing) continue
  const { data } = await db.from('dual_meet_matches_girls').select('id, weight_class, winner_id, wrestler_a_id, wrestler_b_id, wrestler_a_name_raw, wrestler_b_name_raw, result_detail, is_double_forfeit').eq('dual_meet_id', p.existing.id)
  const used = new Set<string>()
  for (const b of p.bouts) {
    checked++
    const names = [b.winnerName, b.loserName].filter(Boolean).map((s:string)=>s.toLowerCase())
    const hit = (data??[]).find(r => !used.has(r.id) && names.every(n => [r.wrestler_a_name_raw, r.wrestler_b_name_raw].map(x=>(x??'').toLowerCase()).includes(n)) && (r.weight_class===b.weightClass || true))
    if (!hit) { nf++; continue }
    used.add(hit.id)
    if (hit.weight_class !== b.weightClass) fixes.push({ event: e.name, date: e.date, id: hit.id, stored: hit.weight_class, parsed: b.weightClass, w: b.winnerName, l: b.loserName })
  }
}
console.log('checked', checked, 'not found', nf, 'weight differs', fixes.length)
const by: Record<string,number> = {}; for (const f of fixes) by[f.event]=(by[f.event]??0)+1; console.log(by)
console.log(fixes.slice(0,8))
fs.writeFileSync(SP+'weight_fixes.json', JSON.stringify(fixes,null,1))
