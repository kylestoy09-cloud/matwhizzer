import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SP = '/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/'
const events = JSON.parse(fs.readFileSync(SP+'jam_events.json','utf8'))
const which = process.argv[2]
const e = events.find((x:any)=>x.title===which)
const norm = (s:string)=>s.toLowerCase().replace(/[`'’.\-]/g,'').replace(/\s+/g,' ').trim()
let n=0
for (const line of e.bouts) {
  const m = line.match(/^(.+?) \(([^()]+)\) over (.+?) \(([^()]+)\)/)
  if (!m) { console.log('NOPARSE', line); continue }
  const { data } = await db.from('dual_meet_matches_girls').select('id').or(`wrestler_a_name_raw.ilike.%${m[1].split(' ').pop()!.replace(/[`',]/g,'%')}%,wrestler_b_name_raw.ilike.%${m[1].split(' ').pop()!.replace(/[`',]/g,'%')}%`).limit(1)
  void data
  n++
}
// print all lines (first 400 chars) of lines which look different
for (const line of e.bouts.slice(0, 400)) if (!/^[^()]+ \([^()]+\) over [^()]+ \([^()]+\) \(/.test(line)) console.log('ODD', line)
