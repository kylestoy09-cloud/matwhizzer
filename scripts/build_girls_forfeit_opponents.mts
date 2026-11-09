// Girls 2025-26 districts: mark each forfeit win with no loser as over a filler entry or an empty slot
// (matches.forfeit_opponent), from the TrackWrestling export (2026-11-09). Writes one migration.
// TrackWrestling's rule (docs/reviews/trackwrestling_team_scoring.md, boys, 2026-11-05): a forfeit over a
// filler entry ("over A Forfeit (Team Forfeit)", "over Forfeit Forfeit (School)") counts as a contested
// match for bye points; one over an empty slot ("over ()") does not. Both earn the win and the 2 bonus.
// The boys districts were marked on 2026-11-05 (20261105_district_forfeits_and_deductions.sql); the girls
// rows were never marked, so the scoring rules credit byes that TrackWrestling doesn't (District 4).
//   npx tsx --tsconfig tsconfig.json scripts/build_girls_forfeit_opponents.mts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }
const FILE = '../Whizzer Upload/Match Data/2026 Girls District Data.py'
const ROUND: [RegExp, string][] = [[/^Champ\. Round 1\b/, 'R1'], [/^Champ\. Round 2\b/, 'R2'], [/^Quarterfinal\b/, 'QF'], [/^Semifinal\b/, 'SF'], [/^1st Place\b/, 'F'],
  [/^3rd Place\b/, '3rd_Place'], [/^5th Place\b/, '5th_Place'], [/^Cons\. Round 1\b/, 'C1'], [/^Cons\. Semi\b/, 'C3']]
const FILLER = /^(|([A-Z*] )?Forfeit( [A-Z]| Forfeit)?|Bye( Bye)?)$/i
const norm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '')

// export: forfeit wins by a wrestler over a filler entry or an empty slot, per district
const exp = new Map<number, { round: string; weight: number; winner: string; kind: 'filler' | 'empty' }[]>()
let d = 0, weight = 0
const seen = new Set<string>()
for (const raw of fs.readFileSync(FILE, 'utf8').split('\n')) {
  const l = raw.trim()
  const h = l.match(/^District (\d+)$/); if (h) { d = Number(h[1]); exp.set(d, []); continue }
  if (/^\d{3}$/.test(l)) { weight = Number(l); continue }
  if (seen.has(`${d}|${weight}|${l}`)) continue; seen.add(`${d}|${weight}|${l}`)
  const r = ROUND.find(([re]) => re.test(l)); if (!r || !d) continue
  const m = l.match(/^[^-]+ - (.*?) \((.*?)\) [\d-]+ won by forfeit over (?:([^()]*?) )?\((.*?)\)/)   // a name has no brackets: "over ()" is an empty slot
  if (!m || FILLER.test(m[1].trim())) continue
  const lose = (m[3] ?? '').trim(), loseSchool = (m[4] ?? '').trim()
  // a named wrestler forfeited: stored with a loser. A name with no school ("Josephine Lemke ()") is one of
  // the bracket filler names removed on 2026-11-02 (20261102_remove_placeholder_entries.sql): filler
  if (lose && !FILLER.test(lose) && loseSchool) continue
  exp.get(d)!.push({ round: r[1], weight, winner: m[1].trim(), kind: lose ? 'filler' : 'empty' })
}

