import fs from 'fs'
import { parseRtfText } from '../../src/lib/parseRtf'
const SP = '/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/tourn_txt/'
const out: string[] = []
for (const f of fs.readdirSync(SP).sort()) for (const t of parseRtfText(fs.readFileSync(SP+f,'utf8'))) out.push(`${f}\t${t.name}\t${t.date_raw}\t${t.bouts.length}\t${t.placements.length}\t${t.team_scores.length}\t${t.venue_name ?? ''}\t${t.venue_address ?? ''}`)
fs.writeFileSync(process.argv[2], out.join('\n')+'\n'); console.log(out.length)
