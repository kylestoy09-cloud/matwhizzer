import fs from 'fs'
import { parseRtfText, normalizeRound } from '../../src/lib/parseRtf'
const SP = '/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/'
const MAP: Record<string,string> = { '121':'120','128':'126','135':'132','143':'145','151':'152','161':'165','180':'185' }
const lines = fs.readFileSync(SP+'feb_tourn.txt','utf8').split('\n')
const out = lines.map((l, i) => {
  if (i < 1014 || i > 1658) return l
  const t = l.replace(/ /g,' ').trim()
  if (/^\d{3}$/.test(t) && MAP[t]) return MAP[t]
  return l.replace(/^(\s*)Varsity - /, '$1')
})
const cal = parseRtfText(out.join('\n'), 'Cape Atlantic')[0]
const c = (a: any[], f: (x:any)=>string) => a.reduce((m,x)=>(m[f(x)]=(m[f(x)]??0)+1,m),{} as Record<string,number>)
console.log(cal.bouts.length, c(cal.bouts, b=>String(b.weight_class)), c(cal.bouts, b=>normalizeRound(b.round)))
for (const b of cal.bouts.filter(b=>[100,132,145].includes(b.weight_class))) console.log(b.weight_class, normalizeRound(b.round), b.round, b.wrestler1_name, '|', b.wrestler2_name, b.result_type, b.result_detail)
console.log(cal.placements.map(p=>`${p.weight_class} ${p.place} ${p.wrestler_name}`).join('\n'))
