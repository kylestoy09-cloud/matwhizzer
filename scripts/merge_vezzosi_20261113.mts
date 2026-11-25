// Merge Joseph Vezzosi's two boys profiles (Kyle 2026-11-13: "go ahead and merge joseph's profiles"): "Joseph `Mako`
// Vezzosi" (dbd3844f, from a TrackWrestling roster with his nickname in backticks) and "Joseph Vezzosi" (1bbd9c6b),
// both class of 2027. Hub prospects linked to the emptied profile move too.
// Steps as merge_duplicates_20261105.mts: --apply moves every record and drops derived rows; rebuild ratings;
// --delete recounts every reference and deletes the emptied profile only at 0.
//   npx tsx --tsconfig tsconfig.json scripts/merge_duplicates_20261109_sam_cali.mts [--apply | --delete]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--delete') ? 'delete' : 'dry'
const BACKUP = 'docs/migrations/backups/20261113_vezzosi_merge_before.json'

type Pair = { g: 'M' | 'F'; from: string; into: string; who: string; rename?: [string, string] }
const INTO = process.argv.includes('--into-mako') ? 'dbd3844f-535e-4830-b4ea-03c202f90237' : '1bbd9c6b-91c6-465d-94b8-103e50b7a587'
const FROM = INTO.startsWith('dbd') ? '1bbd9c6b-91c6-465d-94b8-103e50b7a587' : 'dbd3844f-535e-4830-b4ea-03c202f90237'
const pairs: Pair[] = [
  { g: 'M', from: FROM, into: INTO, who: 'Joseph Vezzosi', rename: ['Joseph', 'Vezzosi'] },
]

const T = (g: string) => g === 'F'
  ? { dual: 'dual_meet_matches_girls', tb: 'tournament_bouts_girls', seeds: 'in_season_tournament_seeds_girls', streak: 'snapshot_streak_state_girls' }
  : { dual: 'dual_meet_matches', tb: 'tournament_bouts', seeds: 'in_season_tournament_seeds', streak: 'snapshot_streak_state' }
const REFS = (g: string): [string, string][] => { const t = T(g); return [
  [t.dual, 'winner_id'], [t.dual, 'wrestler_a_id'], [t.dual, 'wrestler_b_id'], [t.tb, 'wrestler1_id'], [t.tb, 'wrestler2_id'], [t.seeds, 'wrestler_id'],
  ['tournament_entries', 'wrestler_id'], ['tournament_placements', 'wrestler_id'], ['tournament_bracket_slots', 'top_wrestler_id'], ['tournament_bracket_slots', 'bottom_wrestler_id'], ['tournament_bracket_slots', 'winner_wrestler_id'],
  ['individual_rankings', 'wrestler_id'], ['individual_upsets', 'loser_id'], ['individual_upsets', 'winner_id'], ['pending_wrestler_transfers', 'wrestler_id'],
  ['roster_grade_import', 'wrestler_id'], ['wrestler_name_aliases', 'wrestler_id'], ['wrestler_school_history', 'wrestler_id'],
  ['offseason_board_order', 'wrestler_id']] }
// his two hub prospects (one per profile) become one: the emptied profile's prospect's placements and bouts move to
// the kept profile's prospect, renamed to the clean name; the emptied prospect goes with --delete
const PROSPECT = { from: 404, into: 6367, last_name: 'Vezzosi' }
const DERIVED = (g: string): [string, string][] => [['wrestler_hammer_scores', 'wrestler_id'], ['wrestler_match_score_log', 'wrestler_id'], [T(g).streak, 'wrestler_id'], ['lb_rs_wrestler', 'wrestler_id'], ['lb_ps_wrestler', 'wrestler_id']]
const count = async (t: string, c: string, id: string) => { const { count, error } = await db.from(t).select('*', { count: 'exact', head: true }).eq(c, id); if (error) throw new Error(`${t}.${c}: ${error.message}`); return count ?? 0 }

