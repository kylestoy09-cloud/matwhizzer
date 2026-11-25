// 2026-11-11 — Kyle: the small "Tri"/"Quad" events that ran jamboree-style stay jamborees and are named
// "… Jamboree"; seven with 1 bout per pairing (2–4 bouts in all) go back to plain pairings, with no event.
//   npx tsx --tsconfig tsconfig.json scripts/jamboree_cleanup_20261111.mts [--apply]
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const RENAME: Record<string, string> = {
  'Cliffside Park Tri': 'Cliffside Park Jamboree',
  'Deptford / Clayton / Palmyra / Sterling Quad': 'Deptford / Clayton / Palmyra / Sterling Jamboree',
  'Scotch Plains-Fanwood Tri': 'Scotch Plains-Fanwood Jamboree',
  'Hightstown Tri': 'Hightstown Jamboree',
  'Verona Quad': 'Verona Jamboree',
  'Cherry Hill East Tri': 'Cherry Hill East Jamboree',
  'Delran Quad': 'Delran Jamboree',
  'Bridgewater-Raritan Quad': 'Bridgewater-Raritan Jamboree',
  'Pascack Hills Quad': 'Pascack Hills Jamboree',
  'Pemberton / Riverside / Hamilton West / Burlington City Quad': 'Pemberton / Riverside / Hamilton West / Burlington City Jamboree',
}
const UNDO = ['Metuchen Tri', 'Point Pleasant Beach Round Robin', 'Lakeland Tri', 'Immaculata Tri', 'Long Branch Quad', 'Seneca Tri',
  'New Providence / Montgomery / Glen Rock / Westfield Jamboree']
const PT_BEACH_REGISTRY = 'ef4e0f02-8ad5-40b2-8b93-3b0b7a68f1a1'   // from Kyle's schedule list: kept, unlinked

const { data: jams } = await db.from('jamborees_girls').select('*').eq('season', '2025-26')
const undo = (jams ?? []).filter(j => UNDO.includes(j.name))
const ren = (jams ?? []).filter(j => j.name in RENAME)
if (undo.length !== UNDO.length || ren.length !== Object.keys(RENAME).length) throw new Error(`found ${undo.length}/${UNDO.length} to undo, ${ren.length}/${Object.keys(RENAME).length} to rename`)
const { data: meets } = await db.from('dual_meets_girls').select('id, jamboree_id').in('jamboree_id', undo.map(j => j.id))
const { data: reg } = await db.from('tournament_registry').select('*').in('jamboree_id', [...undo, ...ren].map(j => j.id))
console.log('undo', undo.map(j => j.name), 'pairings', meets?.length, 'rename', ren.length, 'registry rows', reg?.length)
if (!APPLY) process.exit(0)

fs.writeFileSync('docs/migrations/backups/20261111_jamboree_cleanup.json', JSON.stringify({ jamborees: [...undo, ...ren], pairings: meets, registry: reg }, null, 1))
const ok = (r: { error: any }) => { if (r.error) throw r.error }
ok(await db.from('dual_meets_girls').update({ jamboree_id: null }).in('jamboree_id', undo.map(j => j.id)))
ok(await db.from('tournament_registry').update({ jamboree_id: null }).eq('id', PT_BEACH_REGISTRY))
ok(await db.from('tournament_registry').delete().in('jamboree_id', undo.map(j => j.id)))
ok(await db.from('jamborees_girls').delete().in('id', undo.map(j => j.id)))
for (const j of ren) {
  ok(await db.from('jamborees_girls').update({ name: RENAME[j.name] }).eq('id', j.id))
  ok(await db.from('tournament_registry').update({ name: RENAME[j.name] }).eq('jamboree_id', j.id))
}
const { count } = await db.from('jamborees_girls').select('*', { count: 'exact', head: true })
const { count: linked } = await db.from('dual_meets_girls').select('*', { count: 'exact', head: true }).not('jamboree_id', 'is', null)
console.log('applied: jamborees', count, 'linked pairings', linked)
