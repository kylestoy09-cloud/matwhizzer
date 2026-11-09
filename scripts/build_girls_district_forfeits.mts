// Girls 2025-26 districts: forfeits vs byes, export vs stored (2026-11-09). Writes one migration.
// The TrackWrestling export (Whizzer Upload/Match Data/2026 Girls District Data.py) words the two cases
// differently, and they score differently (docs/reviews/trackwrestling_team_scoring.md):
//   "X received a bye ()"                          a bye: no bout; nothing on its own
//   "X won by forfeit over A Forfeit (Team Forfeit)" a forfeit win over a filler entry: a contested win
//                                                   (2 advancement / 1 consolation, 2 bonus)
// Stored, both have been written as FORF with no loser. This lists, in every district:
//   1. stored FORF-no-loser bouts whose export line is a bye  → made byes (win_type BYE), as the
//      2026-11-02 filler cleanup did (20261102_remove_placeholder_entries.sql); nothing is deleted
//   2. export forfeit wins over a filler entry with no stored bout → added (FORF, no loser)
// Read-only until Kyle runs the migration it writes.
//   npx tsx --tsconfig tsconfig.json scripts/build_girls_district_forfeits.mts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }
const FILE = '../Whizzer Upload/Match Data/2026 Girls District Data.py'
const ROUND: [RegExp, string, string][] = [
  [/^Champ\. Round 1\b/, 'R1', 'championship'], [/^Champ\. Round 2\b/, 'R2', 'championship'], [/^Quarterfinal\b/, 'QF', 'championship'],
  [/^Semifinal\b/, 'SF', 'championship'], [/^1st Place\b/, 'F', 'championship'], [/^3rd Place\b/, '3rd_Place', 'consolation'],
  [/^5th Place\b/, '5th_Place', 'consolation'], [/^Cons\. Round 1\b/, 'C1', 'consolation'], [/^Cons\. Semi\b/, 'C3', 'consolation'],
]
const FILLER = /^(|([A-Z*] )?Forfeit( [A-Z]| Forfeit)?|Bye( Bye)?)$/i
const norm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '')

type Line = { round: string; side: string; weight: number; winner: string; kind: 'bye' | 'ff'; line: string }
const byDistrict = new Map<number, Line[]>()
let d = 0, weight = 0
const seen = new Set<string>()   // the export repeats some sections: each line once
for (const raw of fs.readFileSync(FILE, 'utf8').split('\n')) {
  const l = raw.trim()
  const h = l.match(/^District (\d+)$/); if (h) { d = Number(h[1]); byDistrict.set(d, []); continue }
  if (/^\d{3}$/.test(l)) { weight = Number(l); continue }
  if (seen.has(`${d}|${weight}|${l}`)) continue; seen.add(`${d}|${weight}|${l}`)
  const r = ROUND.find(([re]) => re.test(l)); if (!r || !d) continue
  let m = l.match(/^[^-]+ - (.*?) \((.*?)\) [\d-]+ received a bye/)
  if (m) { if (!FILLER.test(m[1].trim())) byDistrict.get(d)!.push({ round: r[1], side: r[2], weight, winner: m[1].trim(), kind: 'bye', line: l }); continue }
  m = l.match(/^[^-]+ - (.*?) \((.*?)\) [\d-]+ won by forfeit over (.*?) \((.*?)\)/)
  if (m && !FILLER.test(m[1].trim()) && FILLER.test(m[3].trim())) byDistrict.get(d)!.push({ round: r[1], side: r[2], weight, winner: m[1].trim(), kind: 'ff', line: l })
}

