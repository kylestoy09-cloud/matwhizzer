import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rec = JSON.parse(fs.readFileSync('docs/migrations/backups/20261102_unlinked_bouts_resolved.json', 'utf8'))
const ar = rec.profiles_created.find((p: any) => p.last_name === 'Rodriguez')
const { data: kotc } = await db.from('tournament_bouts').select('wrestler1_id').eq('in_season_tournament_id', '70adba68-8cee-4665-ae0e-932f951ecbee').not('wrestler1_id', 'is', null).limit(1)
const { data: meet } = await db.from('dual_meets').select('id').eq('meet_date', '2026-02-21').in('team1_school_id', [376]).limit(1)
const { data: gr } = await db.from('schools').select('id').eq('display_name', 'Glen Rock').single()
const { data: m2 } = await db.from('dual_meets').select('id').eq('meet_date', '2026-02-21').eq('team1_school_id', gr!.id).limit(1)
const urls = [`/wrestler/${ar.id}`, `/wrestler/${kotc![0].wrestler1_id}`, `/wrestler/e6235560-0707-4776-8426-4c9acba73410`, m2?.[0] ? `/meets/${m2[0].id}` : null, '/tournaments/d046f392-9128-4755-8584-528ca5336281/bracket'].filter(Boolean) as string[]
const RAW = ['Northern Valley Regional (Old Tappan) HS', 'Eastside ( Paterson)', 'Westampton)', 'Sussex Central H S', 'Forfeit Forfeit', 'Red Lion Area Hs', 'TRINITY HS', 'W. Ratz', 'J. Appello', 'Spring Grove Area Hs', 'Great Valley Hs']
for (const u of urls) {
  const res = await fetch(`https://matwhizzer.com${u}`); const html = await res.text()
  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '\n')
  const lines = text.split('\n').map(x => x.trim()).filter(Boolean)
  console.log(`${res.status} ${u}: logos ${(html.match(/<img[^>]+(logo|supabase)[^>]*>/g) ?? []).length}, TBD ${lines.filter(l => l === 'TBD').length}, Unknown ${lines.filter(l => l === 'Unknown').length}, Forfeit ${lines.filter(l => l === 'Forfeit').length}, raw: ${RAW.filter(r => lines.some(l => l.includes(r))).join(', ') || 'none'}`)
  await new Promise(r => setTimeout(r, 4000))
}
