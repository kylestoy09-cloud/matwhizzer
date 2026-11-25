// Second half of scripts/fix_powerade_franklin_regional_20261121.mts (which stopped on a name-link clash after moving
// the bouts, the placement and the profiles' is_oos; its rerun then overwrote that first backup with an empty one).
// Three Franklin Regional wrestlers already had out-of-state profiles at Franklin (PA) from the first Powerade import
// (Max Firestine, John Montgomery, Titus Colangelo); the history run made a second one for each while the team sat at
// NJ Franklin. Their bouts and placements go to the profiles already on file; the other Franklin Regional name links at
// NJ Franklin move to Franklin (PA), the three doubles' links are removed. Backup first. Dry run unless --apply.
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const T = '930fc38c-966e-43b7-928b-66328ae2513b', NJ = 169, PA = 1199
const b1 = (await db.from('tournament_bouts').select('id, wrestler1_id, wrestler1_name_raw').eq('in_season_tournament_id', T).eq('wrestler1_school_raw', 'Franklin Regional')).data ?? []
const b2 = (await db.from('tournament_bouts').select('id, wrestler2_id, wrestler2_name_raw').eq('in_season_tournament_id', T).eq('wrestler2_school_raw', 'Franklin Regional')).data ?? []
const names = [...new Set([...b1.map(b => b.wrestler1_name_raw), ...b2.map(b => b.wrestler2_name_raw)])]
const { data: links } = await db.from('wrestler_name_aliases').select('*').in('raw_name', names).in('school_id', [NJ, PA])
const atPA = new Map((links ?? []).filter(l => l.school_id === PA).map(l => [l.raw_name, l.wrestler_id]))
const atNJ = (links ?? []).filter(l => l.school_id === NJ)
const merge = atNJ.filter(l => atPA.has(l.raw_name) && atPA.get(l.raw_name) !== l.wrestler_id).map(l => ({ name: l.raw_name, from: l.wrestler_id as string, to: atPA.get(l.raw_name) as string, link: l.id }))
const move = atNJ.filter(l => !atPA.has(l.raw_name))
const fromIds = merge.map(m => m.from)
const bA = (await db.from('tournament_bouts').select('id, wrestler1_id, wrestler2_id').or(`wrestler1_id.in.(${fromIds.join(',')}),wrestler2_id.in.(${fromIds.join(',')})`)).data ?? []
const pA = (await db.from('tournament_placements').select('id, wrestler_id').in('wrestler_id', fromIds)).data ?? []
console.log({ merge: merge.map(m => m.name), bouts_to_repoint: bA.length, placements_to_repoint: pA.length, links_to_move: move.map(l => l.raw_name) })
if (!APPLY) { console.log('dry run'); process.exit(0) }
writeFileSync('docs/migrations/backups/20261121_powerade_franklin_regional_b.json', JSON.stringify({ merge, move, bA, pA, links }, null, 1))
const chk = (r: { error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message) }
const to = new Map(merge.map(m => [m.from, m.to]))
for (const b of bA) chk(await db.from('tournament_bouts').update({ wrestler1_id: to.get(b.wrestler1_id) ?? b.wrestler1_id, wrestler2_id: to.get(b.wrestler2_id) ?? b.wrestler2_id }).eq('id', b.id))
for (const p of pA) chk(await db.from('tournament_placements').update({ wrestler_id: to.get(p.wrestler_id) }).eq('id', p.id))
for (const m of merge) chk(await db.from('wrestler_name_aliases').delete().eq('id', m.link))
for (const l of move) chk(await db.from('wrestler_name_aliases').update({ school_id: PA }).eq('id', l.id))
console.log('applied (backup docs/migrations/backups/20261121_powerade_franklin_regional_b.json); profiles left with no records:', fromIds.join(', '))
