-- Patch: Sam Cali 2025 tournament bouts have wrong school_ids.
--
-- Root cause: bracket PDF uses 3-5 letter abbreviations (B-R, SHP, MTWN, etc.).
--   SchoolMatcher trigram-fuzzy-matched these to wrong NJ schools because
--   abbreviations share no meaningful character n-grams with the schools they name.
--   This is the 3rd abbreviation collision in this single tournament (after SPP, HTWN).
--   See db_changelog.md for full root-cause analysis and the short-string threshold
--   fix that prevents recurrence.
--
-- Evidence: each abbreviation resolved against the Sam Cali pipe CSV
--   (877 rows, full school names, same tournament). Wrestler name+weight matching
--   produced the per-position assignments. 43 of 43 DEL positions resolved;
--   0 left ambiguous.
--
-- Thin-evidence items (1 bout each, flagged explicitly below):
--   SBW — D. cerciello, 138lb → pipe: "lodi/saddle brook". Comment out if unsure.
--   W/MP — D. LiSanti, 157lb → pipe: "waldwick / midland park". Abbreviation
--          self-evident (Waldwick/Midland Park co-op). Comment out if unsure.
--
-- Tournament: Sam Cali 2025
--   in_season_tournament_id: bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56
--   Total bouts in DB: 386 (source_format='pdf')
--
-- Apply manually in the Supabase SQL editor.
-- Run the verification query at the bottom after applying.

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- SCHOOL_ID CORRECTIONS (16 abbreviations)
-- ────────────────────────────────────────────────────────────────────────────

-- ── B-R: Becton (321) → Bridgewater-Raritan (131) — 7+10 = 17 positions ───
UPDATE tournament_bouts SET wrestler1_school_id = 131
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'B-R';
-- Expected: 7 rows

UPDATE tournament_bouts SET wrestler2_school_id = 131
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'B-R';
-- Expected: 10 rows

-- ── BBRK: Brick Memorial (207) → Bound Brook (322) — 6+2 = 8 positions ────
UPDATE tournament_bouts SET wrestler1_school_id = 322
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'BBRK';
-- Expected: 6 rows

UPDATE tournament_bouts SET wrestler2_school_id = 322
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'BBRK';
-- Expected: 2 rows

-- ── CHAM: Summit (397) → NULL (OOS — Chaminade, Mineola NY) — 5+13 = 18 ──
UPDATE tournament_bouts SET wrestler1_school_id = NULL
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'CHAM';
-- Expected: 5 rows

UPDATE tournament_bouts SET wrestler2_school_id = NULL
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'CHAM';
-- Expected: 13 rows

-- ── HTWN: Haddon Township (240) → Hackettstown (112) ──────────────────────
-- Total HTWN positions: 15. 4 already fixed (S. Vidal); targeting 5+6 = 11 remaining.
-- Filter on school_id=240 to avoid touching the already-correct Vidal bouts (school_id=112).
UPDATE tournament_bouts SET wrestler1_school_id = 112
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'HTWN'
  AND wrestler1_school_id  = 240;
-- Expected: 5 rows

UPDATE tournament_bouts SET wrestler2_school_id = 112
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'HTWN'
  AND wrestler2_school_id  = 240;
-- Expected: 6 rows

-- ── MANA: Manalapan (204) → Manasquan (220) — 3+3 = 6 positions ──────────
UPDATE tournament_bouts SET wrestler1_school_id = 220
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'MANA';
-- Expected: 3 rows

UPDATE tournament_bouts SET wrestler2_school_id = 220
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'MANA';
-- Expected: 3 rows

-- ── MDTWP: Middletown North (159) → Middle Township (283) — 5+9 = 14 ─────
UPDATE tournament_bouts SET wrestler1_school_id = 283
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'MDTWP';
-- Expected: 5 rows

UPDATE tournament_bouts SET wrestler2_school_id = 283
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'MDTWP';
-- Expected: 9 rows

-- ── MO: Monroe (172) → Mt. Olive (56) — 14+6 = 20 positions ──────────────
UPDATE tournament_bouts SET wrestler1_school_id = 56
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'MO';
-- Expected: 14 rows

