// Girls 2024-25 postseason, step 1 (2026-11-09): the bouts the load never stored whose two wrestlers already
// have entries. The 2024-25 girls regions (134-137) and State (138) were loaded from Round 2 on, with no region
// 3rd place bouts. From the TrackWrestling exports (Whizzer Upload/Match Data/2025 Girls Region Data.py,
// 2025 Girls State Data.py):
//   * State Round 1 bouts
//   * region 3rd place bouts
// Bouts with a wrestler who has no entry (the region Round 1 losers; Keyra Huastitlan Reyes at State) are left
// for step 2, which adds the entries. Region sections are paired with the stored tournament that has the most
// of their wrestlers' names (the export headers read "Region 1/2/4" and "District 3"). Writes the migration;
// read-only otherwise.
//   npx tsx --tsconfig tsconfig.json scripts/build_girls_2025_r1_and_thirds.mts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }
const DIR = '../Whizzer Upload/Match Data'
const norm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '')
const lastOf = (s: string) => norm(s.trim().split(/\s+/).slice(-1)[0] ?? '')
const FILLER = /^(|([A-Z*] )?Forfeit( [A-Z]| Forfeit)?|Bye( Bye)?)$/i

function result(d: string) {
  const time = (t: string) => { const [mm, ss] = t.split(':').map(Number); return mm * 60 + ss }
  let m: RegExpMatchArray | null
  if ((m = d.match(/^(?:SV-1|TB-1|UTB|SV-2) \(Fall\) (\d+:\d+)/))) return { win_type: 'FALL', fall_time_seconds: time(m[1]), winner_score: null, loser_score: null }
  if ((m = d.match(/^Fall (\d+:\d+)/))) return { win_type: 'FALL', fall_time_seconds: time(m[1]), winner_score: null, loser_score: null }
  if ((m = d.match(/^TF-1\.5 (\d+:\d+)(?:.*?(\d+)-(\d+))?/))) return { win_type: 'TF-1.5', fall_time_seconds: time(m[1]), winner_score: m[2] ? Number(m[2]) : null, loser_score: m[3] ? Number(m[3]) : null }
  if ((m = d.match(/^MD (\d+)-(\d+)/))) return { win_type: 'MD', fall_time_seconds: null, winner_score: Number(m[1]), loser_score: Number(m[2]) }
  if ((m = d.match(/^Dec (\d+)-(\d+)/))) return { win_type: 'DEC', fall_time_seconds: null, winner_score: Number(m[1]), loser_score: Number(m[2]) }
  if ((m = d.match(/^SV-2 (\d+)-(\d+)/))) return { win_type: '2-OT', fall_time_seconds: null, winner_score: Number(m[1]), loser_score: Number(m[2]) }
  if ((m = d.match(/^(SV-1|TB-1|UTB) (\d+)-(\d+)/))) return { win_type: m[1], fall_time_seconds: null, winner_score: Number(m[2]), loser_score: Number(m[3]) }
  if (/^(For\.|M\. For\.)/.test(d)) return { win_type: 'FORF', fall_time_seconds: null, winner_score: null, loser_score: null }
  if (/^Inj\./.test(d)) return { win_type: 'INJ', fall_time_seconds: null, winner_score: null, loser_score: null }
  if (/^DQ/.test(d)) return { win_type: 'DQ', fall_time_seconds: null, winner_score: null, loser_score: null }
  return null
}

