// One wrestler on two profiles, by Kyle's call: every reference to the dropped profile moves to the kept one (the list
// from scripts/merge_duplicate_profiles.mts plus tables added since: history finishes, college entries, Whiz Rank
// notices, offseason board); derived rating / streak rows of the dropped profile are removed (the next rating run
// rebuilds them). The dropped profile is emptied and marked inactive, not deleted (the delete guard). Backup first.
// Run: npx tsx scripts/merge_wrestler_profiles.mts <keep id> <drop id> [--first=Joseph] [--why="Kyle: …"]
// (First used 2026-11-17: Joey Zargo → Joseph Zargo, scripts/merge_zargo_20261117.mts; Scott Garren.)
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const [KEEP, DROP] = process.argv.slice(2).filter(a => !a.startsWith('--'))
const rename = process.argv.find(a => a.startsWith('--first='))?.slice(8)
const why = process.argv.find(a => a.startsWith('--why='))?.slice(6) ?? ''
if (!KEEP || !DROP || KEEP === DROP) throw new Error('usage: merge_wrestler_profiles.mts <keep id> <drop id> [--first=Name] [--why=text]')
const { data: pair } = await db.from('wrestlers').select('id, gender').in('id', [KEEP, DROP])
if ((pair ?? []).length !== 2 || pair![0].gender !== pair![1].gender) throw new Error('both profiles must exist, same gender')
const REFS: [string, string][] = [
  ['bracket_picks', 'pick_1st'], ['bracket_picks', 'pick_2nd'], ['bracket_picks', 'pick_3rd'], ['bracket_picks', 'pick_4th'],
  ['dual_meet_matches', 'winner_id'], ['dual_meet_matches', 'wrestler_a_id'], ['dual_meet_matches', 'wrestler_b_id'],
  ['dual_meet_matches_girls', 'winner_id'], ['dual_meet_matches_girls', 'wrestler_a_id'], ['dual_meet_matches_girls', 'wrestler_b_id'],
  ['boys_prospects', 'wrestler_id'], ['girls_prospects', 'wrestler_id'], ['mixed_prospects', 'wrestler_id'], ['in_season_tournament_seeds', 'wrestler_id'], ['in_season_tournament_seeds_girls', 'wrestler_id'],
  ['individual_rankings', 'wrestler_id'], ['individual_upsets', 'loser_id'], ['individual_upsets', 'winner_id'],
  ['boys_transfers', 'wrestler_id'], ['girls_transfers', 'wrestler_id'], ['roster_grade_import', 'wrestler_id'],
  ['tournament_bouts', 'wrestler1_id'], ['tournament_bouts', 'wrestler2_id'], ['tournament_bouts_girls', 'wrestler1_id'], ['tournament_bouts_girls', 'wrestler2_id'],
  ['tournament_bracket_slots', 'bottom_wrestler_id'], ['tournament_bracket_slots', 'top_wrestler_id'], ['tournament_bracket_slots', 'winner_wrestler_id'],
  ['tournament_entries', 'wrestler_id'], ['tournament_placements', 'wrestler_id'], ['wrestler_name_aliases', 'wrestler_id'], ['wrestler_school_history', 'wrestler_id'],
  // added since 2026-11-02
  ['history_finishes', 'wrestler_id'], ['boys_college_entries', 'wrestler_id'], ['girls_college_entries', 'wrestler_id'], ['whiz_rank_notices', 'wrestler_id'], ['offseason_board_order', 'wrestler_id'],
]
const DERIVED: [string, string][] = [['wrestler_hammer_scores', 'wrestler_id'], ['wrestler_match_score_log', 'wrestler_id'], ['snapshot_streak_state', 'wrestler_id'], ['snapshot_streak_state_girls', 'wrestler_id'], ['wrestler_rating_carry', 'wrestler_id']]
const backup: Record<string, unknown[]> = {}
backup.wrestlers = (await db.from('wrestlers').select('*').in('id', [KEEP, DROP])).data ?? []
for (const [t, c] of [...REFS, ...DERIVED]) { const r = await db.from(t).select('*').eq(c, DROP); if (r.error) { console.log('skip', t, c, r.error.message); continue } if (r.data?.length) backup[`${t}.${c}`] = r.data }
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const file = `docs/migrations/backups/${stamp}_merge_${DROP.slice(0, 8)}_into_${KEEP.slice(0, 8)}.json`
writeFileSync(file, JSON.stringify({ why, keep: KEEP, drop: DROP, ...backup }, null, 1))
const moved: Record<string, number> = {}
for (const [t, c] of REFS) {
  const { data, error } = await db.from(t).update({ [c]: KEEP }).eq(c, DROP).select(c)
  if (error) { if (/duplicate key/.test(error.message)) { await db.from(t).delete().eq(c, DROP); moved[`${t}.${c}`] = -1; continue } console.log('ERR', t, c, error.message); continue }
  if (data?.length) moved[`${t}.${c}`] = data.length
}
for (const [t, c] of DERIVED) { const { error } = await db.from(t).delete().eq(c, DROP); if (error && !/does not exist|schema cache/.test(error.message)) console.log('ERR', t, error.message) }
if (rename) await db.from('wrestlers').update({ first_name: rename }).eq('id', KEEP)
// the merged-away profile is emptied, not deleted (the delete guard): marked inactive
await db.from('wrestlers').update({ is_active: false }).eq('id', DROP)
console.log({ backup: file, moved })
