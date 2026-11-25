import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const WCW: Record<number, number> = {53:106,54:113,55:120,56:126,57:132,58:138,59:144,60:150,61:157,62:165,63:175,64:190,65:215,66:285}
const RND: Record<string, string> = { 'Champ. Round 1': 'R2', Quarterfinal: 'QF', Semifinal: 'SF', '1st Place Match': 'F', '3rd Place Match': '3rd_Place' }
const n = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '')
// every forfeit line in the TrackWrestling text, by weight|round|winner
const tw = new Map<string, { loser: string; loserSchool: string; line: string }>()
let w = 0
for (const raw of fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/dmd2026.txt', 'utf8').split('\n')) {
  const l = raw.trim(); if (/^\d{3}$/.test(l)) { w = Number(l); continue }
  const m = l.match(/^(Champ\. Round 1|Quarterfinal|Semifinal|1st Place Match|3rd Place Match) - (.+?) \(([^)]*(?:\([^)]*\)[^)]*)*)\) [\d-]+ won by (?:medical )?forfeit over (\(\)|.*?) \(([^)]*)\)/)
  if (m) tw.set(`${w}|${RND[m[1]]}|${n(m[2])}`, { loser: m[4].trim(), loserSchool: m[5].trim(), line: l })
}
const tours = (await db.from('tournaments').select('id, name').eq('gender', 'M').eq('season_id', 2026).eq('tournament_type', 'districts')).data!
const out: Record<string, number> = {}; const real: string[] = []; const nf: string[] = []
const ov: Record<string, { loser?: string; empty?: boolean }> = {}
for (const t of tours as any[]) {
  const ms = (await db.from('matches').select('id, round, weight_class_id, win_type, winner_entry_id, w:winner_entry_id(wrestlers(first_name,last_name))').eq('tournament_id', t.id).is('loser_entry_id', null)).data as any[]
  for (const m of ms) {
    const k = `${WCW[m.weight_class_id]}|${m.round}|${n(`${m.w?.wrestlers?.first_name}${m.w?.wrestlers?.last_name}`)}`
    const x = tw.get(k)
    // empty slot: "over () (For.)"; filler: an entry with no school ("Forfeit ()", "Tom Brands ()"); real: has a school
    const cat = !x ? 'not found in file' : (x.loser === '' || x.loser === '()') ? 'empty slot' : (x.loserSchool === '' || /forfeit/i.test(x.loser)) ? 'filler entry' : 'REAL wrestler'
    out[`${m.round} ${cat}`] = (out[`${m.round} ${cat}`] ?? 0) + 1
    if (cat === 'empty slot') ov[m.id] = { empty: true }
    if (cat === 'REAL wrestler') {
      const be = (await db.from('tournament_entries').select('id, wrestlers(first_name,last_name)').eq('tournament_id', t.id).eq('weight_class_id', m.weight_class_id)).data as any[]
      const hit = be.filter(e => n(`${e.wrestlers.first_name}${e.wrestlers.last_name}`) === n(x!.loser))
      real.push(`${t.name.replace('Boy_s Districts ', '')} ${WCW[m.weight_class_id]} ${m.round}: ${x!.loser} (${x!.loserSchool}) — entry in bracket: ${hit.length ? hit.map(h => h.id.slice(0, 8)).join(',') : 'NONE'}`)
      if (hit.length === 1) ov[m.id] = { loser: hit[0].id }
    }
    if (cat === 'not found in file' && nf.length < 6) nf.push(`${t.name} ${WCW[m.weight_class_id]} ${m.round} winner ${m.w?.wrestlers?.first_name} ${m.w?.wrestlers?.last_name}`)
  }
}
console.log(JSON.stringify(out, null, 1)); console.log('REAL losers:\n' + real.join('\n')); console.log('not found:\n' + nf.join('\n'))
fs.writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/ff_lines.json', JSON.stringify([...tw.entries()]))

fs.writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/forfeit_overrides.json', JSON.stringify(ov))
console.log('overrides', Object.keys(ov).length)
