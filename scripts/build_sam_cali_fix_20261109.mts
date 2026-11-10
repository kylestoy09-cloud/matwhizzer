// Sam Cali 2025-26 (boys "Battle for The Belt", girls "Invitational") made to match the FloWrestling bracket PDFs
// (Whizzer Upload/2025-26 {Boys,Girls} Data/2025 Sam Cali Invitational [NJ] - Brackets - FloWrestling.pdf), 2026-11-09.
// Reads the plans built from the PDFs (parse_flo.py → compare.mts → plan.mts, kept in docs/reviews/sam_cali_2026/) and
// writes docs/migrations/20261109_sam_cali_brackets.sql plus backups of every row it changes. Read-only on the DB.
//   npx tsx --tsconfig tsconfig.json scripts/build_sam_cali_fix_20261109.mts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const DIR = 'docs/reviews/sam_cali_2026'
const T = { boys: 'd046f392-9128-4755-8584-528ca5336281', girls: 'ca6174aa-a4e2-4092-be6f-774813d2e6bb' }
const BT = { boys: 'tournament_bouts', girls: 'tournament_bouts_girls' }
const ST = { boys: 'in_season_tournament_seeds', girls: 'in_season_tournament_seeds_girls' }
const q = (v: any) => v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`
const sql: string[] = []
// the bouts' school text (NOT NULL): the school's name, as imports store it
const SN = new Map(((await db.from('schools').select('id, display_name')).data ?? []).map(x => [x.id, x.display_name]))
const backup: any = {}
const counts: Record<string, number> = {}
for (const g of ['boys', 'girls'] as const) {
  const p = JSON.parse(fs.readFileSync(`${DIR}/${g}_plan.json`, 'utf8'))
  const { data: bouts } = await db.from(BT[g]).select('*').eq('in_season_tournament_id', T[g]).limit(5000)
  const { data: seeds } = await db.from(ST[g]).select('*').eq('in_season_tournament_id', T[g]).limit(5000)
  const { data: places } = await db.from('tournament_placements').select('*').eq('in_season_tournament_id', T[g])
  backup[g] = { bouts, seeds, placements: places }
  const have = new Set((places ?? []).map(x => `${x.weight_class}|${x.place}`))
  const newPlaces = p.places.filter((x: any) => !have.has(`${x.weight_class}|${x.place}`))
  counts[`${g}_relabel`] = p.relabel.length; counts[`${g}_adds`] = p.adds.length; counts[`${g}_seeds_old`] = seeds!.length; counts[`${g}_seeds_new`] = p.seeds.length; counts[`${g}_places`] = newPlaces.length
  counts[`${g}_moves`] = p.moves.length; counts[`${g}_winner`] = p.winnerFix.length
  const B = BT[g], tid = q(T[g])
  sql.push(`  -- ===== ${g.toUpperCase()} =====`)
  // 1. round labels from the bracket
  sql.push(`  UPDATE ${B} b SET round = v.r FROM (VALUES\n${p.relabel.map((r: any) => `    (${q(r.id)}::uuid, ${q(r.from)}, ${q(r.to)})`).join(',\n')}\n  ) v(id, old, r) WHERE b.id = v.id AND b.round = v.old AND b.in_season_tournament_id = ${tid};`)
  sql.push(`  GET DIAGNOSTICS n = ROW_COUNT; IF n <> ${p.relabel.length} THEN RAISE EXCEPTION '${g} round labels: % of ${p.relabel.length}', n; END IF;`)
  // 2. a bout filed under the wrong weight
  for (const m of p.moves) {
    sql.push(`  UPDATE ${B} SET weight_class = ${m.to}, round = ${q(m.round)} WHERE id = ${q(m.id)} AND weight_class = ${m.from};  -- ${m.label}`)
    sql.push(`  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION '${g} weight move ${m.id}'; END IF;`)
  }
  // 3. winner per the bracket
  for (const w of p.winnerFix) {
    const x = bouts!.find(b => b.id === w.id)!
    const m = w.label.match(/Flo: .* F (\d+):(\d+);/)!
    sql.push(`  -- ${w.label}`)
    sql.push(`  UPDATE ${B} SET winner = ${3 - x.winner}, result_type = 'Fall', result_detail = NULL, fall_time_seconds = ${+m[1] * 60 + +m[2]} WHERE id = ${q(w.id)} AND winner = ${x.winner};`)
    sql.push(`  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION '${g} winner fix ${w.id}'; END IF;`)
  }
  // 4. bracket bouts never stored
  if (p.adds.length) {
    sql.push(`  INSERT INTO ${B} (in_season_tournament_id, weight_class, round, wrestler1_id, wrestler1_name_raw, wrestler1_school_id, wrestler1_school_raw, wrestler2_id, wrestler2_name_raw, wrestler2_school_id, wrestler2_school_raw, winner, result_type, result_detail, fall_time_seconds, winner_score, loser_score, source_format) VALUES`)
    sql.push(p.adds.map((a: any, i: number) => `    (${tid}, ${a.weight_class}, ${q(a.round)}, ${q(a.wrestler1_id)}, ${q(a.wrestler1_name_raw)}, ${q(a.wrestler1_school_id)}, ${q(SN.get(a.wrestler1_school_id) ?? '')}, ${q(a.wrestler2_id)}, ${q(a.wrestler2_name_raw)}, ${q(a.wrestler2_school_id)}, ${q(SN.get(a.wrestler2_school_id) ?? '')}, ${a.winner}, ${q(a.result_type)}, ${q(a.result_detail)}, ${q(a.fall_time_seconds)}, ${q(a.winner_score)}, ${q(a.loser_score)}, 'pdf')${i === p.adds.length - 1 ? ';' : ','}  -- ${a._label.replace(/\n/g, ' ')}`).join('\n'))
    sql.push(`  GET DIAGNOSTICS n = ROW_COUNT; IF n <> ${p.adds.length} THEN RAISE EXCEPTION '${g} bouts added: %', n; END IF;`)
  }
  // 4b. extra matches wrestled outside the bracket: consolation (Kyle 2026-11-09), "C1" (Cons. R1)
  const extra = p.storedOnly.filter((x: any) => x.round !== 'C1')
  counts[`${g}_extra`] = extra.length
  if (extra.length) {
    sql.push(`  -- extra matches outside the bracket → consolation (Kyle)`)
    sql.push(`  UPDATE ${B} b SET round = 'C1' FROM (VALUES\n${extra.map((x: any) => `    (${q(x.id)}::uuid, ${q(x.round)})`).join(',\n')}\n  ) v(id, old) WHERE b.id = v.id AND b.round = v.old AND b.in_season_tournament_id = ${tid};`)
    sql.push(`  GET DIAGNOSTICS n = ROW_COUNT; IF n <> ${extra.length} THEN RAISE EXCEPTION '${g} extra matches: % of ${extra.length}', n; END IF;`)
  }
  // 5. seeds: the bracket's full set (boys: replaces the 366 entered earlier, 8 of them linked to the wrong person)
  if (seeds!.length) { sql.push(`  DELETE FROM ${ST[g]} WHERE in_season_tournament_id = ${tid};`); sql.push(`  GET DIAGNOSTICS n = ROW_COUNT; IF n <> ${seeds!.length} THEN RAISE EXCEPTION '${g} seeds removed: %', n; END IF;`) }
  sql.push(`  INSERT INTO ${ST[g]} (in_season_tournament_id, weight_class, seed, wrestler_name_raw, school_name_raw, wrestler_id, school_id) VALUES`)
  sql.push(p.seeds.map((s: any) => `    (${tid}, ${s.weight_class}, ${s.seed}, ${q(s.wrestler_name_raw)}, '', ${q(s.wrestler_id)}, ${q(s.school_id)})`).join(',\n') + ';')
  sql.push(`  GET DIAGNOSTICS n = ROW_COUNT; IF n <> ${p.seeds.length} THEN RAISE EXCEPTION '${g} seeds added: %', n; END IF;`)
  // 6. placements 1-6 (only the places not already stored)
  if (newPlaces.length) {
    sql.push(`  INSERT INTO tournament_placements (in_season_tournament_id, weight_class, place, wrestler_name_raw, school_name_raw, school_id, wrestler_id, bracket) VALUES`)
    sql.push(newPlaces.map((x: any) => `    (${tid}, ${x.weight_class}, ${x.place}, ${q(x.wrestler_name_raw)}, '', ${q(x.school_id)}, ${q(x.wrestler_id)}, '')`).join(',\n') + ';')
    sql.push(`  GET DIAGNOSTICS n = ROW_COUNT; IF n <> ${newPlaces.length} THEN RAISE EXCEPTION '${g} placements added: %', n; END IF;`)
  }
}
// 7. addresses carrying the tournament name (and for girls Sam Cali its team standings) after the street address
const addr: string[] = []
for (const t of ['in_season_tournaments', 'in_season_tournaments_girls']) {
  const { data } = await db.from(t).select('id, name, location, venue_address')
  for (const x of data ?? []) {
    const clean = (s: string | null) => { if (!s) return s; let o = s; const i = o.indexOf(', 1st: '); if (i >= 0) o = o.slice(0, i); if (o.endsWith(', ' + x.name)) o = o.slice(0, -(x.name.length + 2)); return o }
    const a = clean(x.venue_address), l = clean(x.location)
    if (a === x.venue_address && l === x.location) continue
    backup[`address_${x.id}`] = x
    addr.push(`  UPDATE ${t} SET venue_address = ${q(a)}, location = ${q(l)} WHERE id = ${q(x.id)} AND venue_address = ${q(x.venue_address)};  -- ${x.name}`)
    addr.push(`  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'address ${x.id}'; END IF;`)
  }
}
counts.addresses = addr.length / 2
fs.writeFileSync('docs/migrations/backups/20261109_sam_cali_brackets_before.json', JSON.stringify(backup))
const head = `-- docs/migrations/20261109_sam_cali_brackets.sql
--
-- Sam Cali 2025-26, boys "Battle for The Belt" and girls "Invitational", made to match the FloWrestling bracket PDFs
-- (Whizzer Upload/2025-26 {Boys,Girls} Data/2025 Sam Cali Invitational [NJ] - Brackets - FloWrestling.pdf). Every
-- bracket bout was paired with a stored bout (same weight, same two wrestlers); work in docs/reviews/sam_cali_2026/.
--   boys:  ${counts.boys_relabel} round labels (almost all were stored as "R1"); ${counts.boys_adds} bracket bouts never stored (mostly out-of-state
--          teams against each other); seeds replaced, ${counts.boys_seeds_old} → ${counts.boys_seeds_new} (8 of the old ones linked to the wrong person,
--          e.g. "A. Dyki" → Ryan Dyki for Alexander Dyki); ${counts.boys_places} placements added (1st-6th, 18 were stored).
--          The ${counts.boys_extra} stored bouts outside the bracket (extra matches) become consolation, "C1" (Kyle).
--   girls: ${counts.girls_relabel} round labels; ${counts.girls_moves} bout moved 152 → 185 (the 185 semifinal Sandoval / Vilela Armijos);
--          ${counts.girls_winner} winner corrected (152 consolation semi: Gwen Silipena pinned Alexa Nunez, as the bracket and
--          her 3rd place match show; TrackWrestling lists "Nunez over Silipena (Fall 0:00)"); ${counts.girls_adds} bracket bouts added;
--          ${counts.girls_seeds_new} seeds (none were stored); ${counts.girls_places} placements (1st-6th; none were stored).
--   ${counts.addresses} tournament addresses that carried the tournament's name (girls Sam Cali: its team standings) after the street.
-- Bracket rounds: first round R1, R2, R3 (64 / 32 / 16), QF, SF, F; consolation C1, C2, C3 in order, Consi-Semis CSF;
-- 3rd_Place, 5th_Place. "NC" consolation semis (boys, not wrestled) are not bouts and are not added.
-- Backup of every row before: docs/migrations/backups/20261109_sam_cali_brackets_before.json
-- Run in the Supabase SQL editor.

