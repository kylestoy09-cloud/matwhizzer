// Girls 2025-26 Districts 5 and 6: the consolation semifinals are missing (2026-11-09). The TrackWrestling
// text export (Whizzer Upload/Match Data/2026 Girls District Data.py) has no "Cons Semis" section for
// these two districts, so they were never loaded; the other districts have theirs (round C3). This reads
// them from the final bracket PDFs (Whizzer Upload/2025-26 Postseason Brackets/2026 Girls/District N/
// <weight> Bracket.pdf), matches each name ("Last, SCHOOL") to her entry at that weight, checks every
// bout against the stored ones, and writes the INSERT migration only if nothing fails.
//   npx tsx --tsconfig tsconfig.json scripts/build_girls_district_cons_semis.mts
// Layout (TrackWrestling 32-man bracket): the cons. semifinals are the two bout numbers in the middle column
// below the "5TH" label (District 5 numbers them 33 / 34, District 6 116 / 117). The winner is the name
// in the column right of the bout number on about the same line, the result just below it, and the two
// wrestlers are the nearest names in the column to the left, one above and one below the bout number.
// Checks: each cons. semi pairs a semifinal loser with a cons. round 1 (C1) winner; the two winners are
// the stored 3rd place bout's wrestlers and the two losers the 5th place bout's.
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'child_process'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const BASE = '../Whizzer Upload/2025-26 Postseason Brackets/2026 Girls'
const DISTRICTS = [5, 6]
const WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]
type Word = { x: number; y: number; t: string }
const PY = `
import sys, json, pdfplumber
p = pdfplumber.open(sys.argv[1]).pages[0]
print(json.dumps([{"x": w["x0"], "y": w["top"], "t": w["text"]} for w in p.extract_words(keep_blank_chars=True, x_tolerance=1.5)]))
`
const words = (f: string): Word[] => JSON.parse(execFileSync('python3', ['-I', '-c', PY, f], { encoding: 'utf8' }))
const isName = (t: string) => /^[A-Za-z][A-Za-z.' `-]*( [A-Za-z.'`-]+)*, [A-Z]{2,5}$/.test(t)
// an empty bracket slot ("Forfeit, &nbs"): small brackets fill the consolation side with these
const isFiller = (t: string) => /^Forfeit,/.test(t)
const isResult = (t: string) => /^(Fall \d+:\d+|Dec \d+-\d+|MD \d+-\d+|TF-1\.5 \d+:\d+.*|For\.|M\. For\.|Inj\..*|DQ|SV-1 \d+-\d+|SV-2 \d+-\d+|TB-1 \d+-\d+|UTB \d+-\d+|OT \d+-\d+)$/.test(t)
const near = (a: number, b: number, d: number) => Math.abs(a - b) <= d
const norm = (s: string) => s.toLowerCase().replace(/[`'.]/g, '').replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim()

function result(d: string) {
  const time = (t: string) => { const [mm, ss] = t.split(':').map(Number); return mm * 60 + ss }
  let m: RegExpMatchArray | null
  if ((m = d.match(/^Fall (\d+:\d+)/))) return { win_type: 'FALL', fall_time_seconds: time(m[1]), winner_score: null, loser_score: null }
  if ((m = d.match(/^TF-1\.5 (\d+:\d+)(?:.*?(\d+)-(\d+))?/))) return { win_type: 'TF-1.5', fall_time_seconds: time(m[1]), winner_score: m[2] ? Number(m[2]) : null, loser_score: m[3] ? Number(m[3]) : null }
  if ((m = d.match(/^MD (\d+)-(\d+)/))) return { win_type: 'MD', fall_time_seconds: null, winner_score: Number(m[1]), loser_score: Number(m[2]) }
  if ((m = d.match(/^Dec (\d+)-(\d+)/))) return { win_type: 'DEC', fall_time_seconds: null, winner_score: Number(m[1]), loser_score: Number(m[2]) }
  if ((m = d.match(/^SV-2 (\d+)-(\d+)/))) return { win_type: '2-OT', fall_time_seconds: null, winner_score: Number(m[1]), loser_score: Number(m[2]) }
  if ((m = d.match(/^(SV-1|TB-1|UTB|OT) (\d+)-(\d+)/))) return { win_type: m[1] === 'OT' ? 'SV-1' : m[1], fall_time_seconds: null, winner_score: Number(m[2]), loser_score: Number(m[3]) }
  if (/^(For\.|M\. For\.)/.test(d)) return { win_type: 'FORF', fall_time_seconds: null, winner_score: null, loser_score: null }
  if (/^Inj\./.test(d)) return { win_type: 'INJ', fall_time_seconds: null, winner_score: null, loser_score: null }
  if (/^DQ/.test(d)) return { win_type: 'DQ', fall_time_seconds: null, winner_score: null, loser_score: null }
  return null
}

const wcs = new Map(chk(await db.from('weight_classes').select('id, weight').eq('gender', 'F'), 'wc').map(w => [w.weight, w.id]))
const rows: any[] = [], problems: string[] = []
const tids: number[] = []
for (const d of DISTRICTS) {
  const tourn = chk(await db.from('tournaments').select('id').eq('name', `Girl_s Districts District ${d}`).eq('season_id', 2026), 't')[0].id
  tids.push(tourn)
  const already = chk(await db.from('matches').select('id').eq('tournament_id', tourn).eq('round', 'C3'), 'c3')
  if (already.length) throw new Error(`District ${d} already has cons. semifinals (C3)`)
  for (const w of WEIGHTS) {
    const wc = wcs.get(w)!
    const ents = chk(await db.from('tournament_entries').select('id, wrestlers(first_name, last_name)').eq('tournament_id', tourn).eq('weight_class_id', wc), 'e')
    // "Diaz Santo, MHMK" → the entry whose last name starts with "Diaz Santo" (names are cut at ~10 letters)
    // two wrestlers with one last name (two Walkers, Linden 235): take the one the stored bouts say was there
    // (a cons. semi winner wrestled the 3rd place bout, a loser the 5th)
    const entry = (label: string, mustBeIn?: Set<string>) => {
      const last = norm(label.split(',')[0])
      let c = ents.filter(e => { const l = norm(`${e.wrestlers?.last_name ?? ''}`); return l && (l.startsWith(last) || last.startsWith(l)) })
      if (c.length > 1) { const exact = c.filter(e => norm(`${e.wrestlers?.last_name ?? ''}`) === last); if (exact.length) c = exact }   // "Karp" vs "Karpew"
      if (c.length > 1 && mustBeIn) c = c.filter(e => mustBeIn.has(e.id))
      return c.length === 1 ? c[0] : null
    }
    const stored = chk(await db.from('matches').select('round, winner_entry_id, loser_entry_id').eq('tournament_id', tourn).eq('weight_class_id', wc).in('round', ['SF', 'C1', '3rd_Place', '5th_Place']), 'm')
    const file = `${BASE}/District ${d}/${w} Bracket.pdf`
    if (!fs.existsSync(file)) { problems.push(`D${d} ${w}: no PDF`); continue }
    const ws = words(file)
    const names = ws.filter(x => isName(x.t) || isFiller(x.t))
    const colB = names.filter(x => x.x > 425 && x.x < 470), colA = names.filter(x => x.x > 340 && x.x < 385)
    const mine: any[] = []
    const fifth = ws.find(x => x.t === '5TH')
    const nums = fifth ? ws.filter(x => /^\d+$/.test(x.t) && x.x > 400 && x.x < 430 && x.y > fifth.y).sort((p, q) => p.y - q.y) : []
    if (nums.length !== 2) problems.push(`D${d} ${w}: found ${nums.length} cons. semi bout numbers below 5TH`)
    const t3s = stored.find(m => m.round === '3rd_Place'), t5s = stored.find(m => m.round === '5th_Place')
    const in3 = new Set([t3s?.winner_entry_id, t3s?.loser_entry_id].filter(Boolean)), in5 = new Set([t5s?.winner_entry_id, t5s?.loser_entry_id].filter(Boolean))
    for (const n of nums) {
      const num = n.t
      const win = colB.filter(b => near(b.y, n.y, 8)).sort((p, q) => Math.abs(p.y - n.y) - Math.abs(q.y - n.y))[0]
      const above = colA.filter(a => a.y < n.y).sort((p, q) => q.y - p.y)[0], below = colA.filter(a => a.y > n.y).sort((p, q) => p.y - q.y)[0]
      const res = ws.filter(x => isResult(x.t) && x.x > 435 && x.x < 480 && x.y > n.y - 2 && x.y < n.y + 14)[0]
      const lose = win && above && below ? (norm(above.t) === norm(win.t) ? below : norm(below.t) === norm(win.t) ? above : undefined) : undefined
      const W = win ? entry(win.t, in3) : null, L = lose ? entry(lose.t, in5) : null, r = res ? result(res.t) : null
      const src = `D${d} ${w} bout ${num}: ${win?.t} over ${lose?.t} (${res?.t})`
      // empty slot vs empty slot (1-wrestler bracket): not a bout
      if (win && isFiller(win.t)) { console.log(`${src} — empty slots, skipped`); continue }
      // a forfeit win over an empty slot: stored like the other districts' (FORF, no loser)
      if (win && lose && isFiller(lose.t) && W && r?.win_type === 'FORF') {
        mine.push({ tournament_id: tourn, weight_class_id: wc, bracket_side: 'consolation', round: 'C3', winner_entry_id: W.id, loser_entry_id: null, ...r, _src: `${src} [forfeit over an empty slot]` })
        continue
      }
      if (!W || !L || !r) { problems.push(`${src} — winner ${W ? 'ok' : 'NOT MATCHED'}, loser ${L ? 'ok' : 'NOT MATCHED'}, result ${r ? 'ok' : 'NOT READ'} [${above?.t} / ${below?.t}]`); continue }
      mine.push({ tournament_id: tourn, weight_class_id: wc, bracket_side: 'consolation', round: 'C3', winner_entry_id: W.id, loser_entry_id: L.id, ...r, _src: src })
    }
    // checks against the stored bouts
    const sfL = stored.filter(m => m.round === 'SF').map(m => m.loser_entry_id), c1W = stored.filter(m => m.round === 'C1').map(m => m.winner_entry_id)
    const t3 = stored.find(m => m.round === '3rd_Place'), t5 = stored.find(m => m.round === '5th_Place')
    const set = (a: (string | null)[]) => new Set(a.filter(Boolean) as string[])
    const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(x => b.has(x))
    for (const c of mine) {
      if (!c.loser_entry_id) { if (!sfL.includes(c.winner_entry_id) && !c1W.includes(c.winner_entry_id)) problems.push(`${c._src}: winner is not a semifinal loser or cons. round 1 winner`); continue }
      const p = [c.winner_entry_id, c.loser_entry_id]
      if (p.filter(x => sfL.includes(x)).length !== 1 || p.filter(x => c1W.includes(x)).length !== 1) problems.push(`${c._src}: not a semifinal loser vs a cons. round 1 winner`)
    }
    if (mine.length === 2 && mine.every(c => c.loser_entry_id)) {
      if (t3 && !same(set([t3.winner_entry_id, t3.loser_entry_id]), set(mine.map(c => c.winner_entry_id)))) problems.push(`D${d} ${w}: the cons. semi winners are not the 3rd place bout's wrestlers`)
      if (t5 && !same(set([t5.winner_entry_id, t5.loser_entry_id]), set(mine.map(c => c.loser_entry_id)))) problems.push(`D${d} ${w}: the cons. semi losers are not the 5th place bout's wrestlers`)
    }
    rows.push(...mine)
  }
}
for (const r of rows) console.log(r._src)
console.log(`\n${rows.length} bouts; problems ${problems.length}`)
if (problems.length) console.log(problems.join('\n'))

const q = (v: any) => v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`
const OUT = 'docs/migrations/20261109_girls_d5_d6_cons_semis.sql'
const sql = `-- Girls 2025-26 Districts 5 and 6: add the consolation semifinals (2026-11-09)
--
-- The TrackWrestling text export has no "Cons Semis" section for these two districts, so these bouts
-- were never loaded (the other ten districts have theirs, stored as round C3). Read from the final
-- bracket PDFs by scripts/build_girls_district_cons_semis.mts (the two bouts below the 5TH label) and
-- checked against the stored bouts: each pairs a semifinal loser with a cons. round 1 winner, the winners
-- are the 3rd place bout's wrestlers and the losers the 5th place bout's.
-- Expected: ${rows.length} bouts (2 districts x 12 weights x 2, less District 6 235, a one-wrestler bracket).
-- Forfeit wins over an empty bracket slot are stored like the other districts' (FORF, no loser).
-- ROLLBACK: DELETE FROM matches WHERE tournament_id IN (${tids.join(', ')}) AND round = 'C3';

DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM matches WHERE tournament_id IN (${tids.join(', ')}) AND round = 'C3') THEN
    RAISE EXCEPTION 'Districts 5 / 6 already have cons. semifinals; migration already applied?';
  END IF;

  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, validated)
  VALUES
${rows.map(r => `  -- ${r._src}\n  (${r.tournament_id}, ${r.weight_class_id}, '${r.bracket_side}', '${r.round}', '${r.winner_entry_id}', ${q(r.loser_entry_id)}, '${r.win_type}', ${q(r.winner_score)}, ${q(r.loser_score)}, ${q(r.fall_time_seconds)}, true)`).join(',\n')};
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} bouts, got %', n; END IF;
END $$;

-- Verify: District 5 24, District 6 22 (its 235 bracket has one wrestler)
SELECT t.name, count(*) FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE m.tournament_id IN (${tids.join(', ')}) AND m.round = 'C3' GROUP BY t.name ORDER BY t.name;
`
// 48 less District 6 235 (one wrestler: empty slots only)
if (problems.length === 0 && rows.length === 46) { fs.writeFileSync(OUT, sql); console.log(`wrote ${OUT}`) }
else console.log('not written: fix the problems first')
