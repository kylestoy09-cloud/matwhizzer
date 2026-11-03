// Girls 2025-26 Region 1: the final, consolation semifinals and 3rd / 5th place bouts are missing
// (2026-11-02). The TrackWrestling text export stops partway through Region 1, so they come from
// the final bracket PDFs (../2026_girls_region_final/Region 1/<weight> Bracket.pdf). This reads the
// word positions (via pdfplumber), matches each name ("Last, ABBR", last names cut at ~10 letters)
// to her Region 1 entry at that weight, prints every bout, and writes the INSERT migration.
//   npx tsx --tsconfig tsconfig.json scripts/build_girls_region1_place_bouts.mts
// Layout (TrackWrestling 16-wrestler bracket, right side): place bouts are anchored by the
// "1ST" / "3RD" / "5TH" labels; the winner is the name in the far-right column just above, the
// result sits between it and the bout number, and the two wrestlers are the nearest names in the
// column to the left, one above and one below the bout number. A consolation semifinal is a bout
// number in the middle column with its winner on the same row and its two wrestlers in the column
// to the left, one above and one below.
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'child_process'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const DIR = '../2026_girls_region_final/Region 1'
const WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]
type Word = { x: number; y: number; t: string }
const PY = `
import sys, json, pdfplumber
p = pdfplumber.open(sys.argv[1]).pages[0]
print(json.dumps([{"x": w["x0"], "y": w["top"], "t": w["text"]} for w in p.extract_words(keep_blank_chars=True, x_tolerance=1.5)]))
`
const words = (f: string): Word[] => JSON.parse(execFileSync('python3', ['-I', '-c', PY, f], { encoding: 'utf8' }))
const isName = (t: string) => /^[A-Za-z][A-Za-z.' `-]*( [A-Za-z.'`-]+)*, [A-Z]{2,5}$/.test(t)
const isResult = (t: string) => /^(Fall \d+:\d+|Dec \d+-\d+|MD \d+-\d+|TF-1\.5 \d+:\d+.*|For\.|M\. For\.|Inj\..*|DQ|SV-1 \d+-\d+|SV-2 \d+-\d+|TB-1 \d+-\d+|UTB \d+-\d+|OT \d+-\d+)$/.test(t)
const near = (a: number, b: number, d: number) => Math.abs(a - b) <= d

const tourn = chk(await db.from('tournaments').select('id').eq('name', 'Girl_s Regions r1').eq('season_id', 2026), 't')[0].id
const wcs = new Map(chk(await db.from('weight_classes').select('id, weight').eq('gender', 'F'), 'wc').map(w => [w.weight, w.id]))
const existing = chk(await db.from('matches').select('round, weight_class_id').eq('tournament_id', tourn), 'm')
if (existing.some(m => ['F', 'C4', '3rd_Place', '5th_Place'].includes(m.round))) throw new Error('Region 1 already has place bouts')

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

const rows: any[] = [], problems: string[] = []
for (const w of WEIGHTS) {
  const wc = wcs.get(w)!
  const ents = chk(await db.from('tournament_entries').select('id, school_context_raw, wrestlers(first_name, last_name)').eq('tournament_id', tourn).eq('weight_class_id', wc), 'e')
  // "Diaz Santo, MHMK" → the entry whose last name starts with "Diaz Santo"
  const entry = (label: string) => {
    const last = label.split(',')[0].trim().toLowerCase().replace(/[`'.]/g, '')
    const c = ents.filter(e => { const l = `${e.wrestlers.last_name}`.toLowerCase().replace(/[`'.]/g, ''); return l.startsWith(last) || last.startsWith(l) })
    return c.length === 1 ? c[0] : null
  }
  const ws = words(`${DIR}/${w} Bracket.pdf`)
  const names = ws.filter(x => isName(x.t))
  const colC = names.filter(x => x.x > 500), colB = names.filter(x => x.x > 425 && x.x < 460), colA = names.filter(x => x.x > 340 && x.x < 380)
  const add = (round: string, side: string, win: Word | undefined, a: Word | undefined, b: Word | undefined, res: Word | undefined, note: string) => {
    if (!win || !a || !b || !res) { problems.push(`${w} ${round}: winner ${win?.t} | ${a?.t} vs ${b?.t} | ${res?.t} (${note})`); return }
    const lose = norm(a.t) === norm(win.t) ? b : norm(b.t) === norm(win.t) ? a : undefined
    const W = entry(win.t), L = lose ? entry(lose.t) : null, r = result(res.t)
    if (!lose || !W || !L || !r) { problems.push(`${w} ${round}: ${win.t} over ${lose?.t} — winner ${W ? 'ok' : 'NO ENTRY'}, loser ${L ? 'ok' : 'NO ENTRY'}, result ${r ? 'ok' : res.t}`); return }
    rows.push({ weight: w, tournament_id: tourn, weight_class_id: wc, bracket_side: side, round, winner_entry_id: W.id, loser_entry_id: L.id, ...r, _src: `${w} ${round}: ${win.t} over ${lose.t} (${res.t})` })
  }
  for (const [label, round] of [['1ST', 'F'], ['3RD', '3rd_Place'], ['5TH', '5th_Place']] as const) {
    const anchor = ws.find(x => x.t === label); if (!anchor) { problems.push(`${w}: no ${label} label`); continue }
    const num = ws.filter(x => /^\d+$/.test(x.t) && x.x > 480 && x.x < 505 && x.y < anchor.y && x.y > anchor.y - 30).sort((p, q) => q.y - p.y)[0]
    const win = colC.filter(x => x.y < (num?.y ?? anchor.y) && x.y > anchor.y - 60).sort((p, q) => q.y - p.y)[0]
    const res = ws.filter(x => isResult(x.t) && x.x > 515 && x.y > (win?.y ?? 0) && x.y < anchor.y + 2).sort((p, q) => p.y - q.y)[0]
    const y0 = num?.y ?? anchor.y
    const above = colB.filter(x => x.y < y0).sort((p, q) => q.y - p.y)[0], below = colB.filter(x => x.y > y0).sort((p, q) => p.y - q.y)[0]
    add(round, round === 'F' ? 'championship' : 'consolation', win, above, below, res, `bout ${num?.t}`)
  }
  // consolation semifinals: middle-column bout numbers between the first consolation rows and the 3RD bout
  const third = ws.find(x => x.t === '3RD')
  const semis = ws.filter(x => /^\d+$/.test(x.t) && x.x > 405 && x.x < 420 && x.y > 300 && third && x.y < third.y + 60)
    .filter(n => colB.some(b => near(b.y, n.y, 6)) && colA.some(a => a.y < n.y) && colA.some(a => a.y > n.y))
    .filter((n, i, arr) => arr.findIndex(m => m.t === n.t) === i)
  for (const n of semis.slice(0, 2)) {
    const win = colB.filter(b => near(b.y, n.y, 6)).sort((p, q) => Math.abs(p.y - n.y) - Math.abs(q.y - n.y))[0]
    const above = colA.filter(a => a.y < n.y).sort((p, q) => q.y - p.y)[0], below = colA.filter(a => a.y > n.y).sort((p, q) => p.y - q.y)[0]
    const res = ws.filter(x => isResult(x.t) && x.x > 440 && x.x < 470 && x.y > n.y - 2 && x.y < n.y + 14)[0]
    add('C4', 'consolation', win, above, below, res, `bout ${n.t}`)
  }
}
function norm(s: string) { return s.toLowerCase().replace(/\s+/g, ' ').trim() }

// cross-check against the bouts already stored: a final pairs the two semifinal winners; a cons.
// semi pairs a semifinal loser with a cons. round 2 (C3) winner; 3rd pairs the cons. semi winners,
// 5th their losers
for (const w of WEIGHTS) {
  const wc = wcs.get(w)!
  const have = existing.filter(m => m.weight_class_id === wc)
  const sf = chk(await db.from('matches').select('winner_entry_id, loser_entry_id').eq('tournament_id', tourn).eq('weight_class_id', wc).eq('round', 'SF'), 'sf')
  const c3 = chk(await db.from('matches').select('winner_entry_id').eq('tournament_id', tourn).eq('weight_class_id', wc).eq('round', 'C3'), 'c3')
  const mine = rows.filter(r => r.weight === w), f = mine.find(r => r.round === 'F'), semis = mine.filter(r => r.round === 'C4')
  const pair = (r: any) => new Set([r.winner_entry_id, r.loser_entry_id])
  const eq = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(x => b.has(x))
  if (f && !eq(pair(f), new Set(sf.map(x => x.winner_entry_id)))) problems.push(`${w} F does not pair the semifinal winners`)
  for (const c of semis) { const sfL = sf.map(x => x.loser_entry_id), c3W = c3.map(x => x.winner_entry_id); const ok = [...pair(c)].filter(x => sfL.includes(x)).length === 1 && [...pair(c)].filter(x => c3W.includes(x)).length === 1; if (!ok) problems.push(`${w} C4 ${c._src} is not a semifinal loser vs a C3 winner`) }
  const t3 = mine.find(r => r.round === '3rd_Place'), t5 = mine.find(r => r.round === '5th_Place')
  if (t3 && semis.length === 2 && !eq(pair(t3), new Set(semis.map(c => c.winner_entry_id)))) problems.push(`${w} 3rd does not pair the cons. semi winners`)
  if (t5 && semis.length === 2 && !eq(pair(t5), new Set(semis.map(c => c.loser_entry_id)))) problems.push(`${w} 5th does not pair the cons. semi losers`)
  void have
}
for (const r of rows) console.log(r._src)
console.log(`\n${rows.length} bouts (F ${rows.filter(r => r.round === 'F').length}, C4 ${rows.filter(r => r.round === 'C4').length}, 3rd ${rows.filter(r => r.round === '3rd_Place').length}, 5th ${rows.filter(r => r.round === '5th_Place').length}); problems ${problems.length}`)
console.log(problems.join('\n'))

const q = (v: any) => v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`
const sql = `-- Girls 2025-26 Region 1: add the final, consolation semifinals and 3rd / 5th place bouts (2026-11-02)
--
-- Region 1 had no bout after the semifinals and cons. round 2, so its page showed no champion or
-- placers (Regions 2-4 are complete). The TrackWrestling text export stops partway through
-- Region 1; these come from the final bracket PDFs (2026_girls_region_final/Region 1), read by
-- scripts/build_girls_region1_place_bouts.mts. Round names follow Regions 2-4: F, C4 (cons. semi),
-- 3rd_Place, 5th_Place.
-- ROLLBACK: DELETE FROM matches WHERE tournament_id = ${tourn} AND round IN ('F','C4','3rd_Place','5th_Place');

DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM matches WHERE tournament_id = ${tourn} AND round IN ('F', 'C4', '3rd_Place', '5th_Place')) THEN
    RAISE EXCEPTION 'Region 1 place bouts already exist; migration already applied?';
  END IF;

  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, validated)
  VALUES
${rows.map(r => `  -- ${r._src}\n  (${r.tournament_id}, ${r.weight_class_id}, '${r.bracket_side}', '${r.round}', '${r.winner_entry_id}', '${r.loser_entry_id}', '${r.win_type}', ${q(r.winner_score)}, ${q(r.loser_score)}, ${q(r.fall_time_seconds)}, true)`).join(',\n')};
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} bouts, got %', n; END IF;
END $$;
`
if (problems.length === 0) { fs.writeFileSync('docs/migrations/20261102_girls_region1_place_bouts.sql', sql); console.log('wrote docs/migrations/20261102_girls_region1_place_bouts.sql') }
else console.log('not written: fix the problems first')
