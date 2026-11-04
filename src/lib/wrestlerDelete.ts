// Deleting a wrestler profile from the admin edit tool (/admin/{boys,girls}/wrestlers/[id]).
// A profile that still holds real records (bouts, entries, placements, rankings) is never
// deleted: those belong to a real wrestler, so the admin merges instead. (A blind delete lost
// Kayla Coletta's season at Mary Help, 2026-09-17.) Otherwise the profile goes with what is
// derived from it or points at it: ratings, leaderboard rows, name aliases, school history,
// follows. Track roster rows it was matched to go back to 'no_match' (the grade pool keeps them).

import { createSupabaseAdmin } from '@/lib/supabase/service'

type Db = ReturnType<typeof createSupabaseAdmin>

// real records: any of these blocks the delete
const RECORDS: [string, string, string][] = [
  ['dual_meet_matches', 'wrestler_a_id', 'Dual bouts'], ['dual_meet_matches', 'wrestler_b_id', 'Dual bouts'],
  ['dual_meet_matches_girls', 'wrestler_a_id', 'Dual bouts'], ['dual_meet_matches_girls', 'wrestler_b_id', 'Dual bouts'],
  ['tournament_bouts', 'wrestler1_id', 'Tournament bouts'], ['tournament_bouts', 'wrestler2_id', 'Tournament bouts'],
  ['tournament_bouts_girls', 'wrestler1_id', 'Tournament bouts'], ['tournament_bouts_girls', 'wrestler2_id', 'Tournament bouts'],
  ['tournament_entries', 'wrestler_id', 'Postseason entries'],
  ['tournament_placements', 'wrestler_id', 'Tournament placements'],
  ['tournament_bracket_slots', 'top_wrestler_id', 'Bracket spots'], ['tournament_bracket_slots', 'bottom_wrestler_id', 'Bracket spots'],
  ['in_season_tournament_seeds', 'wrestler_id', 'Tournament seeds'], ['in_season_tournament_seeds_girls', 'wrestler_id', 'Tournament seeds'],
  ['individual_rankings', 'wrestler_id', 'Rankings'],
  ['individual_upsets', 'winner_id', 'Upsets'], ['individual_upsets', 'loser_id', 'Upsets'],
]
// derived from the profile, or pointing at it: removed with it
const CLEANUP: [string, string, string][] = [
  ['wrestler_hammer_scores', 'wrestler_id', 'Ratings'],
  ['wrestler_match_score_log', 'wrestler_id', 'Rating log'], ['wrestler_match_score_log', 'opponent_wrestler_id', 'Rating log'],
  ['lb_rs_wrestler', 'wrestler_id', 'Leaderboard rows'], ['lb_ps_wrestler', 'wrestler_id', 'Leaderboard rows'],
  ['snapshot_streak_state', 'wrestler_id', 'Streak snapshots'], ['snapshot_streak_state_girls', 'wrestler_id', 'Streak snapshots'],
  ['wrestler_name_aliases', 'wrestler_id', 'Name aliases'],
  ['wrestler_school_history', 'wrestler_id', 'School history'],
  ['pending_wrestler_transfers', 'wrestler_id', 'Pending transfers'],
]

async function count(db: Db, t: string, c: string, id: string) {
  const { count: n, error } = await db.from(t).select('*', { count: 'exact', head: true }).eq(c, id)
  if (error) throw new Error(`${t}.${c}: ${error.message}`)
  return n ?? 0
}

function tally(rows: { label: string; n: number }[]) {
  const m = new Map<string, number>()
  for (const r of rows) if (r.n) m.set(r.label, (m.get(r.label) ?? 0) + r.n)
  return [...m].map(([label, n]) => ({ label, count: n }))
}

/** What a delete would hit: records (block it) and what would be removed with it */
export async function deletePreview(db: Db, id: string) {
  const records = tally(await Promise.all(RECORDS.map(async ([t, c, label]) => ({ label, n: await count(db, t, c, id) }))))
  const cleanup = tally(await Promise.all(CLEANUP.map(async ([t, c, label]) => ({ label, n: await count(db, t, c, id) }))))
  const roster = await count(db, 'roster_grade_import', 'wrestler_id', id)
  const { data: followers } = await db.from('users').select('id').contains('followed_wrestler_ids', [id])
  if (roster) cleanup.push({ label: 'Track roster matches (back to unmatched)', count: roster })
  if (followers?.length) cleanup.push({ label: 'Followers', count: followers.length })
  return { records, cleanup, blocked: records.length > 0 }
}

/** Delete the profile. Refuses while records remain. */
export async function deleteWrestler(db: Db, id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const preview = await deletePreview(db, id)
  if (preview.blocked) return { ok: false, error: `Still has ${preview.records.map(r => `${r.count} ${r.label.toLowerCase()}`).join(', ')}. Merge it into the right profile instead.` }
  for (const [t, c] of CLEANUP) {
    const { error } = await db.from(t).delete().eq(c, id)
    if (error) return { ok: false, error: `${t}: ${error.message}` }
  }
  const { error: rErr } = await db.from('roster_grade_import').update({ wrestler_id: null, status: 'no_match' }).eq('wrestler_id', id)
  if (rErr) return { ok: false, error: `roster_grade_import: ${rErr.message}` }
  const { data: followers } = await db.from('users').select('id, followed_wrestler_ids').contains('followed_wrestler_ids', [id])
  for (const u of followers ?? []) {
    const { error } = await db.from('users').update({ followed_wrestler_ids: (u.followed_wrestler_ids as string[]).filter(x => x !== id) }).eq('id', u.id)
    if (error) return { ok: false, error: `follows: ${error.message}` }
  }
  // a reference this list doesn't know about fails here (foreign key) and nothing is deleted
  const { error } = await db.from('wrestlers').delete().eq('id', id)
  if (error) return { ok: false, error: `Not deleted: ${error.message}` }
  return { ok: true }
}