const wcs = new Map((await db.from('weight_classes').select('id, weight').eq('gender', 'F')).data!.map(w => [w.weight, w.id]))
const toBye: { id: string; src: string }[] = [], toAdd: any[] = [], problems: string[] = []
const summary: string[] = []
for (const [dn, lines] of [...byDistrict].sort((a, b) => a[0] - b[0])) {
  const t = (await db.from('tournaments').select('id').eq('name', `Girl_s Districts District ${dn}`).eq('season_id', 2026).single()).data!
  const ents = await all((f, to) => db.from('tournament_entries').select('id, weight_class_id, wrestlers(first_name, last_name)').eq('tournament_id', t.id).range(f, to))
  const ms = await all((f, to) => db.from('matches').select('id, round, weight_class_id, winner_entry_id, loser_entry_id, win_type').eq('tournament_id', t.id).range(f, to))
  const full = new Map(ents.map((e: any) => [e.id, norm(`${e.wrestlers?.first_name ?? ''}${e.wrestlers?.last_name ?? ''}`)]))
  const last = new Map(ents.map((e: any) => [e.id, norm(e.wrestlers?.last_name ?? '')]))
  // the entry for an export name at a weight: full name, else a unique last name
  const entryOf = (name: string, wc: number) => {
    const at = ents.filter((e: any) => e.weight_class_id === wc)
    const f = at.filter((e: any) => full.get(e.id) === norm(name)); if (f.length === 1) return f[0]
    const ln = norm(name.split(' ').slice(-1)[0]); const l = at.filter((e: any) => last.get(e.id) === ln || (last.get(e.id) ?? '').endsWith(ln)); return l.length === 1 ? l[0] : null
  }
  let nb = 0, na = 0
  for (const x of lines) {
    const wc = wcs.get(x.weight)!
    const e = entryOf(x.winner, wc)
    // a bye for a name with no entry is bracket filler (the 2026-11-02 cleanup removed those entries): not a bout
    if (!e) { if (x.kind !== 'bye') problems.push(`D${dn} ${x.weight} ${x.round}: no entry for "${x.winner}" — ${x.line.slice(0, 120)}`); continue }
    const stored = ms.filter((m: any) => m.weight_class_id === wc && m.round === x.round && m.winner_entry_id === e.id)
    if (x.kind === 'bye') {
      for (const m of stored) if (m.win_type === 'FORF' && !m.loser_entry_id) { toBye.push({ id: m.id, src: `D${dn} ${x.weight} ${x.round}: ${x.winner} — export: received a bye` }); nb++ }
    } else if (!stored.length) {
      toAdd.push({ tournament_id: t.id, weight_class_id: wc, bracket_side: x.side, round: x.round, winner_entry_id: e.id, src: `D${dn} ${x.weight} ${x.round}: ${x.line.replace(/^[^-]+ - /, '').slice(0, 110)}` }); na++
    }
  }
  summary.push(`District ${dn}: byes stored as forfeit wins ${nb}, forfeit wins to add ${na}`)
}
console.log(summary.join('\n'))
console.log(`\nbyes stored as forfeit wins: ${toBye.length}; forfeit wins to add: ${toAdd.length}; problems: ${problems.length}`)
if (problems.length) console.log(problems.join('\n'))
for (const a of toAdd) console.log('  add  ' + a.src)

const OUT = 'docs/migrations/20261109_girls_d7_d8_forfeit_wins.sql'
if (toBye.length) problems.push(`${toBye.length} byes stored as forfeit wins: this migration only adds forfeit wins; handle those separately`)
const key = (a: any) => `(${a.tournament_id}, ${a.weight_class_id}, '${a.round}', '${a.winner_entry_id}'::uuid)`
const sql = `-- Girls 2025-26 Districts 7 and 8: forfeit wins over a filler entry that were never loaded (2026-11-09)
--
-- The TrackWrestling export (Whizzer Upload/Match Data/2026 Girls District Data.py) lists ${toAdd.length} wins like
-- "Tanvi Madisetti (Lawrence Senior) won by forfeit over E Forfeit (Team Forfeit) (For.)" that have no stored bout.
-- A forfeit over a filler entry is a contested win (advancement plus 2 bonus; docs/reviews/
-- trackwrestling_team_scoring.md), and the other districts store theirs as FORF with no loser; these follow.
-- Checked across all 12 districts by scripts/build_girls_district_forfeits.mts: none of the stored forfeit wins
-- is a bye in the export ("won by forfeit over ()", an empty slot, is a forfeit, as District 4's are).
-- ROLLBACK: DELETE FROM matches WHERE (tournament_id, weight_class_id, round::text, winner_entry_id) IN (the list below)
--           AND win_type = 'FORF' AND loser_entry_id IS NULL;
-- Run in the Supabase SQL editor.

DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM matches WHERE win_type = 'FORF' AND loser_entry_id IS NULL
             AND (tournament_id, weight_class_id, round::text, winner_entry_id) IN (
${toAdd.map(a => `               ${key(a)}`).join(',\n')}
             )) THEN
    RAISE EXCEPTION 'some of these forfeit wins already exist; migration already applied?';
  END IF;

  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, validated)
  VALUES
${toAdd.map(a => `    -- ${a.src.replace(/'/g, '')}\n    (${a.tournament_id}, ${a.weight_class_id}, '${a.bracket_side}', '${a.round}', '${a.winner_entry_id}', NULL, 'FORF', true)`).join(',\n')};
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> ${toAdd.length} THEN RAISE EXCEPTION 'expected ${toAdd.length} forfeit wins, added %', n; END IF;
END $$;

-- Verify: District 7 4, District 8 14
SELECT t.name, count(*) FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE m.win_type = 'FORF' AND m.loser_entry_id IS NULL AND (m.tournament_id, m.weight_class_id, m.round::text, m.winner_entry_id) IN (
${toAdd.map(a => `  ${key(a)}`).join(',\n')}
) GROUP BY t.name ORDER BY t.name;
`
if (problems.length === 0 && toAdd.length) { fs.writeFileSync(OUT, sql); console.log(`wrote ${OUT}`) }
else console.log('not written')
