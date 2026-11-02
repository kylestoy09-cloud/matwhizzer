// One person on two profiles: same gender, same name, both with records at the same school.
// A pair merges only if nothing says they are two people:
//   both wrestled on the same date, both entered in the same tournament, the school's
//   Track roster lists the name twice, the two have different grades, or they wrestled 3+
//   weight classes apart.
// Those pairs are listed, not changed. For a merge, every reference to the duplicate moves to
// the kept profile (the one with more records): the 36 foreign keys to wrestlers.id plus
// users.followed_wrestler_ids. Derived rows that can't coexist (rating, streak) are backed up
// and removed; the next recalculation rebuilds them. The emptied profile is NOT deleted.
// Dry run unless --apply. Backup: docs/migrations/backups/20261102_duplicate_profiles_before.json
// Run: npx tsx --tsconfig tsconfig.json scripts/merge_duplicate_profiles.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const apply = process.argv.includes('--apply') || process.argv.includes('--resume')
// --resume: finish the merges recorded in the backup (after a run stopped partway)
const resume = process.argv.includes('--resume')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
async function all(t: string, cols: string, f?: (q: any) => any) { const out: any[] = []; let last: any = null
  for (;;) { let q = db.from(t).select(cols).order('id').limit(1000); if (f) q = f(q); if (last != null) q = q.gt('id', last); const d = chk(await q, t); out.push(...d); if (d.length < 1000) break; last = d[d.length - 1].id } return out }
// Every reference to wrestlers.id (the API's foreign-key list, 2026-11-02; ms_placements.ms_wrestler_id
// is listed there but is a bigint key to ms_wrestlers)
const REFS: [string, string][] = [
  ['bracket_picks', 'pick_1st'], ['bracket_picks', 'pick_2nd'], ['bracket_picks', 'pick_3rd'], ['bracket_picks', 'pick_4th'],
  ['dual_meet_matches', 'winner_id'], ['dual_meet_matches', 'wrestler_a_id'], ['dual_meet_matches', 'wrestler_b_id'],
  ['dual_meet_matches_girls', 'winner_id'], ['dual_meet_matches_girls', 'wrestler_a_id'], ['dual_meet_matches_girls', 'wrestler_b_id'],
  ['hs_offseason_placements', 'hs_wrestler_id'], ['in_season_tournament_seeds', 'wrestler_id'], ['in_season_tournament_seeds_girls', 'wrestler_id'],
  ['individual_rankings', 'wrestler_id'], ['individual_upsets', 'loser_id'], ['individual_upsets', 'winner_id'],
  ['ms_wrestlers', 'hs_wrestler_id'], ['pending_wrestler_transfers', 'wrestler_id'], ['roster_grade_import', 'wrestler_id'],
  ['tournament_bouts', 'wrestler1_id'], ['tournament_bouts', 'wrestler2_id'], ['tournament_bouts_girls', 'wrestler1_id'], ['tournament_bouts_girls', 'wrestler2_id'],
  ['tournament_bracket_slots', 'bottom_wrestler_id'], ['tournament_bracket_slots', 'top_wrestler_id'], ['tournament_bracket_slots', 'winner_wrestler_id'],
  ['tournament_entries', 'wrestler_id'], ['tournament_placements', 'wrestler_id'], ['wrestler_name_aliases', 'wrestler_id'], ['wrestler_school_history', 'wrestler_id'],
]
// wrestler_match_score_log.opponent_wrestler_id is left to the next rating run, which rebuilds
// the log: the column has no index and an update on it times out (2026-11-02). The duplicate
// profile is not deleted, so the old link stays valid until then.
// Derived, one row per wrestler (per season): the duplicate's rows are removed, then rebuilt
const DERIVED: [string, string][] = [['wrestler_hammer_scores', 'wrestler_id'], ['wrestler_match_score_log', 'wrestler_id'], ['snapshot_streak_state', 'wrestler_id'], ['snapshot_streak_state_girls', 'wrestler_id']]