UPDATE tournament_bouts SET wrestler2_school_id = 56
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'MO';
-- Expected: 6 rows

-- ── MS: NULL → Middletown South (160) — 5+3 = 8 positions ────────────────
UPDATE tournament_bouts SET wrestler1_school_id = 160
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'MS';
-- Expected: 5 rows

UPDATE tournament_bouts SET wrestler2_school_id = 160
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'MS';
-- Expected: 3 rows

-- ── MTWN: Morristown (114) → Moorestown (261) — 5+6 = 11 positions ───────
UPDATE tournament_bouts SET wrestler1_school_id = 261
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'MTWN';
-- Expected: 5 rows

UPDATE tournament_bouts SET wrestler2_school_id = 261
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'MTWN';
-- Expected: 6 rows

-- ── RP: Rutgers Prep (196) → Roselle Park (125) — 3+2 = 5 positions ──────
UPDATE tournament_bouts SET wrestler1_school_id = 125
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'RP';
-- Expected: 3 rows

UPDATE tournament_bouts SET wrestler2_school_id = 125
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'RP';
-- Expected: 2 rows

-- ── SBW: South Brunswick (164) → Lodi/Saddle Brook (379) — 1 position ─────
-- THIN EVIDENCE (1 bout): D. cerciello, 138lb. Pipe confirms "lodi/saddle brook".
-- Comment out this block if you'd prefer to resolve manually.
UPDATE tournament_bouts SET wrestler2_school_id = 379
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'SBW';
-- Expected: 1 row

-- ── SHP: Shore (225) → Seton Hall Prep (127) — 11+17 = 28 positions ──────
UPDATE tournament_bouts SET wrestler1_school_id = 127
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'SHP';
-- Expected: 11 rows

UPDATE tournament_bouts SET wrestler2_school_id = 127
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'SHP';
-- Expected: 17 rows

-- ── TRE: Trenton (216) → Toms River East (253) — 6+3 = 9 positions ───────
UPDATE tournament_bouts SET wrestler1_school_id = 253
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'TRE';
-- Expected: 6 rows

UPDATE tournament_bouts SET wrestler2_school_id = 253
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'TRE';
-- Expected: 3 rows

-- ── W/MP: NULL → Waldwick/Midland Park co-op (9) — 1 position ────────────
-- THIN EVIDENCE (1 bout): D. LiSanti, 157lb. Abbreviation self-evident (W=Waldwick,
-- MP=Midland Park). Pipe confirms "waldwick / midland park".
-- Comment out this block if you'd prefer to resolve manually.
UPDATE tournament_bouts SET wrestler2_school_id = 9
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'W/MP';
-- Expected: 1 row

-- ── WHLS: Whippany Park (119) → Watchung Hills (147) — 1+5 = 6 positions ─
UPDATE tournament_bouts SET wrestler1_school_id = 147
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'WHLS';
-- Expected: 1 row

UPDATE tournament_bouts SET wrestler2_school_id = 147
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'WHLS';
-- Expected: 5 rows

-- ────────────────────────────────────────────────────────────────────────────
-- DEL: Delaware Valley (141) → per-position: Delbarton (82) or Delsea (290)
-- 40 distinct bouts, 43 wrestler-positions (3 bouts are DEL vs DEL).
-- Resolved per-position via name+weight matching against pipe CSV.
-- 28 → Delbarton (82), 15 → Delsea (290), 0 unresolvable.
-- DEL is NOT added to school_aliases — it is genuinely ambiguous across tournaments.
-- ────────────────────────────────────────────────────────────────────────────

