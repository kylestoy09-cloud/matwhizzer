// Merge three duplicate girls profiles (approved by Kyle 2026-11-02), the same way as
// scripts/merge_duplicate_profiles.mts: move every record to the kept profile, drop the
// duplicate's derived rows, repoint follows. The duplicate is NOT deleted here: the rating log's
// opponent_wrestler_id still names it until the next girls rating run rebuilds the log (an update
// on that column times out). Delete afterwards with --delete, which first recounts every reference.
//   npx tsx --tsconfig tsconfig.json scripts/merge_girls_duplicates_20261102.mts [--apply | --delete]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--delete') ? 'delete' : 'dry'
const pairs = JSON.parse(fs.readFileSync('docs/migrations/backups/20261102_girls_duplicate_profiles_before.json', 'utf8')).pairs as { from: string; into: string; who: string }[]
const REFS: [string, string][] = [
  ['dual_meet_matches_girls', 'winner_id'], ['dual_meet_matches_girls', 'wrestler_a_id'], ['dual_meet_matches_girls', 'wrestler_b_id'],
  ['in_season_tournament_seeds_girls', 'wrestler_id'], ['individual_rankings', 'wrestler_id'], ['individual_upsets', 'loser_id'], ['individual_upsets', 'winner_id'],
  ['pending_wrestler_transfers', 'wrestler_id'], ['roster_grade_import', 'wrestler_id'],
  ['tournament_bouts_girls', 'wrestler1_id'], ['tournament_bouts_girls', 'wrestler2_id'],
  ['tournament_bracket_slots', 'bottom_wrestler_id'], ['tournament_bracket_slots', 'top_wrestler_id'], ['tournament_bracket_slots', 'winner_wrestler_id'],
  ['tournament_entries', 'wrestler_id'], ['tournament_placements', 'wrestler_id'], ['wrestler_name_aliases', 'wrestler_id'], ['wrestler_school_history', 'wrestler_id'],
]
const DERIVED: [string, string][] = [['wrestler_hammer_scores', 'wrestler_id'], ['wrestler_match_score_log', 'wrestler_id'], ['snapshot_streak_state_girls', 'wrestler_id'], ['lb_rs_wrestler', 'wrestler_id'], ['lb_ps_wrestler', 'wrestler_id']]
const count = async (t: string, c: string, id: string) => { const { count, error } = await db.from(t).select('*', { count: 'exact', head: true }).eq(c, id); if (error) throw new Error(`${t}.${c}: ${error.message}`); return count ?? 0 }

for (const p of pairs) {
  if (mode === 'delete') {
    let left = 0; const where: string[] = []
    for (const [t, c] of [...REFS, ...DERIVED, ['wrestler_match_score_log', 'opponent_wrestler_id'] as [string, string]]) { const n = await count(t, c, p.from); if (n) { left += n; where.push(`${t}.${c} ${n}`) } }
    const follows = chk(await db.from('users').select('id').contains('followed_wrestler_ids', [p.from]), 'users').length
    if (left || follows) { console.log(`STOP ${p.who}: still referenced — ${where.join(', ')}${follows ? `, follows ${follows}` : ''}`); continue }
    const r = await db.from('wrestlers').delete().eq('id', p.from).select('id')
    console.log(r.error ? `STOP ${p.who}: ${r.error.message}` : `deleted ${p.who}`)
    continue
  }
  const plan: string[] = []
  for (const [t, c] of [...REFS, ...DERIVED]) { const n = await count(t, c, p.from); if (n) plan.push(`${t}.${c} ${n}`) }
  console.log(`${p.who}: ${plan.join(', ')}`)
  if (mode !== 'apply') continue
  for (const [t, c] of DERIVED) chk(await db.from(t).delete().eq(c, p.from).select(t === 'lb_rs_wrestler' || t === 'lb_ps_wrestler' ? 'wrestler_id' : '*'), `delete ${t}`)
  for (const [t, c] of REFS) {
    if (t === 'wrestler_name_aliases') {
      const mine = chk(await db.from(t).select('raw_name, school_id').eq('wrestler_id', p.into), t)
      for (const a of chk(await db.from(t).select('id, raw_name, school_id').eq('wrestler_id', p.from), t))
        if (mine.some(x => x.raw_name === a.raw_name && x.school_id === a.school_id)) chk(await db.from(t).delete().eq('id', a.id).select('id'), 'alias dup')
    }
    if (await count(t, c, p.from)) chk(await db.from(t).update({ [c]: p.into }).eq(c, p.from).select(c), `move ${t}.${c}`)
  }
  for (const u of chk(await db.from('users').select('id, followed_wrestler_ids').contains('followed_wrestler_ids', [p.from]), 'users'))
    chk(await db.from('users').update({ followed_wrestler_ids: [...new Set((u.followed_wrestler_ids as string[]).map(x => x === p.from ? p.into : x))] }).eq('id', u.id).select('id'), 'follows')
  let left = 0; for (const [t, c] of [...REFS, ...DERIVED]) left += await count(t, c, p.from)
  console.log(left ? `  ${left} references left — stopping` : '  moved; only the rating log opponent links remain (rebuilt by the ratings run)')
  if (left) process.exit(1)
}
console.log(mode === 'dry' ? 'DRY RUN' : 'done')