const sch = new Map(chk(await db.from('schools').select('id, display_name'), 's').map(s => [s.id, s.display_name]))
const W = new Map((await all('wrestlers', 'id, first_name, last_name, gender, grade, is_oos, created_at')).map(w => [w.id, w]))
type Rec = { school: number; date: string; event: string; w?: number }
const LAD: Record<string, number[]> = { M: [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285], F: [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235] }
const cls = (g: string, w: number) => { const l = LAD[g]; let b = 0; for (let i = 0; i < l.length; i++) if (Math.abs(l[i] - w) < Math.abs(l[b] - w)) b = i; return b }
const recs = new Map<string, Rec[]>()
const put = (w: string | null, s: number | null, date: string, event: string, wt?: number) => { if (w && s != null) (recs.get(w) ?? recs.set(w, []).get(w)!).push({ school: s, date, event, w: wt }) }
for (const g of ['M', 'F']) {
  const meets = new Map((await all(g === 'F' ? 'dual_meets_girls' : 'dual_meets', 'id, meet_date')).map(m => [m.id, m.meet_date]))
  for (const b of await all(g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches', 'id, dual_meet_id, wrestler_a_id, school_a_id, wrestler_b_id, school_b_id, weight_class')) { const d = meets.get(b.dual_meet_id) ?? '?', wt = cls(g, Number(b.weight_class)); put(b.wrestler_a_id, b.school_a_id, d, `d:${b.dual_meet_id}`, wt); put(b.wrestler_b_id, b.school_b_id, d, `d:${b.dual_meet_id}`, wt) }
  const ts = new Map((await all(g === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments', 'id, start_date')).map(t => [t.id, t.start_date]))
  for (const b of await all(g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts', 'id, in_season_tournament_id, wrestler1_id, wrestler1_school_id, wrestler2_id, wrestler2_school_id, weight_class')) { const d = ts.get(b.in_season_tournament_id) ?? '?', n = parseInt(String(b.weight_class)), wt = n ? cls(g, n) : undefined; put(b.wrestler1_id, b.wrestler1_school_id, d, `t:${b.in_season_tournament_id}`, wt); put(b.wrestler2_id, b.wrestler2_school_id, d, `t:${b.in_season_tournament_id}`, wt) }
}
for (const e of await all('tournament_entries', 'id, wrestler_id, school_id, tournament_id')) put(e.wrestler_id, e.school_id, `ps`, `e:${e.tournament_id}`)
const roster = await all('roster_grade_import', 'id, first_name_raw, last_name_raw, school_id, gender')
const rosterCount = new Map<string, number>(); for (const r of roster) if (r.school_id) { const k = `${r.gender}|${String(r.first_name_raw).trim().toLowerCase()}|${String(r.last_name_raw).trim().toLowerCase()}|${r.school_id}`; rosterCount.set(k, (rosterCount.get(k) ?? 0) + 1) }

const groups = new Map<string, Set<string>>()
for (const [w, rs] of recs) { const ww = W.get(w); if (!ww || /^unknown/i.test(ww.first_name)) continue; for (const r of rs) { const k = `${ww.gender}|${ww.first_name.trim().toLowerCase()}|${ww.last_name.trim().toLowerCase()}|${r.school}`; (groups.get(k) ?? groups.set(k, new Set()).get(k)!).add(w) } }
const merges: any[] = [], twoPeople: any[] = []
const seenPair = new Set<string>()
for (const [k, set] of groups) {
  if (set.size < 2) continue
  const ids = [...set].sort((a, b) => (recs.get(b)!.length - recs.get(a)!.length) || W.get(a)!.created_at.localeCompare(W.get(b)!.created_at))
  const keep = ids[0]
  for (const dup of ids.slice(1)) {
    const pk = [keep, dup].sort().join('|'); if (seenPair.has(pk)) continue; seenPair.add(pk)
    const a = recs.get(keep)!, b = recs.get(dup)!
    const reasons: string[] = []
    const dates = new Set(a.filter(r => r.date !== 'ps' && r.date !== '?').map(r => r.date)); const sameDay = b.filter(r => dates.has(r.date)).map(r => r.date)
    if (sameDay.length) reasons.push(`both wrestled on ${[...new Set(sameDay)].slice(0, 3).join(', ')}`)
    const ents = new Set(a.filter(r => r.event.startsWith('e:')).map(r => r.event)); if (b.some(r => r.event.startsWith('e:') && ents.has(r.event))) reasons.push('both entered in the same tournament')
    if ((rosterCount.get(k) ?? 0) > 1) reasons.push('Track roster lists the name twice')
    const ga = W.get(keep)!.grade, gb = W.get(dup)!.grade; if (ga && gb && ga !== gb) reasons.push(`grades ${ga} / ${gb}`)
    if (!!W.get(keep)!.is_oos !== !!W.get(dup)!.is_oos) reasons.push('one is flagged out-of-state')
    const med = (r: Rec[]) => { const v = r.filter(x => x.w != null).map(x => x.w!).sort((p, q) => p - q); return v.length ? v[Math.floor(v.length / 2)] : null }
    const ma = med(a), mb = med(b); if (ma != null && mb != null && Math.abs(ma - mb) >= 3) reasons.push(`weights ${LAD[W.get(keep)!.gender][ma]} / ${LAD[W.get(keep)!.gender][mb]}`)
    const row = { name: `${W.get(keep)!.first_name} ${W.get(keep)!.last_name}`, gender: W.get(keep)!.gender, school: sch.get(Number(k.split('|')[3])), keep, dup, keepRecords: a.length, dupRecords: b.length, reasons }
    ;(reasons.length ? twoPeople : merges).push(row)
  }
}
console.log(`same-name same-school profile pairs: ${merges.length + twoPeople.length} | merge: ${merges.length} | two people (listed): ${twoPeople.length}`)
for (const t of twoPeople) console.log(`  two people? ${t.gender} ${t.name} @ ${t.school}: ${t.reasons.join('; ')}`)
console.log('merge sample:'); for (const m of merges.slice(0, 6)) console.log(`  ${m.gender} ${m.name} @ ${m.school}: keep ${m.keep.slice(0, 8)} (${m.keepRecords}) <- ${m.dup.slice(0, 8)} (${m.dupRecords})`)

// rows that would move, per reference
const plan: Record<string, number> = {}
const backup: Record<string, unknown> = {}
for (const m of merges) {
  const rows: Record<string, unknown[]> = {}
  for (const [t, c] of [...REFS, ...DERIVED]) { const d = chk(await db.from(t).select('*').eq(c, m.dup), `${t}.${c}`); if (d.length) { rows[`${t}.${c}`] = d; plan[`${t}.${c}`] = (plan[`${t}.${c}`] ?? 0) + d.length } }
  const fol = chk(await db.from('users').select('id, followed_wrestler_ids').contains('followed_wrestler_ids', [m.dup]), 'users'); if (fol.length) { rows['users.followed_wrestler_ids'] = fol; plan['users.followed'] = (plan['users.followed'] ?? 0) + fol.length }
  backup[m.dup] = { merge: m, wrestler: W.get(m.dup), rows }
}
console.log('rows to move:', JSON.stringify(plan))
fs.writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/merge_plan.json', JSON.stringify({ merges, twoPeople }, null, 1))
if (!apply) process.exit(0)

const BK = 'docs/migrations/backups/20261102_duplicate_profiles_before.json'
let todo = merges
if (resume) todo = Object.values(JSON.parse(fs.readFileSync(BK, 'utf8'))).map((x: any) => x.merge)
else { fs.writeFileSync(BK, JSON.stringify(backup)); console.log('backup written') }
for (const m of todo) {
  for (const [t, c] of DERIVED) chk(await db.from(t).delete().eq(c, m.dup).select('*'), `delete ${t}`)
  for (const [t, c] of REFS) {
    // an alias the kept profile already has at the same school and name would be a duplicate: drop the copy
    if (t === 'wrestler_name_aliases') {
      const mine = chk(await db.from(t).select('raw_name, school_id').eq('wrestler_id', m.keep), t)
      for (const a of chk(await db.from(t).select('id, raw_name, school_id').eq('wrestler_id', m.dup), t))
        if (mine.some(x => x.raw_name === a.raw_name && x.school_id === a.school_id)) chk(await db.from(t).delete().eq('id', a.id).select('id'), 'alias dup')
    }
    chk(await db.from(t).update({ [c]: m.keep }).eq(c, m.dup).select(c === 'wrestler_id' || t === 'tournament_entries' ? 'wrestler_id' : 'id'), `move ${t}.${c}`)
  }
  for (const u of chk(await db.from('users').select('id, followed_wrestler_ids').contains('followed_wrestler_ids', [m.dup]), 'users'))
    chk(await db.from('users').update({ followed_wrestler_ids: [...new Set((u.followed_wrestler_ids as string[]).map(x => x === m.dup ? m.keep : x))] }).eq('id', u.id).select('id'), 'users')
  // the duplicate must now be unreferenced
  let left = 0; for (const [t, c] of [...REFS, ...DERIVED]) { const { count } = await db.from(t).select('*', { count: 'exact', head: true }).eq(c, m.dup); left += count ?? 0 }
  if (left) throw new Error(`${m.name}: ${left} references left on ${m.dup}; stopping`)
}
fs.writeFileSync('docs/migrations/backups/20261102_duplicate_profiles_done.json', JSON.stringify(todo, null, 1))
console.log(`merged ${todo.length}; the ${todo.length} emptied profiles are kept until deletion is approved`)
