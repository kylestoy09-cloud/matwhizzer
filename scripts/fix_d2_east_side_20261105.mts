// Girls District 2 2025-26 "East Side" was Paterson Eastside (72), not Newark East Side (122)
// (2026-11-05, approved by Kyle). Paterson Eastside is the District 2 school (Newark East Side is
// District 4); Ashley Coronel's 16 regular-season bouts are for Paterson Eastside. The import
// matched the sheet's "East Side" by the school alias "East Side" → 122, which is right for
// Newark's own results (9 girls duals vs Essex schools), so the alias stays.
// Moves: the 2 District 2 entries (Ashley Coronel, Kassandra Lucero) and the District 2 team total.
//   npx tsx --tsconfig tsconfig.json scripts/fix_d2_east_side_20261105.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const t = chk(await db.from('tournaments').select('id').eq('gender', 'F').eq('season_id', 2026).eq('name', 'Girl_s Districts District 2'), 't')[0].id
const entries = chk(await db.from('tournament_entries').select('*').eq('tournament_id', t).eq('school_id', 122), 'e')
const team = chk(await db.from('precomputed_team_scores').select('*').eq('tournament_id', t).eq('school_id', 122), 'p')
const already = chk(await db.from('precomputed_team_scores').select('id').eq('tournament_id', t).eq('school_id', 72), 'p72')
if (entries.length !== 2 || entries.some(e => e.school_context_raw !== 'East Side') || team.length !== 1 || already.length) throw new Error('not as expected')
console.log(`entries ${entries.length}, team row ${team.length} (${team[0].total_points} pts)`)
if (!process.argv.includes('--apply')) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261105_d2_east_side_before.json', JSON.stringify({ entries, team }, null, 1))
chk(await db.from('tournament_entries').update({ school_id: 72 }).in('id', entries.map(e => e.id)).select('id'), 'entries')
chk(await db.from('precomputed_team_scores').update({ school_id: 72, school_name: 'Paterson Eastside' }).eq('id', team[0].id).select('id'), 'team')
console.log('APPLIED')
