// Powerade 2025-26 (Kyle 2026-11-21): "St. Francis-NY" was filed under St. Francis (CA) — the history import took a
// state-tagged team's same-name school on file without checking its state (fixed in the importer and dry run). Its
// bouts, placements, seeds and name links go to a new St. Francis (NY). Backup first. Dry run unless --apply.
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { createOosSchool } from '../src/lib/oosSchool'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const T = '930fc38c-966e-43b7-928b-66328ae2513b', CA = 569, RAW = 'St. Francis-NY'
const b1 = (await db.from('tournament_bouts').select('*').eq('in_season_tournament_id', T).eq('wrestler1_school_id', CA).eq('wrestler1_school_raw', RAW)).data ?? []
const b2 = (await db.from('tournament_bouts').select('*').eq('in_season_tournament_id', T).eq('wrestler2_school_id', CA).eq('wrestler2_school_raw', RAW)).data ?? []
const pl = (await db.from('tournament_placements').select('*').eq('in_season_tournament_id', T).eq('school_id', CA)).data ?? []
const sd = (await db.from('in_season_tournament_seeds').select('*').eq('in_season_tournament_id', T).eq('school_id', CA)).data ?? []
const names = [...new Set([...b1.map(b => b.wrestler1_name_raw), ...b2.map(b => b.wrestler2_name_raw)])]
const links = (await db.from('wrestler_name_aliases').select('*').eq('school_id', CA).in('raw_name', names)).data ?? []
console.log({ bouts: b1.length + b2.length, placements: pl.length, seeds: sd.length, name_links: links.length })
if (!APPLY) { console.log('dry run'); process.exit(0) }
writeFileSync('docs/migrations/backups/20261121_powerade_st_francis_ny.json', JSON.stringify({ b1, b2, pl, sd, links }, null, 1))
const ny = await createOosSchool(db as never, 'St. Francis', 'NY')
const chk = (r: { error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message) }
for (const b of b1) chk(await db.from('tournament_bouts').update({ wrestler1_school_id: ny.id }).eq('id', b.id))
for (const b of b2) chk(await db.from('tournament_bouts').update({ wrestler2_school_id: ny.id }).eq('id', b.id))
for (const p of pl) chk(await db.from('tournament_placements').update({ school_id: ny.id }).eq('id', p.id))
for (const x of sd) chk(await db.from('in_season_tournament_seeds').update({ school_id: ny.id }).eq('id', x.id))
for (const l of links) chk(await db.from('wrestler_name_aliases').update({ school_id: ny.id }).eq('id', l.id))
console.log(`applied: St. Francis (NY) #${ny.id} (backup docs/migrations/backups/20261121_powerade_st_francis_ny.json)`)
