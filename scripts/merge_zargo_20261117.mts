// Kyle 2026-11-17: "joey zargo is joe zargo and they are both joseph zargo" — Joey Zargo (South River, 2016-17) and
// Joe Zargo (Bergen Catholic, 2017-18 / 2018-19) are one wrestler, Joseph Zargo (Wisconsin 2022–2026). Joey's records
// move to the Bergen Catholic profile, renamed Joseph. (Joe Zargo of Monroe, 2012-13 – 2014-15, is someone else.)
// Every reference to wrestlers.id moves (the list in scripts/merge_duplicate_profiles.mts plus the tables added since);
// derived rating / streak rows of the merged-away profile are removed (the next rating run rebuilds them). Backup first.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const KEEP = '779c34d7-47ef-4e63-9da2-c0f57b27bde6', DROP = '2a954d9b-1cec-47d0-b7fd-f8c774f8ddf3'
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
writeFileSync('docs/migrations/backups/20261117_merge_zargo.json', JSON.stringify(backup, null, 1))
const moved: Record<string, number> = {}
for (const [t, c] of REFS) {
  const { data, error } = await db.from(t).update({ [c]: KEEP }).eq(c, DROP).select(c)
  if (error) { if (/duplicate key/.test(error.message)) { await db.from(t).delete().eq(c, DROP); moved[`${t}.${c}`] = -1; continue } console.log('ERR', t, c, error.message); continue }
  if (data?.length) moved[`${t}.${c}`] = data.length
}
for (const [t, c] of DERIVED) { const { error } = await db.from(t).delete().eq(c, DROP); if (error && !/does not exist|schema cache/.test(error.message)) console.log('ERR', t, error.message) }
await db.from('wrestlers').update({ first_name: 'Joseph' }).eq('id', KEEP)
// the merged-away profile is emptied, not deleted (the delete guard): marked inactive
await db.from('wrestlers').update({ is_active: false }).eq('id', DROP)
console.log('moved', moved)