-- wrestler1 → Delbarton (82) — 20 positions
UPDATE tournament_bouts SET wrestler1_school_id = 82
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'DEL'
  AND id IN (
    '00ab3451-f63b-46cd-98e0-67a8cc1f7d95',
    '1982e138-eecf-4c80-98bd-c6fff647e803',
    '20f43edd-f431-4f23-875a-287b1af3a882',
    '242ef03a-bc3c-47be-b389-4ae2e03d75c7',
    '2a8d0b2e-ac58-494d-9fc4-b58868b49ad7',
    '3516efab-04e3-423a-bcf5-6be18fe367ec',
    '49289229-6629-4e37-aa55-589aa8d50263',
    '62c77f89-198b-416a-aa8a-8fba3876cc40',
    '68ecf4e3-e5b1-417f-a33c-6946485a23b7',
    '7b5e457b-bb26-435d-945b-811e3523c538',
    '8855387f-4b46-4ac4-8ebb-3346e9c8e60f',
    '8a9891e7-8af6-456d-99cd-459f659f49a9',
    '8dc7182b-3c28-43b6-839c-0f706aca0cbe',
    '93ffd9e9-460d-4a76-bbeb-b2fa31f2d358',
    '9e848bdd-18ff-410e-9085-631605a915f0',
    'a3992b41-3c5a-4098-8a4f-b7d98daa6b3b',
    'afd4b41a-5b90-4dd5-b384-475861b3b456',
    'b1c010cc-dec0-464c-826c-80380187cbdc',
    'b619a31c-85c9-4925-9100-1d6c743616c4',
    'c2f683eb-e82e-415b-8c41-48af0a58a42c'
);
-- Expected: 20 rows

-- wrestler1 → Delsea (290) — 7 positions
UPDATE tournament_bouts SET wrestler1_school_id = 290
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler1_school_raw = 'DEL'
  AND id IN (
    '1597af7c-5ef7-46ae-a922-f17bb5e6fba6',
    '288d0c98-7b54-49cf-94d5-aafc5861aabb',
    '327abc9a-d8af-466e-9d08-ff7616256982',
    '9259d709-a814-414e-bbb6-e3e98caff05a',
    'b4c47efb-a772-4f9e-8585-be08ddc9dd0c',
    'cbc5af77-5a46-4338-a6e5-3071bd34a35b',
    'f2903e68-9169-4bff-b2b2-240cd9be27d8'
);
-- Expected: 7 rows

-- wrestler2 → Delbarton (82) — 8 positions
UPDATE tournament_bouts SET wrestler2_school_id = 82
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'DEL'
  AND id IN (
    '092c1f85-18f8-4ac1-abd5-90c8bf280af3',
    '3874ba92-e43d-44de-8bcb-408a52366949',
    '3fc2218e-d230-4777-8d84-ba1a910f34ce',
    '67146e08-bb00-4d28-95b4-8b0ba8b8e17d',
    '6e384eda-2866-47c2-a5dd-93c73a3973cb',
    '7b5e457b-bb26-435d-945b-811e3523c538',
    'd2ff8f02-8732-4192-a7b8-c294849fd897',
    'e09d85d7-67e8-4ac2-9742-9c2c69d210df'
);
-- Expected: 8 rows

-- wrestler2 → Delsea (290) — 8 positions
UPDATE tournament_bouts SET wrestler2_school_id = 290
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
  AND wrestler2_school_raw = 'DEL'
  AND id IN (
    '24956d2e-14c4-460d-9402-b80a18e27d47',
    '2a8d0b2e-ac58-494d-9fc4-b58868b49ad7',
    '5826ccf3-4432-4491-a657-2969b2a4b4af',
    '6dd75172-a348-422c-800c-373c5ff1ffd4',
    '8dc7182b-3c28-43b6-839c-0f706aca0cbe',
    'c950166b-14f9-4023-854b-fb43520de26b',
    'daef5b0c-d06c-4439-89bf-e3e79c1aad1f',
    'e2a6761b-25f1-467c-ae8d-425110ede82a'
);
-- Expected: 8 rows

