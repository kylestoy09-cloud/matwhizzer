// For every out-of-state school: the events it appeared at (in-season tournaments with their location; dual meets with
// the NJ opponent), its bout count, and any state already known (name tag "(XX)" or a "Name, XX" alias). Context for
// assigning states (Kyle 2026-11-10). Read-only; writes docs/reviews/oos_state_context.json.
//   npx tsx --tsconfig tsconfig.json scripts/oos_state_context_20261110.mts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }
const schools = await all((f, t) => db.from('schools').select('id, display_name, is_nj').range(f, t))
const oos = schools.filter((s: any) => !s.is_nj); const ids = new Set(oos.map((s: any) => s.id)); const name = new Map(schools.map((s: any) => [s.id, s.display_name]))
const ctx = new Map<number, { events: Map<string, number>; bouts: number; known: Set<string> }>()
const get = (id: number) => { let c = ctx.get(id); if (!c) { c = { events: new Map(), bouts: 0, known: new Set() }; ctx.set(id, c) } return c }
for (const s of oos) { const m = s.display_name.match(/\(([A-Z]{2})\)$/); if (m) get(s.id).known.add(m[1]) }
for (const a of await all((f, t) => db.from('school_aliases').select('school_id, alias').range(f, t))) { const m = a.alias.match(/,\s*([A-Z]{2})$/); if (m && ids.has(a.school_id)) get(a.school_id).known.add(m[1]) }
for (const [tt, bt] of [['in_season_tournaments', 'tournament_bouts'], ['in_season_tournaments_girls', 'tournament_bouts_girls']]) {
  const ts = new Map((await all((f, t) => db.from(tt).select('id, name, start_date, location').range(f, t))).map((t: any) => [t.id, `${t.name} (${t.start_date}; ${(t.location ?? '').replace(/, \d+(st|nd|rd|th).*$/, '').slice(0, 80)})`]))
  for (const b of await all((f, t) => db.from(bt).select('in_season_tournament_id, wrestler1_school_id, wrestler2_school_id').range(f, t)))
    for (const sid of [b.wrestler1_school_id, b.wrestler2_school_id]) if (ids.has(sid)) { const c = get(sid); c.bouts++; const e = ts.get(b.in_season_tournament_id) ?? '?'; c.events.set(e, (c.events.get(e) ?? 0) + 1) }
}
for (const [dt, mt] of [['dual_meets', 'dual_meet_matches'], ['dual_meets_girls', 'dual_meet_matches_girls']]) {
  const ms = await all((f, t) => db.from(mt).select('dual_meet_id, school_a_id, school_b_id').range(f, t))
  for (const m of ms) for (const [me, op] of [[m.school_a_id, m.school_b_id], [m.school_b_id, m.school_a_id]]) if (ids.has(me)) { const c = get(me); c.bouts++; const e = `dual vs ${name.get(op) ?? '?'}`; c.events.set(e, (c.events.get(e) ?? 0) + 1) }
}
// postseason entries (NJ preps at districts etc.)
for (const e of await all((f, t) => db.from('tournament_entries').select('school_id, tournaments(name)').range(f, t))) if (ids.has(e.school_id)) { const c = get(e.school_id); const k = `postseason ${e.tournaments?.name}`; c.events.set(k, (c.events.get(k) ?? 0) + 1) }
const out = oos.map((s: any) => { const c = ctx.get(s.id); return { id: s.id, name: s.display_name, known: [...(c?.known ?? [])], bouts: c?.bouts ?? 0, events: [...(c?.events ?? [])].sort((a, b) => b[1] - a[1]).map(([e, n]) => `${e} ×${n}`) } })
fs.writeFileSync('docs/reviews/oos_state_context.json', JSON.stringify(out, null, 1))
console.log('schools', out.length, 'known', out.filter((o: any) => o.known.length).length, 'no events', out.filter((o: any) => !o.events.length).length)
const evc = new Map<string, number>(); for (const o of out) for (const e of o.events) { const k = e.replace(/ ×\d+$/, '').replace(/^dual vs .*/, 'dual'); evc.set(k, (evc.get(k) ?? 0) + 1) }
console.log([...evc].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${v} ${k}`).join('\n'))