type Bout = { round: string; side: string; weight: number; win: string; lose: string; result: string; line: string }
function parse(file: string, wanted: (label: string) => [string, string] | null) {
  const secs: { head: string; bouts: Bout[]; names: Set<string> }[] = []
  let cur: (typeof secs)[number] | null = null, weight = 0
  const seen = new Set<string>()
  for (const raw of fs.readFileSync(`${DIR}/${file}`, 'utf8').split('\n')) {
    const l = raw.trim()
    if (/^(Region|District) \d+$/.test(l)) { cur = { head: l, bouts: [], names: new Set() }; secs.push(cur); continue }
    if (!cur) { cur = { head: '(whole file)', bouts: [], names: new Set() }; secs.push(cur) }
    if (/^\d{3}$/.test(l)) { weight = Number(l); continue }
    const m = l.match(/^([^-]+?) - (.*?) \((.*?)\) [\d-]+ won (?:by|in) .*? over (?:([^()]*?) )?\((.*?)\)(?: [\d-]+)? \((.*)\)$/)
    if (!m) continue
    for (const n of [m[2], m[4] ?? '']) if (n && !FILLER.test(n.trim())) cur.names.add(lastOf(n))
    const w = wanted(m[1].trim()); if (!w) continue
    const k = `${cur.head}|${weight}|${l}`; if (seen.has(k)) continue; seen.add(k)
    cur.bouts.push({ round: w[0], side: w[1], weight, win: m[2].trim(), lose: (m[4] ?? '').trim(), result: m[6], line: l })
  }
  return secs
}

const wcs = new Map((await db.from('weight_classes').select('id, weight').eq('gender', 'F')).data!.map(w => [w.weight, w.id]))
const tours = (await db.from('tournaments').select('id, name, tournament_type').eq('season_id', 2025).eq('gender', 'F')).data!
const cache = new Map<number, { ents: any[]; last: Set<string>; ms: any[] }>()
async function load(id: number) {
  if (!cache.has(id)) {
    const ents = await all((f, to) => db.from('tournament_entries').select('id, weight_class_id, wrestlers(first_name, last_name)').eq('tournament_id', id).range(f, to))
    const ms = await all((f, to) => db.from('matches').select('round, weight_class_id, winner_entry_id, loser_entry_id').eq('tournament_id', id).range(f, to))
    cache.set(id, { ents, last: new Set(ents.map((e: any) => norm(e.wrestlers?.last_name ?? ''))), ms })
  }
  return cache.get(id)!
}

const rows: any[] = [], waiting: string[] = [], problems: string[] = []
const jobs: [string, string, (l: string) => [string, string] | null][] = [
  ['2025 Girls State Data.py', 'girls_state', l => (/^Champ\. Round 1\b/.test(l) ? ['R1', 'championship'] : null)],
  ['2025 Girls Region Data.py', 'girls_regions', l => (/^3rd Place\b/.test(l) ? ['3rd_Place', 'consolation'] : null)],
]
const summary: string[] = []
for (const [file, type, wanted] of jobs) {
  const ts = tours.filter(t => t.tournament_type === type)
  for (const sec of parse(file, wanted)) {
    const scored = await Promise.all(ts.map(async t => ({ t, n: [...sec.names].filter(x => true && (cache.get(t.id) ?? null) !== undefined).length })))
    void scored
    let best = ts[0], bestN = -1
    for (const t of ts) { const s = await load(t.id); const n = [...sec.names].filter(x => s.last.has(x)).length; if (n > bestN) { best = t; bestN = n } }
    const st = await load(best.id)
    let added = 0, wait = 0
    for (const b of sec.bouts) {
      const wc = wcs.get(b.weight)!
      const entry = (name: string) => { const c = st.ents.filter((e: any) => e.weight_class_id === wc && norm(`${e.wrestlers?.first_name}${e.wrestlers?.last_name}`) === norm(name)); return c.length === 1 ? c[0] : null }
      const W = entry(b.win), L = FILLER.test(b.lose) ? null : entry(b.lose), r = result(b.result)
      if (!r) { problems.push(`${best.name} ${b.weight} ${b.round}: result not read — ${b.line.slice(0, 120)}`); continue }
      if (!W || (!L && !FILLER.test(b.lose))) { wait++; waiting.push(`${best.name.replace('Girl_s ', '')} ${b.weight} ${b.round}: ${b.win}${W ? '' : ' (no entry)'} over ${b.lose}${L || FILLER.test(b.lose) ? '' : ' (no entry)'}`); continue }
      const dup = st.ms.some((m: any) => m.weight_class_id === wc && m.round === b.round && m.winner_entry_id === W.id && (m.loser_entry_id ?? null) === (L?.id ?? null))
      if (dup) { problems.push(`${best.name} ${b.weight} ${b.round}: already stored — ${b.line.slice(0, 100)}`); continue }
      rows.push({ tournament_id: best.id, weight_class_id: wc, bracket_side: b.side, round: b.round, winner_entry_id: W.id, loser_entry_id: L?.id ?? null, ...r, src: `${best.name.replace('Girl_s ', '')} ${b.weight} ${b.round}: ${b.line.replace(/^[^-]+ - /, '').slice(0, 120)}` })
      added++
    }
    summary.push(`${file.replace('.py', '')} ${sec.head} → ${best.name.replace('Girl_s ', '')} (${bestN}/${sec.names.size} names): ${sec.bouts.length} bouts; ready ${added}; waiting for an entry ${wait}`)
  }
}
console.log(summary.join('\n'))
console.log(`\nready ${rows.length}; waiting ${waiting.length}; problems ${problems.length}`)
if (waiting.length) console.log('waiting:\n  ' + waiting.join('\n  '))
if (problems.length) console.log('problems:\n  ' + problems.join('\n  '))

