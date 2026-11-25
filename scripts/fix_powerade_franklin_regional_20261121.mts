// Powerade 2025-26 (Kyle 2026-11-21, loading the full FloWrestling file): "Franklin Regional" — a Pennsylvania school —
// was taken as NJ Franklin (169): the school matcher drops "Regional", and the history import took that "exact" match
// as NJ (fixed: scripts/_literalNj.mts). Here its bouts, placements and name links go to Franklin (PA) (1199, where the
// earlier Powerade bouts were), and the profiles the run created for its wrestlers become out-of-state (is_oos). A
// profile that was already on file before the run is reported, not changed. Backup first. Dry run unless --apply.
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const T = '930fc38c-966e-43b7-928b-66328ae2513b', NJ = 169, PA = 1199, RUN = '2026-11-21T17:40:00Z'
const b1 = (await db.from('tournament_bouts').select('*').eq('in_season_tournament_id', T).eq('wrestler1_school_id', NJ).eq('wrestler1_school_raw', 'Franklin Regional')).data ?? []
const b2 = (await db.from('tournament_bouts').select('*').eq('in_season_tournament_id', T).eq('wrestler2_school_id', NJ).eq('wrestler2_school_raw', 'Franklin Regional')).data ?? []
const pl = (await db.from('tournament_placements').select('*').eq('in_season_tournament_id', T).eq('school_id', NJ).ilike('school_name_raw', 'Franklin Regional%')).data ?? []
const people = [...new Set([...b1.map(b => b.wrestler1_id), ...b2.map(b => b.wrestler2_id), ...pl.map(p => p.wrestler_id)].filter(Boolean))] as string[]
const { data: ws } = await db.from('wrestlers').select('id, first_name, last_name, is_oos, created_at').in('id', people)
const fresh = (ws ?? []).filter(w => w.created_at >= RUN), older = (ws ?? []).filter(w => w.created_at < RUN)
const names = [...new Set([...b1.map(b => b.wrestler1_name_raw), ...b2.map(b => b.wrestler2_name_raw)])]
const links = (await db.from('wrestler_name_aliases').select('*').eq('school_id', NJ).in('raw_name', names)).data ?? []
console.log({ bouts: b1.length + b2.length, placements: pl.length, profiles_from_run: fresh.length, profiles_already_on_file: older.map(w => `${w.first_name} ${w.last_name} (${w.id})`), name_links: links.length })
if (!APPLY) { console.log('dry run'); process.exit(0) }
writeFileSync('docs/migrations/backups/20261121_powerade_franklin_regional.json', JSON.stringify({ b1, b2, pl, ws, links }, null, 1))
const chk = (r: { error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message) }
for (const b of b1) chk(await db.from('tournament_bouts').update({ wrestler1_school_id: PA }).eq('id', b.id))
for (const b of b2) chk(await db.from('tournament_bouts').update({ wrestler2_school_id: PA }).eq('id', b.id))
for (const p of pl) chk(await db.from('tournament_placements').update({ school_id: PA }).eq('id', p.id))
for (const w of fresh) chk(await db.from('wrestlers').update({ is_oos: true }).eq('id', w.id))
for (const l of links) chk(await db.from('wrestler_name_aliases').update({ school_id: PA }).eq('id', l.id))
console.log('applied (backup docs/migrations/backups/20261121_powerade_franklin_regional.json)')