DO $$
DECLARE n int;
BEGIN
`
const tail = `
END $$;

-- Verify
SELECT 'boys bouts (expect 528)' AS what, count(*)::text AS value FROM tournament_bouts WHERE in_season_tournament_id = '${T.boys}'
UNION ALL SELECT 'girls bouts (expect 170)', count(*)::text FROM tournament_bouts_girls WHERE in_season_tournament_id = '${T.girls}'
UNION ALL SELECT 'boys seeds (expect 402)', count(*)::text FROM in_season_tournament_seeds WHERE in_season_tournament_id = '${T.boys}'
UNION ALL SELECT 'girls seeds (expect 103)', count(*)::text FROM in_season_tournament_seeds_girls WHERE in_season_tournament_id = '${T.girls}'
UNION ALL SELECT 'boys placements (expect 84)', count(*)::text FROM tournament_placements WHERE in_season_tournament_id = '${T.boys}'
UNION ALL SELECT 'girls placements (expect 68)', count(*)::text FROM tournament_placements WHERE in_season_tournament_id = '${T.girls}';
`
fs.writeFileSync('docs/migrations/20261109_sam_cali_brackets.sql', head + sql.join('\n') + '\n\n  -- ===== ADDRESSES =====\n' + addr.join('\n') + tail)
console.log(counts)