const wcs = new Map((await db.from('weight_classes').select('id, weight').eq('gender', 'F')).data!.map(w => [w.weight, w.id]))
const set: { id: string; kind: string; src: string }[] = [], problems: string[] = [], summary: string[] = []
for (const [dn, lines] of [...exp].sort((a, b) => a[0] - b[0])) {
  const t = (await db.from('tournaments').select('id').eq('name', `Girl_s Districts District ${dn}`).eq('season_id', 2026).single()).data!
  const ents = await all((f, to) => db.from('tournament_entries').select('id, weight_class_id, wrestlers(first_name, last_name)').eq('tournament_id', t.id).range(f, to))
  const ms = (await all((f, to) => db.from('matches').select('id, round, weight_class_id, winner_entry_id, loser_entry_id, win_type, forfeit_opponent').eq('tournament_id', t.id).range(f, to)))
    .filter((m: any) => m.win_type === 'FORF' && !m.loser_entry_id)
  const full = new Map(ents.map((e: any) => [e.id, norm(`${e.wrestlers?.first_name ?? ''}${e.wrestlers?.last_name ?? ''}`)]))
  const used = new Set<string>()
  const c = { filler: 0, empty: 0 }
  for (const x of lines) {
    const wc = wcs.get(x.weight)!
    let cands = ms.filter((m: any) => !used.has(m.id) && m.weight_class_id === wc && m.round === x.round && full.get(m.winner_entry_id) === norm(x.winner))
    // the export and the profile spell a first name differently ("La`Niyah" / "Niyah"): the one wrestler at the
    // weight with that last name
    if (!cands.length) { const ln = norm(x.winner.split(' ').slice(-1)[0]); cands = ms.filter((m: any) => !used.has(m.id) && m.weight_class_id === wc && m.round === x.round && (full.get(m.winner_entry_id) ?? '').endsWith(ln)) }
    if (cands.length !== 1) { problems.push(`D${dn} ${x.weight} ${x.round} ${x.winner} over ${x.kind}: ${cands.length} stored forfeits match`); continue }
    used.add(cands[0].id); c[x.kind]++
    if (cands[0].forfeit_opponent !== x.kind) set.push({ id: cands[0].id, kind: x.kind, src: `D${dn} ${x.weight} ${x.round} ${x.winner}` })
  }
  // cons. semifinals added 2026-11-09 from the bracket PDFs (Districts 5, 6, 7; the export has none): the PDF
  // shows a "Forfeit" entry on the other side, so filler
  for (const m of ms) if (!used.has(m.id) && m.round === 'C3' && [5, 6, 7].includes(dn)) { used.add(m.id); c.filler++; if (m.forfeit_opponent !== 'filler') set.push({ id: m.id, kind: 'filler', src: `D${dn} C3 (bracket PDF)` }) }
  const left = ms.filter((m: any) => !used.has(m.id))
  for (const m of left) problems.push(`D${dn}: stored forfeit ${m.round} wc ${m.weight_class_id} has no export line`)
  summary.push(`District ${dn}: forfeits over filler ${c.filler}, over an empty slot ${c.empty}; stored forfeits not in the export ${left.length}`)
}
console.log(summary.join('\n'))
console.log(`\nto mark: ${set.length} (filler ${set.filter(s => s.kind === 'filler').length}, empty ${set.filter(s => s.kind === 'empty').length}); problems ${problems.length}`)
if (problems.length) console.log(problems.slice(0, 30).join('\n'))

const OUT = 'docs/migrations/20261109_girls_district_forfeit_opponents.sql'
const ids = (k: string) => set.filter(s => s.kind === k).map(s => `    '${s.id}'`).join(',\n')
const nF = set.filter(s => s.kind === 'filler').length, nE = set.filter(s => s.kind === 'empty').length
const sql = `-- Girls 2025-26 districts: mark forfeit wins with no loser as over a filler entry or an empty slot (2026-11-09)
--
-- matches.forfeit_opponent ('filler' | 'empty'), as the boys districts were on 2026-11-05
-- (20261105_district_forfeits_and_deductions.sql). From the TrackWrestling export: "won by forfeit over
-- A Forfeit (Team Forfeit)" is a filler entry; "won by forfeit over ()" is an empty slot. TrackWrestling counts a
-- forfeit over a filler entry as contested for bye points and one over an empty slot not (both earn the win and
-- the 2 bonus). Built by scripts/build_girls_forfeit_opponents.mts; every stored girls district forfeit with no
-- loser is matched to exactly one export line. Changes no result, record or official total.
-- ROLLBACK: UPDATE matches SET forfeit_opponent = NULL WHERE id IN (the ids below);
-- Run in the Supabase SQL editor.

DO $$
DECLARE n integer;
BEGIN
  UPDATE matches SET forfeit_opponent = 'filler'
  WHERE win_type = 'FORF' AND loser_entry_id IS NULL AND id IN (
${ids('filler')}
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> ${nF} THEN RAISE EXCEPTION 'expected ${nF} filler forfeits, updated %', n; END IF;

  UPDATE matches SET forfeit_opponent = 'empty'
  WHERE win_type = 'FORF' AND loser_entry_id IS NULL AND id IN (
${ids('empty')}
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> ${nE} THEN RAISE EXCEPTION 'expected ${nE} empty-slot forfeits, updated %', n; END IF;
END $$;

-- Verify: filler ${nF}, empty ${nE}
SELECT forfeit_opponent, count(*) FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE t.season_id = 2026 AND t.gender = 'F' AND t.tournament_type = 'districts' AND m.win_type = 'FORF' AND m.loser_entry_id IS NULL
GROUP BY forfeit_opponent ORDER BY 1;
`
if (problems.length === 0 && set.length) { fs.writeFileSync(OUT, sql); console.log(`wrote ${OUT}`) } else console.log('not written')
