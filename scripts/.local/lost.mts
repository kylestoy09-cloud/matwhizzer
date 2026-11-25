import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SOT = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/sot.json', 'utf8'))
const ms = SOT.matches, es = SOT.entries, ps = SOT.placements
async function gone(ids: string[], table: string) { const have = new Set<string>(); for (let i = 0; i < ids.length; i += 100) { const r = await db.from(table).select('id').in('id', ids.slice(i, i + 100).filter(Boolean)); if (r.error) throw new Error(r.error.message); const d = r.data!; d.forEach((x: any) => have.add(x.id)) } return ids.filter(i => !have.has(i)) }
const gm = new Set(await gone(ms.map(m => m.match_id), 'matches'))
const ge = new Set(await gone(es.map(e => e.entry_id), 'tournament_entries'))
console.log(`3/21 export: ${ms.length} bouts, ${es.length} entries, ${ps.length} placements`)
console.log(`bouts gone now: ${gm.size} | entries gone now: ${ge.size}`)
const lost = ms.filter(m => gm.has(m.match_id))
const by: Record<string, number> = {}; for (const m of lost) { const k = `${m.gender} s${m.season_id} ${m.tournament_type}`; by[k] = (by[k] ?? 0) + 1 }
console.log('gone bouts by group:', JSON.stringify(by))
const viaEntry = lost.filter(m => ge.has(m.winner_entry_id) || ge.has(m.loser_entry_id))
console.log(`gone bouts whose entry is also gone: ${viaEntry.length}`)
const goneE = es.filter(e => ge.has(e.entry_id))
const byE: Record<string, number> = {}; for (const e of goneE) { const k = `${e.gender} s${e.season_id} ${e.tournament_type}`; byE[k] = (byE[k] ?? 0) + 1 }
console.log('gone entries by group:', JSON.stringify(byE))
fs.writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/lost.json', JSON.stringify({ lost, goneE }, null, 1))
for (const e of goneE.filter(e => e.gender === 'M').slice(0, 60)) { const n = lost.filter(m => m.winner_entry_id === e.entry_id || m.loser_entry_id === e.entry_id).length; console.log(`  ${e.tournament_name} ${e.season_id} ${e.weight}: ${e.first_name} ${e.last_name} (${e.school}) seed ${e.seed} — bouts gone ${n}`) }