if (mode === 'apply') {
  if (fs.existsSync(BACKUP)) throw new Error(`${BACKUP} exists: already applied?`)
  const backup: Record<string, unknown> = { pairs }
  for (const p of pairs) {
    backup[`wrestler ${p.from}`] = chk(await db.from('wrestlers').select('*').eq('id', p.from), 'w')
    backup[`wrestler ${p.into}`] = chk(await db.from('wrestlers').select('*').eq('id', p.into), 'w')
    for (const [t, c] of [...REFS(p.g), ...DERIVED(p.g)]) backup[`${t}.${c} ${p.from}`] = chk(await db.from(t).select('*').eq(c, p.from), `${t}.${c}`)
  }
  backup.prospects = chk(await db.from('boys_prospects').select('*').in('id', [PROSPECT.from, PROSPECT.into]), 'p')
  backup.prospect_placements = chk(await db.from('boys_hub_placements').select('*').eq('prospect_id', PROSPECT.from), 'pp')
  backup.prospect_bouts = chk(await db.from('boys_hub_bouts').select('*').or(`winner_prospect_id.eq.${PROSPECT.from},loser_prospect_id.eq.${PROSPECT.from}`), 'pb')
  fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 1))
}
for (const p of pairs) {
  if (mode === 'delete') {
    let left = 0; const where: string[] = []
    for (const [t, c] of [...REFS(p.g), ...DERIVED(p.g), ['wrestler_match_score_log', 'opponent_wrestler_id'] as [string, string]]) { const n = await count(t, c, p.from); if (n) { left += n; where.push(`${t}.${c} ${n}`) } }
    const follows = chk(await db.from('users').select('id').contains('followed_wrestler_ids', [p.from]), 'users').length
    if (left || follows) { console.log(`STOP ${p.who}: still referenced — ${where.join(', ')}${follows ? `, follows ${follows}` : ''}`); continue }
    const r = await db.from('wrestlers').delete().eq('id', p.from).select('id')
    console.log(r.error ? `STOP ${p.who}: ${r.error.message}` : `deleted ${p.who}`)
    const pl = (await count('boys_hub_placements', 'prospect_id', String(PROSPECT.from))) + (await count('boys_hub_bouts', 'winner_prospect_id', String(PROSPECT.from))) + (await count('boys_hub_bouts', 'loser_prospect_id', String(PROSPECT.from)))
    if (pl) { console.log(`STOP prospect ${PROSPECT.from}: ${pl} hub records left`); continue }
    const rp = await db.from('boys_prospects').delete().eq('id', PROSPECT.from).select('id')
    console.log(rp.error ? `STOP prospect ${PROSPECT.from}: ${rp.error.message}` : `deleted prospect ${PROSPECT.from}`)
    continue
  }
  const plan: string[] = []
  for (const [t, c] of [...REFS(p.g), ...DERIVED(p.g)]) { const n = await count(t, c, p.from); if (n) plan.push(`${t.replace(/_girls$/, '')}.${c} ${n}`) }
  console.log(`${p.g} ${p.who}${p.rename ? ` (rename to ${p.rename.join(' ')})` : ''}: ${plan.join(', ') || 'nothing'}`)
  if (mode !== 'apply') continue
  for (const [t, c] of DERIVED(p.g)) chk(await db.from(t).delete().eq(c, p.from).select(t.startsWith('lb_') ? 'wrestler_id' : '*'), `delete ${t}`)
  for (const [t, c] of REFS(p.g)) {
    if (t === 'wrestler_name_aliases') {
      const mine = chk(await db.from(t).select('raw_name, school_id').eq('wrestler_id', p.into), t)
      for (const a of chk(await db.from(t).select('id, raw_name, school_id').eq('wrestler_id', p.from), t))
        if (mine.some(x => x.raw_name === a.raw_name && x.school_id === a.school_id)) chk(await db.from(t).delete().eq('id', a.id).select('id'), 'alias dup')
    }
    if (await count(t, c, p.from)) chk(await db.from(t).update({ [c]: p.into }).eq(c, p.from).select(c), `move ${t}.${c}`)
  }
  for (const u of chk(await db.from('users').select('id, followed_wrestler_ids').contains('followed_wrestler_ids', [p.from]), 'users'))
    chk(await db.from('users').update({ followed_wrestler_ids: [...new Set((u.followed_wrestler_ids as string[]).map(x => x === p.from ? p.into : x))] }).eq('id', u.id).select('id'), 'follows')
  // grade: the Track roster grade (roster_upload) wins, from either profile; else the kept one's; else the other's
  const kept = chk(await db.from('wrestlers').select('grade, grade_confirmed_source, grade_confirmed_at, is_active').eq('id', p.into), 'k')[0], dup = backup_row(p.from)
  const upd: Record<string, unknown> = {}
  if (dup?.grade && dup.grade !== kept.grade && (dup.grade_confirmed_source === 'roster_upload' && kept.grade_confirmed_source !== 'roster_upload' || !kept.grade))
    Object.assign(upd, { grade: dup.grade, grade_confirmed_source: dup.grade_confirmed_source ?? 'manual', grade_confirmed_at: dup.grade_confirmed_at ?? new Date().toISOString() })
  if (dup?.is_active && kept.is_active === false) upd.is_active = true
  if (p.rename) Object.assign(upd, { first_name: p.rename[0], last_name: p.rename[1] })
  if (Object.keys(upd).length) chk(await db.from('wrestlers').update(upd).eq('id', p.into).select('id'), 'kept')
  let left = 0; for (const [t, c] of [...REFS(p.g), ...DERIVED(p.g)]) left += await count(t, c, p.from)
  if (left) { console.log(`  ${left} references left — stopping`); process.exit(1) }
  // the prospects
  chk(await db.from('boys_hub_placements').update({ prospect_id: PROSPECT.into }).eq('prospect_id', PROSPECT.from).select('id'), 'move placements')
  chk(await db.from('boys_hub_bouts').update({ winner_prospect_id: PROSPECT.into }).eq('winner_prospect_id', PROSPECT.from).select('id'), 'move bout wins')
  chk(await db.from('boys_hub_bouts').update({ loser_prospect_id: PROSPECT.into }).eq('loser_prospect_id', PROSPECT.from).select('id'), 'move bout losses')
  chk(await db.from('boys_prospects').update({ last_name: PROSPECT.last_name, wrestler_id: p.into }).eq('id', PROSPECT.into).select('id'), 'rename prospect')
  chk(await db.from('boys_prospects').update({ wrestler_id: null }).eq('id', PROSPECT.from).select('id'), 'unlink emptied prospect')
  console.log('  prospect', PROSPECT.from, '→', PROSPECT.into)
}
function backup_row(id: string) { const b = JSON.parse(fs.readFileSync(BACKUP, 'utf8')); return b[`wrestler ${id}`]?.[0] ?? null }
console.log(mode === 'dry' ? `DRY RUN: ${pairs.length} pairs` : 'done')