-- ────────────────────────────────────────────────────────────────────────────
-- SCHOOL ALIASES
-- All 16 corrected abbreviations added as exact aliases so future imports
-- hit the alias path rather than the fuzzy path.
-- Also adds all correctly-resolved abbreviations from this tournament, and
-- OOS aliases for GFA / MSCA / PNGT / CHAM / PEDD.
-- DEL is intentionally omitted — it is ambiguous (Delbarton or Delsea
-- depending on context) and must remain an alias-free string.
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO school_aliases (school_id, alias, alias_type, notes) VALUES

  -- 16 corrected abbreviations
  (131, 'B-R',    'abbreviation', 'Sam Cali 2025 — was fuzzy-matched to Becton (321)'),
  (322, 'BBRK',   'abbreviation', 'Sam Cali 2025 — was fuzzy-matched to Brick Memorial (207)'),
  (112, 'HTWN',   'abbreviation', 'Sam Cali 2025 — was fuzzy-matched to Haddon Township (240); Hackettstown'),
  (220, 'MANA',   'abbreviation', 'Sam Cali 2025 — was fuzzy-matched to Manalapan (204); Manasquan'),
  (283, 'MDTWP',  'abbreviation', 'Sam Cali 2025 — was fuzzy-matched to Middletown North (159); Middle Township'),
  (56,  'MO',     'abbreviation', 'Sam Cali 2025 — was fuzzy-matched to Monroe (172); Mt. Olive'),
  (160, 'MS',     'abbreviation', 'Sam Cali 2025 — was unresolved (NULL); Middletown South'),
  (261, 'MTWN',   'abbreviation', 'Sam Cali 2025 — was fuzzy-matched to Morristown (114); Moorestown'),
  (125, 'RP',     'abbreviation', 'Sam Cali 2025 — was fuzzy-matched to Rutgers Prep (196); Roselle Park'),
  (379, 'SBW',    'abbreviation', 'Sam Cali 2025 — was fuzzy-matched to South Brunswick (164); Lodi/Saddle Brook. Thin evidence (1 bout).'),
  (127, 'SHP',    'abbreviation', 'Sam Cali 2025 — was fuzzy-matched to Shore (225); Seton Hall Prep'),
  (253, 'TRE',    'abbreviation', 'Sam Cali 2025 — was fuzzy-matched to Trenton (216); Toms River East'),
  (9,   'W/MP',   'abbreviation', 'Sam Cali 2025 — was unresolved (NULL); Waldwick/Midland Park co-op'),
  (147, 'WHLS',   'abbreviation', 'Sam Cali 2025 — was fuzzy-matched to Whippany Park (119); Watchung Hills'),

  -- Correctly resolved abbreviations (adding to alias table so future imports
  -- hit alias path, not fuzzy path, even if the trigram result would be correct)
  (81,  'BLOM',    'abbreviation', 'Sam Cali 2025'),
  (40,  'BRGF',    'abbreviation', 'Sam Cali 2025'),
  (266, 'CHER',    'abbreviation', 'Sam Cali 2025'),
  (93,  'CRAN',    'abbreviation', 'Sam Cali 2025'),
  (11,  'DBP',     'abbreviation', 'Sam Cali 2025'),
  (314, 'DEMA',    'abbreviation', 'Sam Cali 2025'),
  (2,   'DMNT',    'abbreviation', 'Sam Cali 2025'),
  (22,  'DPLC',    'abbreviation', 'Sam Cali 2025'),
  (41,  'DWMO',    'abbreviation', 'Sam Cali 2025'),
  (12,  'GLRK',    'abbreviation', 'Sam Cali 2025'),
  (188, 'HILL',    'abbreviation', 'Sam Cali 2025'),
  (33,  'KINN',    'abbreviation', 'Sam Cali 2025'),
  (5,   'LAKE',    'abbreviation', 'Sam Cali 2025'),
  (281, 'LCM',     'abbreviation', 'Sam Cali 2025'),
  (382, 'MAT',     'abbreviation', 'Sam Cali 2025'),
  (77,  'MOKN',    'abbreviation', 'Sam Cali 2025'),
  (95,  'NBGN',    'abbreviation', 'Sam Cali 2025'),
  (35,  'NHGH',    'abbreviation', 'Sam Cali 2025'),
  (24,  'NWTN',    'abbreviation', 'Sam Cali 2025'),
  (106, 'Nut',     'abbreviation', 'Sam Cali 2025 — mixed case in source'),
  (6,   'OLDT',    'abbreviation', 'Sam Cali 2025'),
  (57,  'PARA',    'abbreviation', 'Sam Cali 2025'),
  (46,  'PCVY',    'abbreviation', 'Sam Cali 2025'),
  (144, 'PING',    'abbreviation', 'Sam Cali 2025'),
  (183, 'PISC',    'abbreviation', 'Sam Cali 2025'),
  (117, 'PJ23',    'abbreviation', 'Sam Cali 2025'),
  (153, 'PRMC',    'abbreviation', 'Sam Cali 2025 — Paramus Catholic'),
  (391, 'PSCT',    'abbreviation', 'Sam Cali 2025 — Passaic Tech'),
  (15,  'PSKH',    'abbreviation', 'Sam Cali 2025'),
  (16,  'PSKV',    'abbreviation', 'Sam Cali 2025'),
  (264, 'RBC',     'abbreviation', 'Sam Cali 2025'),
  (156, 'RHS',     'abbreviation', 'Sam Cali 2025'),
  (17,  'RMPO',    'abbreviation', 'Sam Cali 2025'),
  (118, 'SBP',     'abbreviation', 'Sam Cali 2025 — St. Benedicts Prep'),
  (167, 'SPP',     'abbreviation', 'Sam Cali 2025 — St. Peters Prep (first abbreviation collision found in this tournament)'),
  (26,  'SPAR',    'abbreviation', 'Sam Cali 2025'),
  (48,  'TNCK',    'abbreviation', 'Sam Cali 2025'),
  (235, 'WALL',    'abbreviation', 'Sam Cali 2025'),
  (39,  'WE',      'abbreviation', 'Sam Cali 2025'),
  (187, 'odbridge','abbreviation', 'Sam Cali 2025 — Woodbridge; odd lowercase in source')

