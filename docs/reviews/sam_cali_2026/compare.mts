// Sam Cali: Flo bracket PDF bouts vs stored bouts. npx tsx compare.mts boys|girls
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const G = process.argv[2] as 'boys' | 'girls'
const S = '/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/samcali'
const T = G === 'boys' ? 'd046f392-9128-4755-8584-528ca5336281' : 'ca6174aa-a4e2-4092-be6f-774813d2e6bb'
const pdf = JSON.parse(fs.readFileSync(`${S}/${G}.json`, 'utf8'))
const norm = (s: string) => (s ?? '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')
const { data: stored } = await db.from(G === 'boys' ? 'tournament_bouts' : 'tournament_bouts_girls').select('id, weight_class, round, winner, result_type, result_detail, fall_time_seconds, wrestler1_id, wrestler1_name_raw, wrestler1_school_raw, wrestler2_id, wrestler2_name_raw, wrestler2_school_raw, w1:wrestlers!wrestler1_id(first_name,last_name), w2:wrestlers!wrestler2_id(first_name,last_name)').eq('in_season_tournament_id', T).limit(5000)
const full = (w: any, raw: string) => w ? `${w.first_name} ${w.last_name}` : raw
// roster per weight: full names from first-round lines
const out: any = { matched: [], pdfOnly: [], storedOnly: [], roster: {} }
const used = new Set<string>()
for (const [wk, W] of Object.entries<any>(pdf)) {
  const weight = Number(wk)
  const roster: { name: string; team: string; seed: number | null }[] = []
  for (const b of W.bouts) for (const s of [b.top, b.bottom]) if (s && s.name.split(' ').length >= 2 && !roster.some(r => r.name === s.name && r.team === s.team)) {
    // a full name is one whose last part matches a later short line; keep anything with 2+ words from the first column
  }
  const first = ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter-Finals'].find(r => W.bouts.some((b: any) => b.round === r))
  const firstRound = W.bouts.filter((b: any) => b.round === first)
  for (const b of firstRound) for (const s of [b.top, b.bottom]) if (s) roster.push({ name: s.name, team: s.team, seed: s.seed })
  out.roster[weight] = roster
  const resolve = (s: any) => {
    if (!s) return null
    if (s.seed != null) { const r = roster.find(r => r.seed === s.seed); if (r) return r }
    const c = roster.filter(r => norm(r.name).endsWith(norm(s.name)) && (!s.team || !r.team || norm(r.team).startsWith(norm(s.team).slice(0, 3)) || norm(s.team).startsWith(norm(r.team).slice(0, 3))))
    return c.length === 1 ? c[0] : null
  }
  const sw = (stored ?? []).filter(x => x.weight_class === weight)
  const nameOf = (x: any, k: 1 | 2) => full(x[`w${k}`], x[`wrestler${k}_name_raw`])
  const lev = (a: string, b: string) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length] }
  // same person: same last name (or one contains the other: "Velez" / "Velez Intriago", or 2 letters off: Sgrulletta /
  // Sgurletta) and first names agreeing in the first letter or one a nickname-length prefix (PJ / Peter, Drew / Andrew)
  const same = (a: string, b: string) => { const A = a.trim().split(/\s+/), B = b.trim().split(/\s+/); const la = norm(A.slice(1).join('')), lb = norm(B.slice(1).join('')); const fa = norm(A[0]), fb = norm(B[0])
    const lastOk = la === lb || (la.length > 3 && lb.length > 3 && (la.startsWith(lb) || lb.startsWith(la))) || lev(la, lb) <= 2
    const firstOk = fa[0] === fb[0] || fa.endsWith(fb) || fb.endsWith(fa) || lev(fa, fb) <= 2
    return lastOk && firstOk ? 2 : lastOk ? 1 : 0 }
  // a pair: both last names agree and at least one first name (Buddha / Navell Washington against Matthew Sutton)
  const pairOk = (x1: string, x2: string, y1: string, y2: string) => { const a = same(x1, y1), b = same(x2, y2); return a > 0 && b > 0 && a + b >= 3 }
  for (const b of W.bouts) {
    if (!b.top || !b.bottom || b.result === 'NC') { if (b.top && b.bottom) out.pdfOnly.push({ weight, round: b.round, match: b.match, top: b.top.name, bottom: b.bottom.name, result: 'NC' }); continue }
    const r1 = resolve(b.top), r2 = resolve(b.bottom)
    if (!r1 || !r2) { out.pdfOnly.push({ weight, round: b.round, match: b.match, why: 'unresolved', top: b.top, bottom: b.bottom }); continue }
    const winName = b.winner === 1 ? r1.name : r2.name
    const cands = sw.filter(x => !used.has(x.id) && (pairOk(nameOf(x, 1), nameOf(x, 2), r1.name, r2.name) || pairOk(nameOf(x, 1), nameOf(x, 2), r2.name, r1.name)))
    const rec = { weight, round: b.round, match: b.match, top: `${r1.seed ?? '-'} ${r1.name} (${r1.team})`, bottom: `${r2.seed ?? '-'} ${r2.name} (${r2.team})`, win: winName, result: b.result }
    if (!cands.length) { out.pdfOnly.push(rec); continue }
    const x = cands[0]; used.add(x.id)
    const storedWin = x.winner === 1 ? nameOf(x, 1) : x.winner === 2 ? nameOf(x, 2) : null
    out.matched.push({ ...rec, id: x.id, storedRound: x.round, storedWin, storedResult: `${x.result_type} ${x.result_detail ?? ''} ${x.fall_time_seconds ?? ''}`.trim(), winnerOk: storedWin ? same(storedWin, winName) > 0 : false })
  }
}
for (const x of stored ?? []) if (!used.has(x.id)) out.storedOnly.push({ id: x.id, weight: x.weight_class, round: x.round, a: full((x as any).w1, x.wrestler1_name_raw), as: x.wrestler1_school_raw, b: full((x as any).w2, x.wrestler2_name_raw), bs: x.wrestler2_school_raw, winner: x.winner, res: `${x.result_type} ${x.result_detail ?? ''}` })
fs.writeFileSync(`${S}/${G}_compare.json`, JSON.stringify(out, null, 1))
console.log(`${G}: pdf bouts matched ${out.matched.length}; winner differs ${out.matched.filter((m: any) => !m.winnerOk).length}; pdf only ${out.pdfOnly.length} (unresolved ${out.pdfOnly.filter((p: any) => p.why).length}); stored only ${out.storedOnly.length}`)
