// The four "Unknown" profiles (3 boys, 1 girls) stood in for bout sides the source didn't name, so each collected
// bouts from many different wrestlers (30+ schools) and was rated like one person. Kyle 2026-11-10: those sides get
// no profile (pages already show "Unknown"); the bouts stay. --apply unlinks the dual bouts (side and winner),
// drops the name links and the derived rating/leaderboard rows, recounts every reference and deletes each profile
// only at 0. Rebuild ratings afterwards.
//   npx tsx --tsconfig tsconfig.json scripts/remove_unknown_profiles_20261110.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const APPLY = process.argv.includes('--apply')
const BACKUP = 'docs/migrations/backups/20261110_unknown_profiles_before.json'
const U = ['c7523ed6-63bd-400a-9dd4-46a7363d4ef4', 'e78d6e95-2a1b-443f-bc2a-6f0b7e7336cf', '59494cf7-ba0c-4a45-a94c-77f24cbfd933', 'a2786492-e0c3-4e15-b3b6-6711b7c446c9']
const LINKS: [string, string][] = [
  ['dual_meet_matches', 'wrestler_a_id'], ['dual_meet_matches', 'wrestler_b_id'], ['dual_meet_matches', 'winner_id'],
  ['dual_meet_matches_girls', 'wrestler_a_id'], ['dual_meet_matches_girls', 'wrestler_b_id'], ['dual_meet_matches_girls', 'winner_id'],
]
const DROP: [string, string][] = [['wrestler_name_aliases', 'wrestler_id'], ['wrestler_hammer_scores', 'wrestler_id'], ['wrestler_match_score_log', 'wrestler_id'], ['wrestler_match_score_log', 'opponent_wrestler_id'], ['lb_rs_wrestler', 'wrestler_id'], ['lb_ps_wrestler', 'wrestler_id'], ['snapshot_streak_state', 'wrestler_id'], ['snapshot_streak_state_girls', 'wrestler_id']]
const OTHER: [string, string][] = [['tournament_bouts', 'wrestler1_id'], ['tournament_bouts', 'wrestler2_id'], ['tournament_bouts_girls', 'wrestler1_id'], ['tournament_bouts_girls', 'wrestler2_id'], ['tournament_entries', 'wrestler_id'], ['tournament_placements', 'wrestler_id'], ['in_season_tournament_seeds', 'wrestler_id'], ['in_season_tournament_seeds_girls', 'wrestler_id'], ['tournament_bracket_slots', 'top_wrestler_id'], ['tournament_bracket_slots', 'bottom_wrestler_id'], ['tournament_bracket_slots', 'winner_wrestler_id'], ['individual_rankings', 'wrestler_id'], ['individual_upsets', 'loser_id'], ['individual_upsets', 'winner_id'], ['pending_wrestler_transfers', 'wrestler_id'], ['roster_grade_import', 'wrestler_id'], ['wrestler_school_history', 'wrestler_id']]
const count = async (t: string, c: string) => { const { count, error } = await db.from(t).select('*', { count: 'exact', head: true }).in(c, U); if (error) throw new Error(`${t}.${c}: ${error.message}`); return count ?? 0 }
for (const [t, c] of [...LINKS, ...DROP, ...OTHER]) { const n = await count(t, c); if (n) console.log(`${t}.${c} ${n}`) }
if (!APPLY) process.exit(0)
if (fs.existsSync(BACKUP)) throw new Error(`${BACKUP} exists: already applied?`)
const backup: Record<string, unknown> = { wrestlers: chk(await db.from('wrestlers').select('*').in('id', U), 'w') }
for (const [t, c] of [...LINKS, ...DROP]) backup[`${t}.${c}`] = chk(await db.from(t).select('*').in(c, U).limit(10000), `${t}.${c}`)
fs.writeFileSync(BACKUP, JSON.stringify(backup))
for (const [t, c] of LINKS) chk(await db.from(t).update({ [c]: null }).in(c, U).select('id'), `unlink ${t}.${c}`)
for (const [t, c] of DROP) chk(await db.from(t).delete().in(c, U).select(t.startsWith('lb_') ? 'wrestler_id' : '*'), `drop ${t}.${c}`)
let left = 0; for (const [t, c] of [...LINKS, ...DROP, ...OTHER]) { const n = await count(t, c); if (n) { left += n; console.log(`still referenced: ${t}.${c} ${n}`) } }
const follows = chk(await db.from('users').select('id').overlaps('followed_wrestler_ids', U), 'users').length
if (left || follows) { console.log(`STOP: ${left} references, ${follows} follows left; profiles kept`); process.exit(1) }
console.log('deleted', chk(await db.from('wrestlers').delete().in('id', U).select('id'), 'delete').length, 'profiles')
