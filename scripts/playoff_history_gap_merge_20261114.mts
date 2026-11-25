// Playoff History: one wrestler with a skipped postseason came out as two profiles (Kyle 2026-11-14: "Merge them").
// Same name + same school, two or more profiles, merged when: the seasons fit one four-season window (inside the kept
// profile's class year), no two share a season, at most one is an existing (pre-import) profile — it's kept — and Kyle
// never marked any of them Different. Entries move to the kept profile; emptied import-made profiles are deleted only
// after a recount finds nothing pointing at them. Backup first.
//   npx tsx --tsconfig tsconfig.json scripts/playoff_history_gap_merge_20261114.mts [--apply]
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { normName } from '../src/lib/playoffHistory/people'
import { window4 } from '../src/lib/playoffHistory/identity'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = <T,>(r: { data: T | null; error: { message: string } | null }, w: string): T => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as T }
const all = async (t: string, sel: string, f: (q: any) => any = q => q, key = 'id') => { const out: any[] = []; for (let i = 0; ; i += 1000) { const r = await f(db.from(t).select(sel)).order(key).range(i, i + 999); if (r.error) throw new Error(`${t}: ${r.error.message}`); out.push(...r.data); if (r.data.length < 1000) return out } }
const backup: Record<string, unknown> = { groups: [] }
const lbl = (y: number) => `${y - 1}-${String(y).slice(2)}`
for (const g of ['M', 'F'] as const) {
  const ws = new Map((await all('wrestlers', 'id, first_name, last_name, graduation_year', q => q.eq('gender', g))).map(w => [w.id, w]))
  const made = new Set((await all('playoff_history_profiles', 'wrestler_id, created', q => q.eq('gender', g).eq('created', true), 'wrestler_id')).map(r => r.wrestler_id))
  const tours = new Map((await all('tournaments', 'id, season_id', q => q.eq('gender', g))).map(t => [t.id, t.season_id]))
  const seasons = new Map<string, Set<number>>(), at = new Map<string, Set<string>>()
  for (const e of await all('tournament_entries', 'id, wrestler_id, school_id, tournament_id')) {
    if (!ws.has(e.wrestler_id) || !tours.has(e.tournament_id) || e.school_id == null) continue
    const w = ws.get(e.wrestler_id)!; const k = `${normName(`${w.first_name} ${w.last_name}`)}|${e.school_id}`
    ;(at.get(k) ?? at.set(k, new Set()).get(k)!).add(e.wrestler_id)
    ;(seasons.get(e.wrestler_id) ?? seasons.set(e.wrestler_id, new Set()).get(e.wrestler_id)!).add(tours.get(e.tournament_id)!)
  }
  // Kyle's "different" calls: a name + school he kept apart
  const diff = new Set<string>()
  for (const j of await all('playoff_history_joins', 'id, a_name, a_school, b_name, b_school, decision', q => q.eq('gender', g).eq('decision', 'different'))) {
    const a = `${normName(j.a_name)}|${j.a_school}`, b = `${normName(j.b_name)}|${j.b_school}`
    if (a === b) diff.add(a)
    else { diff.add(`${a}~${normName(j.b_name)}`); }
  }
  const merges: { key: string; keep: string; move: string[]; seasons: number[] }[] = []
  const skipped: Record<string, number> = {}
  const skip = (why: string) => { skipped[why] = (skipped[why] ?? 0) + 1 }
  for (const [k, ids] of at) {
    if (ids.size < 2) continue
    const list = [...ids]
    if (diff.has(k) || [...diff].some(d => d.startsWith(`${k}~`) && d.endsWith(`~${k.split('|')[0]}`))) { skip('you marked them Different'); continue }
    const existing = list.filter(i => !made.has(i))
    if (existing.length > 1) { skip('two existing profiles'); continue }
    const sets = list.map(i => [...(seasons.get(i) ?? [])])
    if (sets.some((a, i) => sets.some((b, j) => j > i && a.some(y => b.includes(y))))) { skip('share a season'); continue }
    const keep = existing[0] ?? list.sort((a, b) => (seasons.get(b)?.size ?? 0) - (seasons.get(a)?.size ?? 0))[0]
    const ys = sets.flat()
    if (!window4(ys, ws.get(keep)?.graduation_year ?? null).ok) { skip('outside four seasons / class year'); continue }
    merges.push({ key: k, keep, move: list.filter(i => i !== keep), seasons: [...new Set(ys)].sort() })
  }
  console.log(g, '| merges', merges.length, '| profiles to fold in', merges.reduce((n, m) => n + m.move.length, 0), '| kept apart', JSON.stringify(skipped))
  for (const m of merges.slice(0, 4)) console.log('   ', m.key.split('|')[0], m.seasons.map(lbl).join(', '), `keep ${made.has(m.keep) ? 'new' : 'existing'} profile`)
  ;(backup.groups as unknown[]).push(...merges.map(m => ({ g, ...m })))
  if (!APPLY) continue
  for (const m of merges) {
    const moved = chk(await db.from('tournament_entries').update({ wrestler_id: m.keep }).in('wrestler_id', m.move).select('id'), 'entries')
    chk(await db.from('playoff_history_entrants').update({ wrestler_id: m.keep }).in('wrestler_id', m.move).select('id'), 'staging')
    ;(m as unknown as { moved: string[] }).moved = moved.map((x: { id: string }) => x.id)
    for (const id of m.move) {
      if (!made.has(id)) continue
      // recount: anything else pointing at it? (import-made profiles have only entries)
      const left = (await db.from('tournament_entries').select('id', { count: 'exact', head: true }).eq('wrestler_id', id)).count ?? 0
      const al = (await db.from('wrestler_name_aliases').select('id', { count: 'exact', head: true }).eq('wrestler_id', id)).count ?? 0
      const dm = (await db.from(g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches').select('id', { count: 'exact', head: true }).or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`)).count ?? 0
      if (left || al || dm) { console.log('   STOP: still referenced', id, left, al, dm); continue }
      chk(await db.from('wrestlers').delete().eq('id', id).select('id'), 'delete profile')
    }
    const ys = m.seasons
    chk(await db.from('playoff_history_profiles').update({ first_season: Math.min(...ys), last_season: Math.max(...ys) }).eq('wrestler_id', m.keep).select('wrestler_id'), 'profile row')
  }
}
if (APPLY) { fs.writeFileSync('docs/migrations/backups/20261114_gap_year_merges.json', JSON.stringify(backup, null, 1)); console.log('applied; backup written') }
