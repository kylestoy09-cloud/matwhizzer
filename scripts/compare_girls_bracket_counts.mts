// Girls postseason brackets, source vs stored, by count (2026-11-09). Read-only.
// The TrackWrestling exports (Whizzer Upload/Match Data/<year> Girls <level> Data.py) list every bout by
// round and weight. This counts real bouts in each (tournament, weight, round) cell, the export against
// the stored matches, and lists only the cells that differ. Counting avoids the name matching that made
// compare_girls_brackets_20261106.mts report false gaps ("Cristelle" vs "Cristell", "Cons. Semi" vs C3).
// Not bouts: byes, no contests (NC), lines whose sides are bracket filler ("Forfeit A", "Forfeit Forfeit").
// Consolation rounds are counted together (numbering differs by bracket size); championship and place
// rounds are counted one by one. Repeated lines in an export (Region 1 2025-26 repeats sections) count once.
// Each export section is paired with the stored tournament that has the most of its wrestlers' last names
// (the 2024-25 regions file says "Region 1 / Region 2 / District 3 / Region 4"; stored: Central, North 1,
// North 2, South).
//   npx tsx --tsconfig tsconfig.json scripts/compare_girls_bracket_counts.mts [--cells]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const CELLS = process.argv.includes('--cells')
const DIR = '../Whizzer Upload/Match Data'
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }

const FILES: [string, number, string][] = [
  ['2026 Girls District Data.py', 2026, 'districts'],
  ['2026 Girls Region Data.py', 2026, 'girls_regions'],
  ['2026 Girls State Data.py', 2026, 'girls_state'],
  ['2025 Girls Region Data.py', 2025, 'girls_regions'],
  ['2025 Girls State Data.py', 2025, 'girls_state'],
]
const ROUND: [RegExp, string][] = [
  [/^Champ\. Round 1\b/, 'R1'], [/^Champ\. Round 2\b/, 'R2'], [/^Quarterfinal\b/, 'QF'], [/^Semifinal\b/, 'SF'],
  [/^1st Place\b/, 'F'], [/^3rd Place\b/, '3rd_Place'], [/^5th Place\b/, '5th_Place'], [/^7th Place\b/, '7th_Place'], [/^Cons\./, 'CONS'],
]
const roundGroup = (r: string) => (/^C\d+$/.test(r) || r === 'CS' ? 'CONS' : r)
// bracket filler names: "Forfeit", "A Forfeit", "Forfeit B", "Forfeit Forfeit", "Bye Bye", empty
const FILLER = /^(|([A-Z] )?Forfeit( [A-Z]| Forfeit)?|Bye( Bye)?)$/i
const lastName = (s: string) => s.trim().split(/\s+/).slice(-1)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? ''

type Section = { head: string; cells: Map<string, string[]>; names: Set<string> }
function parse(file: string): Section[] {
  const out: Section[] = []
  let cur: Section | null = null, weight = 0
  const seen = new Set<string>()
  for (const raw of fs.readFileSync(`${DIR}/${file}`, 'utf8').split('\n')) {
    const l = raw.trim()
    if (/^(District|Region) \d+$/.test(l)) { cur = { head: l, cells: new Map(), names: new Set() }; out.push(cur); seen.clear(); continue }
    if (!cur) { cur = { head: '(whole file)', cells: new Map(), names: new Set() }; out.push(cur) }
    if (/^\d{3}$/.test(l)) { weight = Number(l); continue }
    const r = ROUND.find(([re]) => re.test(l)); if (!r) continue
    // "over ()" is a forfeit over an empty slot (no name): the loser part is optional
    const m = l.match(/^[^-]+ - (.*?) \((.*?)\) [\d-]+ won (?:by|in) .*? over (?:(.*?) )?\((.*?)\)(?: [\d-]+)? \((.*)\)$/)
    if (!m) continue                                    // byes ("received a bye") and anything unreadable
    const [, win, , loseRaw, , result] = m
    const lose = loseRaw ?? ''
    if (/^NC\b/.test(result) || FILLER.test(win.trim()) && FILLER.test(lose.trim())) continue
    if (FILLER.test(win.trim())) continue
    const key = `${weight}|${l}`; if (seen.has(key)) continue; seen.add(key)
    const cell = `${weight}|${r[1]}`
    cur.cells.set(cell, [...(cur.cells.get(cell) ?? []), l])
    cur.names.add(lastName(win)); if (!FILLER.test(lose.trim())) cur.names.add(lastName(lose))
  }
  return out
}

const tours = (await db.from('tournaments').select('id, name, tournament_type, season_id').eq('gender', 'F')).data!
const wcs = new Map((await db.from('weight_classes').select('id, weight').eq('gender', 'F')).data!.map(w => [w.id, w.weight]))
let totalDiff = 0
for (const [file, season, type] of FILES) {
  if (!fs.existsSync(`${DIR}/${file}`)) { console.log(`(no file: ${file})`); continue }
  const sections = parse(file)
  const ts = tours.filter(t => t.season_id === season && t.tournament_type === type)
  const stored = new Map<number, { cells: Map<string, number>; names: Set<string> }>()
  for (const t of ts) {
    const ents = await all((f, to) => db.from('tournament_entries').select('id, wrestlers(last_name)').eq('tournament_id', t.id).range(f, to))
    const ms = await all((f, to) => db.from('matches').select('round, weight_class_id, win_type, validated').eq('tournament_id', t.id).range(f, to))
    const cells = new Map<string, number>()
    // forfeits count as bouts whether or not a loser is stored (the export sometimes names a wrestler who
    // didn't show where the stored bout has no loser)
    for (const m of ms) { if (m.validated === false || m.win_type === 'BYE') continue; const k = `${wcs.get(m.weight_class_id)}|${roundGroup(m.round)}`; cells.set(k, (cells.get(k) ?? 0) + 1) }
    stored.set(t.id, { cells, names: new Set(ents.map((e: any) => lastName(e.wrestlers?.last_name ?? ''))) })
  }
  for (const sec of sections) {
    // the stored tournament with the most of this section's last names
    const pick = ts.map(t => ({ t, n: [...sec.names].filter(x => stored.get(t.id)!.names.has(x)).length })).sort((a, b) => b.n - a.n)[0]
    if (!pick) { console.log(`${season} ${sec.head}: no stored tournament`); continue }
    const st = stored.get(pick.t.id)!
    const keys = new Set([...sec.cells.keys(), ...st.cells.keys()])
    const diffs = [...keys].map(k => ({ k, src: sec.cells.get(k)?.length ?? 0, db: st.cells.get(k) ?? 0 })).filter(d => d.src !== d.db)
      .sort((a, b) => Number(a.k.split('|')[0]) - Number(b.k.split('|')[0]) || a.k.localeCompare(b.k))
    const srcTotal = [...sec.cells.values()].reduce((s, v) => s + v.length, 0), dbTotal = [...st.cells.values()].reduce((s, v) => s + v, 0)
    totalDiff += diffs.length
    console.log(`${season} ${sec.head} → ${pick.t.name.replace('Girl_s ', '')} (${pick.n}/${sec.names.size} names): export ${srcTotal} bouts, stored ${dbTotal}; cells that differ: ${diffs.length}`)
    if (CELLS) for (const d of diffs) {
      console.log(`     ${d.k.replaceAll('|', ' ')}: export ${d.src}, stored ${d.db}`)
      if (d.src > d.db) for (const l of sec.cells.get(d.k) ?? []) console.log(`        ${l.slice(0, 160)}`)
    }
  }
}
console.log('cells that differ, all files:', totalDiff)
