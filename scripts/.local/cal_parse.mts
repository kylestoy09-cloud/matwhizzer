import fs from 'fs'
import { parseRtfText, normalizeRound } from '../../src/lib/parseRtf'
const SP = '/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/'
const text = fs.readFileSync(SP+'feb_tourn.txt','utf8')
const parsed = parseRtfText(text)
for (const t of parsed) console.log(t.name, '|', t.date_raw, '| bouts', t.bouts.length, 'pl', t.placements.length, 'ts', t.team_scores.length, t.source_format)
const cal = parsed.find(t => /cape atlantic/i.test(t.name))!
const rounds: Record<string,number> = {}; const wts: Record<string,number> = {}; const schools: Record<string,number> = {}; const rt: Record<string,number>={}
for (const b of cal.bouts) { rounds[normalizeRound(b.round)]=(rounds[normalizeRound(b.round)]??0)+1; wts[b.weight_class]=(wts[b.weight_class]??0)+1; for (const s of [b.wrestler1_school,b.wrestler2_school]) schools[s]=(schools[s]??0)+1; rt[b.result_type]=(rt[b.result_type]??0)+1 }
console.log(rounds, wts, schools, rt)
console.log(cal.placements.slice(0,5), cal.bouts.slice(0,3))
