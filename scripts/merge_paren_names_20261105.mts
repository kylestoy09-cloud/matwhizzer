// Fix the boys profiles whose name was cut at a nickname in parentheses (2026-11-05, Kyle).
// The 2026-03-20 postseason load (../reload_from_gt.py's CSV, parsed_s*_districts.csv) split
// "Charles (CJ) Palmisano" at the "(" and made first "Charles", last "" (same for Terrance (James)
// Fearon and Arjun (Danny) Monga). The 2026-08-06 Princeton dual import kept "Pinhao (Alex)" as the
// first name. Charles and Terrance already had a correctly named profile at the same school with
// no event in common: merge. Arjun has no other profile: rename. Pinhao: drop the nickname.
// Steps as in merge_duplicates_20261105.mts: --apply moves every record and drops derived rows;
// rebuild ratings; --delete recounts every reference and deletes the emptied profile only at 0.
//   npx tsx --tsconfig tsconfig.json scripts/merge_paren_names_20261105.mts [--apply | --delete]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--delete') ? 'delete' : 'dry'
const BACKUP = 'docs/migrations/backups/20261105_paren_names_before.json'

type Pair = { g: 'M' | 'F'; from: string; into: string; who: string; rename?: [string, string] }
const RENAMES: { id: string; who: string; first: string; last: string }[] = [
  { id: '92a836ab-2409-4acb-a515-3e77bd772b71', who: 'Princeton: "Arjun" → Arjun Monga', first: 'Arjun', last: 'Monga' },
  { id: '36ba8d6f-4bdc-48be-a12d-cbeeafb51800', who: 'Princeton: "Pinhao (Alex)" Xu → Pinhao Xu', first: 'Pinhao', last: 'Xu' },
]
let pairs: Pair[]
if (mode === 'dry' || mode === 'apply') {
  const ws = chk(await db.from('wrestlers').select('id, first_name, last_name').eq('gender', 'M').in('first_name', ['Charles', 'Terrance']), 'w')
  const id = (p: string) => ws.find((w: any) => w.id.startsWith(p)).id
  pairs = [
    { g: 'M', from: id('e3c97685'), into: id('8eb02bca'), who: 'Whippany Park: "Charles" → Charles Palmisano' },
    { g: 'M', from: id('b81a6c9d'), into: id('12690e41'), who: 'Hunterdon Central: "Terrance" → Terrance Fearon' },
  ]
  // guard: no event in common
  for (const p of pairs) {
    const a = chk(await db.from('tournament_entries').select('tournament_id').eq('wrestler_id', p.from), 'a').map(x => x.tournament_id)
    const b = chk(await db.from('tournament_entries').select('tournament_id').eq('wrestler_id', p.into), 'b').map(x => x.tournament_id)
    if (a.some(t => b.includes(t))) throw new Error(`${p.who}: both profiles are entered in one tournament`)
  }
} else pairs = JSON.parse(fs.readFileSync(BACKUP, 'utf8')).pairs

const T = (g: string) => g === 'F'
  ? { dual: 'dual_meet_matches_girls', tb: 'tournament_bouts_girls', seeds: 'in_season_tournament_seeds_girls', streak: 'snapshot_streak_state_girls' }
  : { dual: 'dual_meet_matches', tb: 'tournament_bouts', seeds: 'in_season_tournament_seeds', streak: 'snapshot_streak_state' }
const REFS = (g: string): [string, string][] => { const t = T(g); return [
  [t.dual, 'winner_id'], [t.dual, 'wrestler_a_id'], [t.dual, 'wrestler_b_id'], [t.tb, 'wrestler1_id'], [t.tb, 'wrestler2_id'], [t.seeds, 'wrestler_id'],
  ['tournament_entries', 'wrestler_id'], ['tournament_placements', 'wrestler_id'], ['tournament_bracket_slots', 'top_wrestler_id'], ['tournament_bracket_slots', 'bottom_wrestler_id'], ['tournament_bracket_slots', 'winner_wrestler_id'],
  ['individual_rankings', 'wrestler_id'], ['individual_upsets', 'loser_id'], ['individual_upsets', 'winner_id'], ['pending_wrestler_transfers', 'wrestler_id'],
  ['roster_grade_import', 'wrestler_id'], ['wrestler_name_aliases', 'wrestler_id'], ['wrestler_school_history', 'wrestler_id']] }
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
  for (const r of RENAMES) backup[`rename ${r.id}`] = chk(await db.from('wrestlers').select('*').eq('id', r.id), 'r')
  fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 1))
}
if (mode !== 'delete') for (const r of RENAMES) {
  console.log(`rename ${r.who}`)
  if (mode === 'apply') chk(await db.from('wrestlers').update({ first_name: r.first, last_name: r.last }).eq('id', r.id).select('id'), 'rename')
}
for (const p of pairs) {
  if (mode === 'delete') {
    let left = 0; const where: string[] = []
    for (const [t, c] of [...REFS(p.g), ...DERIVED(p.g), ['wrestler_match_score_log', 'opponent_wrestler_id'] as [string, string]]) { const n = await count(t, c, p.from); if (n) { left += n; where.push(`${t}.${c} ${n}`) } }
    const follows = chk(await db.from('users').select('id').contains('followed_wrestler_ids', [p.from]), 'users').length
    if (left || follows) { console.log(`STOP ${p.who}: still referenced — ${where.join(', ')}${follows ? `, follows ${follows}` : ''}`); continue }
    const r = await db.from('wrestlers').delete().eq('id', p.from).select('id')
    console.log(r.error ? `STOP ${p.who}: ${r.error.message}` : `deleted ${p.who}`)
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
}
function backup_row(id: string) { const b = JSON.parse(fs.readFileSync(BACKUP, 'utf8')); return b[`wrestler ${id}`]?.[0] ?? null }
console.log(mode === 'dry' ? `DRY RUN: ${pairs.length} merges, ${RENAMES.length} renames` : 'done')