const q = (v: any) => v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`
const tids = [...new Set(rows.map(r => r.tournament_id))].sort()
const count = (k: string) => rows.filter(r => r.round === k).length
const OUT = 'docs/migrations/20261109_girls_2025_state_r1_region_thirds.sql'
const sql = `-- Girls 2024-25 postseason, step 1: State Round 1 and region 3rd place bouts (2026-11-09)
--
-- The 2024-25 girls regions (134-137) and State (138) were loaded from Round 2 on, with no region 3rd place
-- bouts. These are the missing bouts whose two wrestlers already have entries, from the TrackWrestling exports
-- (Whizzer Upload/Match Data/2025 Girls Region|State Data.py), built by scripts/build_girls_2025_r1_and_thirds.mts.
-- State Round 1: ${count('R1')}; region 3rd place: ${count('3rd_Place')}. The bouts with a wrestler who has no entry
-- (${waiting.length}) wait for step 2. Each bout is checked not already stored.
-- ROLLBACK: DELETE FROM matches WHERE (tournament_id = 138 AND round = 'R1') OR (tournament_id IN (134, 135, 136, 137) AND round = '3rd_Place');
--           (no such rows existed before this migration)
-- Run in the Supabase SQL editor.

DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM matches WHERE (tournament_id = 138 AND round = 'R1') OR (tournament_id IN (134, 135, 136, 137) AND round = '3rd_Place')) THEN
    RAISE EXCEPTION 'State Round 1 or region 3rd place bouts already exist; migration already applied?';
  END IF;

  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, validated)
  VALUES
${rows.map(r => `    -- ${r.src.replace(/'/g, '')}\n    (${r.tournament_id}, ${r.weight_class_id}, '${r.bracket_side}', '${r.round}', '${r.winner_entry_id}', ${q(r.loser_entry_id)}, '${r.win_type}', ${q(r.winner_score)}, ${q(r.loser_score)}, ${q(r.fall_time_seconds)}, true)`).join(',\n')};
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} bouts, got %', n; END IF;
END $$;

-- Verify: State R1 ${count('R1')}; 3rd place per region
SELECT t.name, m.round, count(*) FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE (m.tournament_id = 138 AND m.round = 'R1') OR (m.tournament_id IN (134, 135, 136, 137) AND m.round = '3rd_Place')
GROUP BY t.name, m.round ORDER BY t.name;
`
void tids
if (problems.length === 0 && rows.length) { fs.writeFileSync(OUT, sql); console.log(`wrote ${OUT}`) } else console.log('not written')