ON CONFLICT DO NOTHING;

-- OOS aliases (school_id IS NULL, alias_type='oos')
-- SchoolMatcher checks these after NJ matches so a correctly-NJ-aliased
-- string always wins; OOS only fires when no NJ match exists.
INSERT INTO school_aliases (school_id, alias, alias_type, notes) VALUES
  (NULL, 'GFA',  'oos', 'Green Farms Academy, Westport CT — Sam Cali 2025'),
  (NULL, 'MSCA', 'oos', 'Mt. St. Charles Academy, Woonsocket RI — Sam Cali 2025'),
  (NULL, 'PNGT', 'oos', 'Ponaganset High School, North Scituate RI — Sam Cali 2025'),
  (NULL, 'CHAM', 'oos', 'Chaminade, Mineola NY — Sam Cali 2025; was fuzzy-matched to Summit (397)'),
  (NULL, 'PEDD', 'oos', 'The Peddie School, Hightstown NJ — not in NJSIAA/schools table; treated as untracked')
ON CONFLICT DO NOTHING;

COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (run this block to reverse all changes above)
-- ────────────────────────────────────────────────────────────────────────────
/*
BEGIN;

UPDATE tournament_bouts SET wrestler1_school_id = 321 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler1_school_raw = 'B-R';
UPDATE tournament_bouts SET wrestler2_school_id = 321 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'B-R';

UPDATE tournament_bouts SET wrestler1_school_id = 207 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler1_school_raw = 'BBRK';
UPDATE tournament_bouts SET wrestler2_school_id = 207 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'BBRK';

UPDATE tournament_bouts SET wrestler1_school_id = 397 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler1_school_raw = 'CHAM';
UPDATE tournament_bouts SET wrestler2_school_id = 397 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'CHAM';

-- HTWN: restore only the 11 non-Vidal positions (Vidal bouts: wrestler1 ids 2639b343,64389b7e,e2d544e5; wrestler2 id 1982e138)
UPDATE tournament_bouts SET wrestler1_school_id = 240 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler1_school_raw = 'HTWN' AND id NOT IN ('2639b343-8c48-4ea5-b994-44d57c42d7e6','64389b7e-4a29-478e-91fc-85e5c0a6d52e','e2d544e5-7a52-4e20-8218-03bb5d50caed');
UPDATE tournament_bouts SET wrestler2_school_id = 240 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'HTWN' AND id NOT IN ('1982e138-eecf-4c80-98bd-c6fff647e803');

UPDATE tournament_bouts SET wrestler1_school_id = 204 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler1_school_raw = 'MANA';
UPDATE tournament_bouts SET wrestler2_school_id = 204 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'MANA';

UPDATE tournament_bouts SET wrestler1_school_id = 159 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler1_school_raw = 'MDTWP';
UPDATE tournament_bouts SET wrestler2_school_id = 159 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'MDTWP';

UPDATE tournament_bouts SET wrestler1_school_id = 172 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler1_school_raw = 'MO';
UPDATE tournament_bouts SET wrestler2_school_id = 172 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'MO';

UPDATE tournament_bouts SET wrestler1_school_id = NULL WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler1_school_raw = 'MS';
UPDATE tournament_bouts SET wrestler2_school_id = NULL WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'MS';

UPDATE tournament_bouts SET wrestler1_school_id = 114 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler1_school_raw = 'MTWN';
UPDATE tournament_bouts SET wrestler2_school_id = 114 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'MTWN';

UPDATE tournament_bouts SET wrestler1_school_id = 196 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler1_school_raw = 'RP';
UPDATE tournament_bouts SET wrestler2_school_id = 196 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'RP';

UPDATE tournament_bouts SET wrestler2_school_id = 164 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'SBW';

UPDATE tournament_bouts SET wrestler1_school_id = 225 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler1_school_raw = 'SHP';
UPDATE tournament_bouts SET wrestler2_school_id = 225 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'SHP';

UPDATE tournament_bouts SET wrestler1_school_id = 216 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler1_school_raw = 'TRE';
UPDATE tournament_bouts SET wrestler2_school_id = 216 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'TRE';

UPDATE tournament_bouts SET wrestler2_school_id = NULL WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'W/MP';

UPDATE tournament_bouts SET wrestler1_school_id = 119 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler1_school_raw = 'WHLS';
UPDATE tournament_bouts SET wrestler2_school_id = 119 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'WHLS';

-- DEL: restore all to Delaware Valley (141)
UPDATE tournament_bouts SET wrestler1_school_id = 141 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler1_school_raw = 'DEL';
UPDATE tournament_bouts SET wrestler2_school_id = 141 WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56' AND wrestler2_school_raw = 'DEL';

-- Note: aliases added by ON CONFLICT DO NOTHING cannot be cleanly rolled back
-- without knowing which rows pre-existed. Delete only if confident they didn't exist before.

COMMIT;
*/

