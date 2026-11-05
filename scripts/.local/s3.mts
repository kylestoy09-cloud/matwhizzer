// Candidate duplicate pairs: same gender, same full name (ignoring spaces/punctuation and the
// first/last split), or a name at a school that's linked to another profile (backfill holds).
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '')
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const RANK: Record<string, number> = { Fr: 1, So: 2, Jr: 3, Sr: 4 }
const out: any[] = []
for (const g of ['F', 'M'] as const) {
  const ws = await all((f, t) => db.from('wrestlers').select('id, first_name, last_name, grade, is_active, is_oos').eq('gender', g).order('id').range(f, t))
  const W = new Map(ws.map((w: any) => [w.id, w]))
  const prof = new Map<string, { schools: Set<number>; ev: Set<string>; wts: Set<number>; n: number }>()
  const P = (id: string) => prof.get(id) ?? prof.set(id, { schools: new Set(), ev: new Set(), wts: new Set(), n: 0 }).get(id)!
  const tb = await all((f, t) => db.from(g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts').select('in_season_tournament_id, weight_class, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id').order('id').range(f, t))
  for (const b of tb) for (const [w, s] of [[b.wrestler1_id, b.wrestler1_school_id], [b.wrestler2_id, b.wrestler2_school_id]]) if (w) { const p = P(w); if (s) p.schools.add(s); p.ev.add('T' + b.in_season_tournament_id); p.wts.add(b.weight_class); p.n++ }
  const dm = await all((f, t) => db.from(g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches').select('dual_meet_id, weight_class, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id').order('id').range(f, t))
  for (const b of dm) for (const [w, s] of [[b.wrestler_a_id, b.school_a_id], [b.wrestler_b_id, b.school_b_id]]) if (w && W.has(w)) { const p = P(w); if (s) p.schools.add(s); p.ev.add('D' + b.dual_meet_id); p.wts.add(b.weight_class); p.n++ }
  const tg = new Set((await db.from('tournaments').select('id').eq('gender', g)).data!.map((t: any) => t.id))
  for (const e of await all((f, t) => db.from('tournament_entries').select('tournament_id, wrestler_id, school_id').order('id').range(f, t))) if (tg.has(e.tournament_id) && W.has(e.wrestler_id)) { const p = P(e.wrestler_id); if (e.school_id) p.schools.add(e.school_id); p.ev.add('E' + e.tournament_id); p.n++ }
  const al = await all((f, t) => db.from('wrestler_name_aliases').select('wrestler_id, school_id, raw_name').order('id').range(f, t))
  for (const a of al) if (W.has(a.wrestler_id)) P(a.wrestler_id).schools.add(a.school_id)
  const pairs = new Map<string, string[]>()
  const byName = new Map<string, any[]>(); for (const w of ws) { if (w.first_name === 'Unknown') continue; const k = key(w.first_name + w.last_name); if (k.length < 4) continue; (byName.get(k) ?? byName.set(k, []).get(k)!).push(w) }
  for (const grp of byName.values()) for (let i = 0; i < grp.length; i++) for (let j = i + 1; j < grp.length; j++) pairs.set([grp[i].id, grp[j].id].sort().join('|'), ['same full name'])
  // backfill holds: raw name at a school owned by another profile, while this profile has bouts there under that name
  const owner = new Map(al.map((a: any) => [`${a.raw_name}|${a.school_id}`, a.wrestler_id]))
  for (const b of tb) for (const [w, s, rawKey] of [[b.wrestler1_id, b.wrestler1_school_id, 'x'], [b.wrestler2_id, b.wrestler2_school_id, 'y']]) void rawKey
  const held = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_name_links_backfill_added.json', 'utf8')).held as string[]
  for (const h of held) { const m = h.match(/^([MF]) (.+?) @ (.+?): "(.+)" at this school is linked to ([0-9a-f]{8})$/); if (!m || m[1] !== g) continue
    const sid = [...names].find(([, n]) => n === m[3])?.[0]; const o = [...W.keys()].find(id => id.startsWith(m[5])); const me = ws.find((w: any) => key(w.first_name + w.last_name) === key(m[2]) && P(w.id).schools.has(sid))
    if (o && me) pairs.set([o, me.id].sort().join('|'), ['name at school linked to the other']) }
  for (const [k, why] of pairs) {
    const [a, b] = k.split('|'); const A = W.get(a), B = W.get(b), pa = P(a), pb = P(b)
    const common = [...pa.schools].filter(s => pb.schools.has(s))
    const shared = [...pa.ev].filter(x => pb.ev.has(x)).length
    const wa = [...pa.wts], wb = [...pb.wts]
    const wtGap = wa.length && wb.length ? Math.min(...wa.flatMap(x => wb.map(y => Math.abs(x - y)))) : 0
    const gradeGap = A.grade && B.grade ? Math.abs(RANK[A.grade] - RANK[B.grade]) : 0
    const reasons: string[] = []
    if (!common.length) reasons.push('no common school')
    if (shared) reasons.push(`${shared} shared events`)
    if (wtGap > 20) reasons.push(`weights ${wtGap} lb apart`)
    if (gradeGap > 1) reasons.push(`grades ${A.grade}/${B.grade}`)
    if (A.is_oos !== B.is_oos) reasons.push('one out of state')
    out.push({ g, why: why[0], a, b, A: `${A.first_name}|${A.last_name} (${A.grade ?? '-'}, ${pa.n} rec)`, B: `${B.first_name}|${B.last_name} (${B.grade ?? '-'}, ${pb.n} rec)`, school: common.map(s => names.get(s)).join('/'), ok: reasons.length === 0, reasons })
  }
}
const ok = out.filter(o => o.ok), no = out.filter(o => !o.ok && !o.reasons.includes('no common school'))
console.log(`candidate pairs ${out.length}: pass ${ok.length}, fail with a common school ${no.length}, different schools (different people) ${out.length - ok.length - no.length}`)
for (const o of ok) console.log(`PASS ${o.g} ${o.A} = ${o.B} @ ${o.school} [${o.why}]`)
for (const o of no) console.log(`HOLD ${o.g} ${o.A} = ${o.B} @ ${o.school} — ${o.reasons.join(', ')}`)
fs.writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/dup_candidates.json', JSON.stringify(out))
