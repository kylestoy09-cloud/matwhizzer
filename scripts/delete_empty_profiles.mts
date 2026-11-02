// Deletes wrestler profiles that nothing references: every foreign key to wrestlers.id
// (the API's FK list, 2026-11-02) and users.followed_wrestler_ids.
// Each profile is counted right before its delete; any reference = it is skipped. A
// foreign-key error stops the run (it means a reference this list missed).
// Default: the 166 profiles emptied by the 2026-11-02 merge. --all-empty: every
// unreferenced profile (dry run unless --apply). Backup of deleted rows is written first.
// Run: npx tsx --tsconfig tsconfig.json scripts/delete_empty_profiles.mts [--all-empty] [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const apply = process.argv.includes('--apply'), allEmpty = process.argv.includes('--all-empty')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const REFS: [string, string][] = [
  ['bracket_picks', 'pick_1st'], ['bracket_picks', 'pick_2nd'], ['bracket_picks', 'pick_3rd'], ['bracket_picks', 'pick_4th'],
  ['dual_meet_matches', 'winner_id'], ['dual_meet_matches', 'wrestler_a_id'], ['dual_meet_matches', 'wrestler_b_id'],
  ['dual_meet_matches_girls', 'winner_id'], ['dual_meet_matches_girls', 'wrestler_a_id'], ['dual_meet_matches_girls', 'wrestler_b_id'],
  ['hs_offseason_placements', 'hs_wrestler_id'], ['in_season_tournament_seeds', 'wrestler_id'], ['in_season_tournament_seeds_girls', 'wrestler_id'],
  ['individual_rankings', 'wrestler_id'], ['individual_upsets', 'loser_id'], ['individual_upsets', 'winner_id'],
  ['ms_wrestlers', 'hs_wrestler_id'], ['pending_wrestler_transfers', 'wrestler_id'], ['roster_grade_import', 'wrestler_id'],
  ['snapshot_streak_state', 'wrestler_id'], ['snapshot_streak_state_girls', 'wrestler_id'],
  ['tournament_bouts', 'wrestler1_id'], ['tournament_bouts', 'wrestler2_id'], ['tournament_bouts_girls', 'wrestler1_id'], ['tournament_bouts_girls', 'wrestler2_id'],
  ['tournament_bracket_slots', 'bottom_wrestler_id'], ['tournament_bracket_slots', 'top_wrestler_id'], ['tournament_bracket_slots', 'winner_wrestler_id'],
  ['tournament_entries', 'wrestler_id'], ['tournament_placements', 'wrestler_id'], ['wrestler_hammer_scores', 'wrestler_id'],
  ['wrestler_match_score_log', 'opponent_wrestler_id'], ['wrestler_match_score_log', 'wrestler_id'],
  ['wrestler_name_aliases', 'wrestler_id'], ['wrestler_school_history', 'wrestler_id'],
]
// wrestler_completeness is a per-wrestler summary (one row for every wrestler), not a reference.
// If it holds a foreign key, the one-profile probe delete below fails and the run stops.
async function idsIn(t: string, c: string): Promise<Set<string>> {
  const out = new Set<string>(); let last: any = null
  // tables without an id column are paged by the reference column (only distinct ids matter)
  const key = ['wrestler_completeness', 'snapshot_streak_state', 'snapshot_streak_state_girls', 'wrestler_hammer_scores'].includes(t) ? c : 'id'
  for (;;) { let q = db.from(t).select(key === c ? c : `id, ${c}`).not(c, 'is', null).order(key).limit(1000); if (last != null) q = q.gt(key, last); const d = chk(await q, `${t}.${c}`); d.forEach(r => out.add(r[c])); if (d.length < 1000) break; last = d[d.length - 1][key] }
  return out
}
// every referenced wrestler id, read once (keyset pages; no per-id scans on unindexed columns)
const referenced = new Set<string>()
for (const [t, c] of REFS) { const s = await idsIn(t, c); s.forEach(x => referenced.add(x)); }
let last: string | null = null
for (;;) { let q = db.from('users').select('id, followed_wrestler_ids').not('followed_wrestler_ids', 'is', null).order('id').limit(1000); if (last) q = q.gt('id', last); const d = chk(await q, 'users'); d.forEach(u => (u.followed_wrestler_ids ?? []).forEach((x: string) => referenced.add(x))); if (d.length < 1000) break; last = d[d.length - 1].id }

let candidates: any[]
if (allEmpty) {
  candidates = []; let l: string | null = null
  for (;;) { let q = db.from('wrestlers').select('*').order('id').limit(1000); if (l) q = q.gt('id', l); const d = chk(await q, 'wrestlers'); candidates.push(...d.filter(w => !referenced.has(w.id))); if (d.length < 1000) break; l = d[d.length - 1].id }
} else {
  const merged = JSON.parse(fs.readFileSync('docs/migrations/backups/20261102_duplicate_profiles_done.json', 'utf8')) as any[]
  const ids = merged.map(m => m.dup)
  candidates = []; for (let i = 0; i < ids.length; i += 200) candidates.push(...chk(await db.from('wrestlers').select('*').in('id', ids.slice(i, i + 200)), 'wrestlers'))
  const stillRef = candidates.filter(w => referenced.has(w.id))
  if (stillRef.length) { console.log(`STOP: ${stillRef.length} of the merged profiles still have references:`, stillRef.map(w => w.id)); process.exit(1) }
}
const by: Record<string, number> = {}; for (const w of candidates) { const k = `${w.gender} created ${String(w.created_at).slice(0, 7)}${/^unknown/i.test(w.first_name) ? ' (Unknown placeholder)' : ''}`; by[k] = (by[k] ?? 0) + 1 }
console.log(`${allEmpty ? 'all unreferenced profiles' : 'merged duplicates'}: ${candidates.length} with 0 references (checked ${REFS.length} columns + followers)`)
if (!candidates.length) process.exit(0)
console.log(JSON.stringify(Object.entries(by).sort()))
console.log('sample:', candidates.slice(0, 15).map(w => `${w.first_name} ${w.last_name}${w.is_oos ? ' (oos)' : ''}`).join(', '))
if (!apply) process.exit(0)
const file = `docs/migrations/backups/20261102_${allEmpty ? 'unreferenced' : 'merged_duplicate'}_profiles_deleted.json`
fs.writeFileSync(file, JSON.stringify(candidates, null, 1)); console.log('backup', file)
let n = 0
{ // probe: one profile first
  const { data, error } = await db.from('wrestlers').delete().eq('id', candidates[0].id).select('id')
  if (error) { console.log(`STOP on the first delete: ${error.message}. Nothing deleted.`); process.exit(1) }
  n += data!.length
}
for (let i = 1; i < candidates.length; i += 100) {
  const { data, error } = await db.from('wrestlers').delete().in('id', candidates.slice(i, i + 100).map(w => w.id)).select('id')
  if (error) { console.log(`STOP at batch ${i}: ${error.message} (a reference this check missed; nothing more deleted)`); process.exit(1) }
  n += data!.length
}
console.log('deleted', n)