-- ────────────────────────────────────────────────────────────────────────────
-- VERIFICATION — run after applying; check row counts and spot-check schools
-- ────────────────────────────────────────────────────────────────────────────

-- Count of wrestler-positions by school_raw after patch (Sam Cali only).
-- Cross-check: school_id values should match the Correct column from the
-- mapping table in db_changelog.md.
SELECT
  wrestler1_school_raw  AS school_raw,
  wrestler1_school_id   AS school_id,
  COUNT(*)              AS n,
  'w1'                  AS side
FROM tournament_bouts
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
GROUP BY wrestler1_school_raw, wrestler1_school_id

UNION ALL

SELECT
  wrestler2_school_raw,
  wrestler2_school_id,
  COUNT(*),
  'w2'
FROM tournament_bouts
WHERE in_season_tournament_id = 'bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56'
GROUP BY wrestler2_school_raw, wrestler2_school_id

ORDER BY school_raw, side;

-- Spot-check totals by expected school after patch:
--   Bridgewater-Raritan (131):  17 total (B-R)
--   Bound Brook (322):           8 total (BBRK)
--   Chaminade → NULL:           18 total (CHAM)
--   Hackettstown (112):         15 total (HTWN — all 4 Vidal + 11 others)
--   Manasquan (220):             6 total (MANA)
--   Middle Township (283):      14 total (MDTWP)
--   Mt. Olive (56):             20 total (MO)
--   Middletown South (160):      8 total (MS)
--   Moorestown (261):           11 total (MTWN)
--   Roselle Park (125):          5 total (RP)
--   Lodi/Saddle Brook (379):     1 total (SBW)
--   Seton Hall Prep (127):      28 total (SHP)
--   Toms River East (253):       9 total (TRE)
--   Waldwick (9):                1 total (W/MP)
--   Watchung Hills (147):        6 total (WHLS)
--   Delbarton (82):             28 total (DEL)
--   Delsea (290):               15 total (DEL)
