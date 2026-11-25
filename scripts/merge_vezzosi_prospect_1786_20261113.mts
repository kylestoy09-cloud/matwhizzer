// Joseph Vezzosi's third hub prospect (Kyle 2026-11-13: merge Joseph's profiles): "J. Mako Vezzosi" (1786, class of
// 2027, 120, unlinked) — his name as an initial plus nickname at a 4th event (event 4); his linked prospect (6367)
// has events 2, 5 and 8, none in common. Its 1 placement and 3 bouts move to 6367, then the emptied prospect goes.
//   npx tsx --tsconfig tsconfig.json scripts/merge_vezzosi_prospect_1786_20261113.mts [--apply]
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const FROM = 1786, INTO = 6367
const ev = (id: number) => db.from('boys_hub_placements').select('event_id').eq('prospect_id', id)
const both = [new Set(chk(await ev(FROM), 'a').map(x => x.event_id)), new Set(chk(await ev(INTO), 'b').map(x => x.event_id))]
const common = [...both[0]].filter(x => both[1].has(x))
const ev4 = chk(await db.from('boys_hub_events').select('id, season, boys_hub_tournaments(name)').eq('id', 4), 'e')[0]
console.log('event 4:', JSON.stringify(ev4), '| events in common:', common)
if (common.length) throw new Error('both prospects at the same event: not one wrestler')
if (!process.argv.includes('--apply')) process.exit(0)
const BACKUP = 'docs/migrations/backups/20261113_vezzosi_prospect_1786.json'
fs.writeFileSync(BACKUP, JSON.stringify({
  prospect: chk(await db.from('boys_prospects').select('*').eq('id', FROM), 'p'),
  placements: chk(await db.from('boys_hub_placements').select('*').eq('prospect_id', FROM), 'pl'),
  bouts: chk(await db.from('boys_hub_bouts').select('*').or(`winner_prospect_id.eq.${FROM},loser_prospect_id.eq.${FROM}`), 'b'),
}, null, 1))
chk(await db.from('boys_hub_placements').update({ prospect_id: INTO }).eq('prospect_id', FROM).select('id'), 'placements')
chk(await db.from('boys_hub_bouts').update({ winner_prospect_id: INTO }).eq('winner_prospect_id', FROM).select('id'), 'wins')
chk(await db.from('boys_hub_bouts').update({ loser_prospect_id: INTO }).eq('loser_prospect_id', FROM).select('id'), 'losses')
const left = chk(await db.from('boys_hub_placements').select('id').eq('prospect_id', FROM), 'l').length + chk(await db.from('boys_hub_bouts').select('id').or(`winner_prospect_id.eq.${FROM},loser_prospect_id.eq.${FROM}`), 'l2').length
if (left) { console.log('STOP:', left, 'records left'); process.exit(1) }
const r = await db.from('boys_prospects').delete().eq('id', FROM).select('id')
console.log(r.error ? `STOP: ${r.error.message}` : `moved 1 placement + 3 bouts; deleted prospect ${FROM}`)
