// Merge four duplicate girls profiles (reported by Kyle 2026-11-04), keeping the profile with the
// Track roster name and most records: North Hunterdon "Reagan Fraber" → "Reagan Farber"; North Star
// Academy "Khori Smith" → "Ihori Smith"; Nutley "Izzy Timonera" → "Izzabella Timonera" and
// "Janeeza Timonera" → "Janizza Timonera" (sisters: Izzy beat Janeeza in the Essex County 100 final).
// After the moves (--apply): Nutley's Track roster links were crossed (Izzabella's profile held
// Janizza's row), so Janizza's row goes to Janizza; grades follow the Track roster (Izzabella Sr,
// Ihori So).
// Neither pair ever appears in the same event. Same steps as merge_girls_duplicates_20261102.mts,
// itself the same way as
// scripts/merge_duplicate_profiles.mts: move every record to the kept profile, drop the
// duplicate's derived rows, repoint follows. The duplicate is NOT deleted here: the rating log's
// opponent_wrestler_id still names it until the next girls rating run rebuilds the log (an update
// on that column times out). Delete afterwards with --delete, which first recounts every reference.
//   npx tsx --tsconfig tsconfig.json scripts/merge_girls_duplicates_20261104_batch3.mts [--apply | --delete]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--delete') ? 'delete' : 'dry'
const pairs = [
  { from: 'd3e218bb-e7a3-4385-8cdd-39fa52fa15ad', into: '6da4fa41-1ad3-4668-8c80-ef7fbe207ad3', who: 'North Hunterdon: Reagan Fraber → Reagan Farber' },
  { from: '104693f0-ac0e-4396-88b3-cb80525358ad', into: '59b0f8c5-1ad9-4390-ab3e-e720b3130a63', who: 'North Star Academy: Khori Smith → Ihori Smith' },
  { from: 'f8ed474f-46d5-4eb4-b7a3-a31919cbaaf7', into: '63f2f295-c752-4317-8f52-4456328bd1db', who: 'Nutley: Izzy Timonera → Izzabella Timonera' },
  { from: 'f882b7f5-67fd-4136-a9df-323dd20b9d60', into: 'af9d4501-4668-4626-9cc4-427ce1d86a84', who: 'Nutley: Janeeza Timonera → Janizza Timonera' },
]
const BACKUP = 'docs/migrations/backups/20261104_girls_duplicate_profiles_batch3_before.json'
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

if (mode === 'apply') {
  if (fs.existsSync(BACKUP)) throw new Error(`${BACKUP} exists: already applied?`)
  const backup: Record<string, unknown> = { pairs }
  for (const p of pairs) {
    backup[`wrestler ${p.from}`] = chk(await db.from('wrestlers').select('*').eq('id', p.from), 'w')
    for (const [t, c] of [...REFS, ...DERIVED]) backup[`${t}.${c} ${p.from}`] = chk(await db.from(t).select('*').eq(c, p.from), `${t}.${c}`)
  }
  backup['kept wrestlers'] = chk(await db.from('wrestlers').select('*').in('id', pairs.map(p => p.into)), 'kept')
  backup['roster 9e9122f1 (Janizza)'] = chk(await db.from('roster_grade_import').select('*').eq('id', '9e9122f1-1b54-4757-8f5c-3e25b1a35565'), 'roster')
  fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 1))
}

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
if (mode === 'apply') {
  const now = new Date().toISOString()
  chk(await db.from('roster_grade_import').update({ wrestler_id: 'af9d4501-4668-4626-9cc4-427ce1d86a84' }).eq('id', '9e9122f1-1b54-4757-8f5c-3e25b1a35565').eq('first_name_raw', 'Janizza').select('id'), 'Janizza roster row')
  chk(await db.from('wrestlers').update({ grade: 'Sr', grade_confirmed_source: 'roster_upload', grade_confirmed_at: now }).eq('id', '63f2f295-c752-4317-8f52-4456328bd1db').select('id'), 'Izzabella grade')
  chk(await db.from('wrestlers').update({ grade: 'So', grade_confirmed_source: 'roster_upload', grade_confirmed_at: now }).eq('id', '59b0f8c5-1ad9-4390-ab3e-e720b3130a63').select('id'), 'Ihori grade')
  console.log('Nutley roster link fixed; grades: Izzabella Sr, Ihori So')
}
console.log(mode === 'dry' ? 'DRY RUN' : 'done')
