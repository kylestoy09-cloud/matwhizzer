// DRY RUN — read each GT file's first round (bracket order, byes included) and check it against the stored bouts.
// Nothing is written. Usage: npx tsx --env-file=.env.local scripts/.local/gtdraw.mts <gt dir>
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const dir = process.argv[2]
const FILES: { file: string; season: number; gender: 'M' | 'F'; kind: 'district' | 'region' | 'state'; size: number }[] = [
  { file: 'gt_s1_districts.txt', season: 2025, gender: 'M', kind: 'district', size: 16 },
  { file: 'gt_s2_districts.txt', season: 2026, gender: 'M', kind: 'district', size: 16 },
  { file: 'gt_s2_girls_districts.txt', season: 2026, gender: 'F', kind: 'district', size: 32 },
  { file: 'gt_s1_regions.txt', season: 2025, gender: 'M', kind: 'region', size: 16 },
  { file: 'gt_s2_regions.txt', season: 2026, gender: 'M', kind: 'region', size: 16 },
  { file: 'gt_s1_girls_regions.txt', season: 2025, gender: 'F', kind: 'region', size: 32 },
  { file: 'gt_s2_girls_regions.txt', season: 2026, gender: 'F', kind: 'region', size: 16 },
  { file: 'gt_s1_state.txt', season: 2025, gender: 'M', kind: 'state', size: 32 },
  { file: 'gt_s2_state.txt', season: 2026, gender: 'M', kind: 'state', size: 32 },
  { file: 'gt_s1_girls_state.txt', season: 2025, gender: 'F', kind: 'state', size: 16 },
  { file: 'gt_s2_girls_state.txt', season: 2026, gender: 'F', kind: 'state', size: 16 },
]
type P = { name: string; school: string } | null
// a nickname in parentheses is ignored ("Charles (CJ) Palmisano")
const norm = (s: string) => s.replace(/\([^)]*\)/g, ' ').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')
const nameParts = (n: string) => n.replace(/\([^)]*\)/g, ' ').trim().split(/\s+/)
// the school is the last parenthesized group before the record, its parentheses balanced ("West Morris ( Mendham)");
// a nickname in the name stays in the name ("Charles (CJ) Palmisano")
const PERSON = String.raw`(.+?) \(((?:[^()]|\([^()]*\))*)\) \d+-\d+(?:-\d+)?`
const BYE = new RegExp(String.raw`^Champ\.? Round 1 - (?:${PERSON}|\(\)|.*?) ?received a bye`)
const BOUT = new RegExp(String.raw`^Champ\.? Round 1 - ${PERSON} won .*? over ${PERSON} \(`)
const QF = new RegExp(String.raw`^Quarterfinal - ${PERSON} won .*? over ${PERSON} \(`)
const ghost = (n: string | undefined) => !n || !n.trim() || /\bfore?f?e?it\b/i.test(n)   // Forfeit, Forefit, Foreit
/** unit (District 3 / Region 2 / state) → weight → pairs in bracket order */
function parse(text: string, kind: string) {
  const out = new Map<string, Map<number, [P, P][]>>(), qf = new Map<string, Map<number, [P, P][]>>()
  let unitSeq = 0
  let unit = kind === 'state' ? 'state' : '', inR1 = false, weight = 0
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\t/g, ' ').trim()
    const u = /^(District|Region) (\d+)$/.exec(line); if (u) { unit = u[2]; inR1 = false; continue }
    if (/^(Champ\.? )?Round 1( \(\d+ Man\))?$|^Preliminaries$/.test(line)) { inR1 = true; if (kind === 'district' && !/^\d+$/.test(unit)) unit = `#${++unitSeq}`; else if (unit.startsWith('#')) unit = `#${++unitSeq}`; continue }
    const q = QF.exec(line)
    if (q && weight) { if (!qf.has(unit)) qf.set(unit, new Map()); const w = qf.get(unit)!; if (!w.has(weight)) w.set(weight, []); const pr: [P, P] = [{ name: q[1].trim(), school: q[2] }, { name: q[3].trim(), school: q[4] }]; if (!w.get(weight)!.some(x => x[0]!.name === pr[0]!.name && x[1]!.name === pr[1]!.name)) w.get(weight)!.push(pr); continue }
    if (/^\d{3}$/.test(line)) { weight = Number(line); continue }
    if (!line.startsWith('Champ') ) { if (inR1 && line && !/^\d/.test(line)) inR1 = /^Champ/.test(line); continue }
    if (!inR1 || !/^Champ\.? Round 1 - /.test(line)) continue
    const key = unit; if (!out.has(key)) out.set(key, new Map())
    const w = out.get(key)!; if (!w.has(weight)) w.set(weight, [])
    let pair: [P, P] | null = null
    const b = BOUT.exec(line), y = BYE.exec(line)
    if (b) pair = [ghost(b[1]) ? null : { name: b[1].trim(), school: b[2] }, ghost(b[3]) ? null : { name: b[3].trim(), school: b[4] }]
    else if (y) pair = [ghost(y[1]) ? null : { name: y[1].trim(), school: y[2] }, null]
    if (pair) w.get(weight)!.push(pair)
  }
  return { out, qf }
}
const rpc = (kind: string, gender: string, unit: string, weight: number, season: number) =>
  kind === 'state' ? db.rpc('state_bracket', { p_weight: weight, p_gender: gender, p_season: season })
  : kind === 'region' ? (gender === 'F' ? db.rpc('girls_region_bracket', { p_region: Number(unit), p_weight: weight, p_season: season }) : db.rpc('region_bracket', { p_region: Number(unit), p_weight: weight, p_gender: 'M', p_season: season }))
  : db.rpc('district_bracket', { p_district: Number(unit), p_weight: weight, p_gender: gender, p_season: season })
