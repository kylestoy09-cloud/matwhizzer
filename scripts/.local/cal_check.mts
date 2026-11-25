import fs from 'fs'
import { parseRtfText, normalizeRound, boutResultToDb } from '../../src/lib/parseRtf'
import { matchSchoolNames } from '../../src/lib/matchSchools'
import { matchWrestler, reloadAliases } from '../../src/lib/matchWrestlers'
const SP = '/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/'
const cal = parseRtfText(fs.readFileSync(SP+'feb_tourn.txt','utf8'), 'Cape Atlantic')[0]
const c = (a: any[], f: (x:any)=>string) => a.reduce((m,x)=>(m[f(x)]=(m[f(x)]??0)+1,m),{} as Record<string,number>)
console.log(cal.name, cal.bouts.length, c(cal.bouts, b=>String(b.weight_class)), c(cal.bouts, b=>normalizeRound(b.round)), c(cal.bouts,b=>b.result_type))
console.log(cal.placements)
await reloadAliases()
const sm = new Map<string, any>()
for (const b of cal.bouts) for (const s of [b.wrestler1_school, b.wrestler2_school]) if (!sm.has(s)) sm.set(s, await matchSchoolNames(s, { gender: 'F', seasonId: 2026 }))
for (const [k,v] of sm) console.log('school', k, '→', v.schoolId, v.displayName, v.confidence)
const seen = new Set<string>()
for (const b of cal.bouts) for (const [n,s] of [[b.wrestler1_name,b.wrestler1_school],[b.wrestler2_name,b.wrestler2_school]]) {
  const k = n+'|'+s; if (seen.has(k)) continue; seen.add(k)
  const r = await matchWrestler(n, sm.get(s).schoolId, b.weight_class, 'F')
  if (r.confidence !== 'exact' && r.confidence !== 'high') console.log('wrestler', n, s, r.confidence, r.displayName, r.wrestlerId)
}
console.log('unique wrestlers', seen.size)