const summary: string[] = []
for (const F of FILES) {
  const { out: parsed, qf: qfs } = parse(fs.readFileSync(`${dir}/${F.file}`, 'utf8'), F.kind)
  let brackets = 0, good = 0, placedN = 0, boutsOk = 0; const bad: string[] = []
  const jobs: [string, number, [P, P][]][] = []
  for (const [unit, ws] of parsed) for (const [w, pairs] of ws) {
    // a first round listing only its bouts (no byes): the draw from the quarterfinals' order, each first-round bout
    // under its winner's quarterfinal (which line a bye takes inside a quarter isn't in the text)
    let pr = pairs
    const q = qfs.get(unit)?.get(w)
    if (pairs.length * 2 < F.size && q && q.length === F.size / 4 && F.size === 16) {
      const r1 = pairs.filter(x => x[0] && x[1])
      const fromR1 = (p: P) => r1.find(x => x[0] && p && norm(x[0].name) === norm(p.name))
      pr = q.flatMap(([a, b]) => [a, b].map(p => fromR1(p) ?? ([p, null] as [P, P])))
    }
    // a district file whose district headers stop (2024-25 after District 20): one block holds several districts'
    // brackets in a row — cut it into bracket-sized pieces, each matched to its district by name below
    if (F.kind === 'district' && pr.length > F.size / 2) { for (let c = 0; c * F.size / 2 < pr.length; c++) jobs.push([`#${unit}.${c}`, w, pr.slice(c * F.size / 2, (c + 1) * F.size / 2)]) }
    else jobs.push([unit, w, pr])
  }
  // a district file without district labels: each section is matched to the district whose wrestlers it holds
  if (F.kind === 'district' && jobs.some(j => j[0].startsWith('#'))) {
    const nDist = F.gender === 'M' ? 32 : 12
    const weights = [...new Set(jobs.map(j => j[1]))]
    const names = new Map<string, Set<string>>()
    for (const w of weights) for (let d = 1; d <= nDist; d += 8) {
      const res = await Promise.all(Array.from({ length: Math.min(8, nDist - d + 1) }, (_, k) => rpc('district', F.gender, String(d + k), w, F.season).then(r => ({ d: d + k, r }))))
      for (const { d: dd, r } of res) names.set(`${dd}|${w}`, new Set(((r.data ?? []) as any[]).flatMap(m => [m.winner_name, m.loser_name]).filter(Boolean).map(norm)))
    }
    for (const j of jobs) if (j[0].startsWith('#')) {
      const mine = j[2].flat().filter(Boolean).map(p => norm(p!.name))
      let best = '', score = 0
      for (let d = 1; d <= nDist; d++) { const set = names.get(`${d}|${j[1]}`); const sc = set ? mine.filter(n => set.has(n)).length : 0; if (sc > score) { score = sc; best = String(d) } }
      if (best && score >= Math.max(2, mine.length * 0.6)) j[0] = best
    }
  }
  for (let i = 0; i < jobs.length; i += 20) {
    const res = await Promise.all(jobs.slice(i, i + 20).map(async ([unit, w, pairs]) => ({ unit, w, pairs, r: await rpc(F.kind, F.gender, unit, w, F.season) })))
    for (const { unit, w, pairs, r } of res) {
      brackets++
      const label = `${F.kind} ${unit} ${w}`, probs: string[] = []
      const rows = (r.data ?? []) as any[]
      if (r.error) { bad.push(`${label}: ${r.error.message}`); continue }
      const size = Math.max(F.size, 2 ** Math.ceil(Math.log2(pairs.length * 2)))
      // entries in our data: everyone in this weight's bracket rows
      const ents = new Map<string, { name: string; school: string }>()
      for (const m of rows) { if (m.winner_entry_id) ents.set(m.winner_entry_id, { name: m.winner_name ?? '', school: m.winner_school_name ?? '' }); if (m.loser_entry_id) ents.set(m.loser_entry_id, { name: m.loser_name ?? '', school: m.loser_school_name ?? '' }) }
      const E = [...ents].map(([id, e]) => ({ id, ...e }))
      const pos = new Map<string, number>()
      pairs.forEach((pr, i) => pr.forEach((s, j) => {
        if (!s) return
        const sameSchool = (e: any) => norm(e.school).slice(0, 5) === norm(s.school).slice(0, 5)
        // a name cut short on either side (Track prints "Christophe", our data holds "Guadalup Roque-Bartol")
        const prefix = (e: any) => { const a = nameParts(s.name), b = nameParts(e.name); return a.length === b.length && a.every((x, k) => { const u = norm(x), v = norm(b[k]); return Math.min(u.length, v.length) >= 3 && (u.startsWith(v) || v.startsWith(u)) }) }
        const full = E.filter(e => norm(e.name) === norm(s.name))
        const byLast = E.filter(e => sameSchool(e) && norm(nameParts(e.name).slice(-1)[0]) === norm(nameParts(s.name).slice(-1)[0]))
        // same first name, last name cut short at either end ("Vanessa B Aguilar Arango" / "Vanessa Aguilar Aran")
        const firstLast = (e: any) => { const a = nameParts(s.name), b = nameParts(e.name); const u = norm(a.slice(-1)[0]), v = norm(b.slice(-1)[0]); return norm(a[0]) === norm(b[0]) && Math.min(u.length, v.length) >= 3 && (u.startsWith(v) || v.startsWith(u)) }
        const pre = E.filter(prefix)
        const hit = full.length ? full : byLast.length ? byLast : pre.length ? pre : E.filter(firstLast)
        // a name with no school never wrestled (no entry made): nothing to place
        if (!hit.length && !s.school.trim()) return
        if (hit.length !== 1) { if (rows.length) probs.push(`pair ${i + 1} "${s.name} (${s.school})": ${hit.length} matches`); return }
        if (pos.has(hit[0].id)) { probs.push(`"${s.name}" twice`); return }
        pos.set(hit[0].id, 2 * i + j)
      }))
      const wrestled = new Set(rows.flatMap(m => (m.winner_name && m.loser_name) ? [m.winner_entry_id, m.loser_entry_id] : []))
      const missing = E.filter(e => !pos.has(e.id) && wrestled.has(e.id))
      if (missing.length) probs.push(`wrestled but not in the GT first round: ${missing.map(e => e.name).join(', ')}`)
      const D = Math.log2(size)
      const colOf = (r: string) => ({ F: D - 1, SF: D - 2, QF: D - 3 } as Record<string, number>)[r] ?? (r === 'R2' ? (D >= 5 ? D - 4 : 0) : r === 'R1' ? 0 : -1)
      let ok = 0
      for (const m of rows.filter(m => m.bracket_side === 'championship' && m.winner_name && m.loser_name && m.round !== '2nd_Place_Match')) {
        const k = colOf(m.round); if (k < 0) { probs.push(`round ${m.round}?`); continue }
        const a = pos.get(m.winner_entry_id), c = pos.get(m.loser_entry_id); if (a == null || c == null) continue
        const blk = 2 ** (k + 1)
        if (Math.floor(a / blk) !== Math.floor(c / blk) || Math.floor(a / (blk / 2)) === Math.floor(c / (blk / 2))) probs.push(`${m.round} ${m.winner_name} v ${m.loser_name} off the draw (${a + 1}, ${c + 1}; ${size}-line)`)
        else ok++
      }
      boutsOk += ok
      if (!rows.length) probs.push('no bouts on file')
      if (probs.length) bad.push(`${label}: ${probs.slice(0, 3).join(' | ')}`)
      else { good++; placedN += pos.size }
    }
  }
  summary.push(`${F.file}: ${good}/${brackets} brackets match (${placedN} wrestlers placed, ${boutsOk} bouts agree)`)
  if (bad.length) summary.push(...bad.slice(0, 6).map(x => '   ' + x), bad.length > 6 ? `   … ${bad.length - 6} more` : '')
}
console.log(summary.filter(Boolean).join('\n'))
