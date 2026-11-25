-- docs/migrations/20261114_district24_2013_podium.sql
--
-- 2012-13 boys District 24 (tournament 243). Kyle 2026-11-14.
--
-- 1. REMOVE the wrong event. FloWrestling's "NJSIAA District 24" dated 2/22/2013 is not that year's district: its
--    wrestlers wrestled other weights at Region 6 that week, none of Region 6's District 24 qualifiers (Kevin Corrigan …)
--    are in it, and its champions match neither the real 2012-13 nor 2013-14 District 24 champions. Kyle approved the
--    delete with the counts in hand ("yeah"): 134 bouts, 11 calculated team scores, 134 entries, 134 + 134 staged rows,
--    and 13 profiles that exist only because of it (made by the import; nothing else references them —
--    wrestler_completeness is a view and drops them by itself). Backup: docs/migrations/backups/20261114_district24_2013_wrong_event.json.
--    Hidden Playoff History season; nothing in a live season is touched.
--
-- 2. ADD history_podiums: a podium with no bracket (1st-3rd and the team order), for a postseason event whose bouts
--    aren't on file. Source: Shore Conference Wrestling Archives 2013 team pages (11 District 24 schools), every placer
--    linked to his 2012-13 Region 6 profile (all 42 qualified for Region 6).
--
-- 3. district_placements (the live 5th/6th-place version, 20261102_district_placements_5th.sql) reads history_podiums
--    when the district has no placement bouts.
--
-- Run in the Supabase SQL editor.

DO $$
DECLARE n integer;
BEGIN
  PERFORM set_config('matwhizzer.allow_protected_delete', 'on', true);

  SELECT count(*) INTO n FROM tournament_entries WHERE tournament_id = 243;
  IF n <> 134 THEN RAISE EXCEPTION 'tournament 243 has % entries, expected 134 — stop', n; END IF;
  SELECT count(*) INTO n FROM tournament_entries WHERE tournament_id <> 243 AND wrestler_id IN (
    '09bb2463-360e-44bd-8017-83d608e49020',
    '162f90a6-dd52-430a-882d-3dbbdbf40268',
    '19df612f-e8c7-435d-884b-9a489a74260f',
    '688f636b-5843-47a1-9a57-9bc4807b17ce',
    '7833f46a-152c-40c3-8e10-24752b0a6072',
    '79f49f66-e259-4a97-a302-d77e333ca7bf',
    '85fc597c-77d2-42d9-9b0e-b742cc3b9cf6',
    '88b4b0cc-adbf-488f-962b-c458e202620e',
    '9061c7e4-770b-49b5-b16e-ef67747963b0',
    'b42af6fb-f005-462b-bac4-0698f6f11cb5',
    'ca39821f-bbc5-49d9-8812-928d8afe136d',
    'e53d2f4b-3d3d-4e7b-afbc-57bdb130a1b6',
    'f79a2b5c-7e5b-402e-985d-dd52ce56ef46');
  IF n <> 0 THEN RAISE EXCEPTION 'the 13 profiles have % entries elsewhere — stop', n; END IF;

  DELETE FROM matches WHERE tournament_id = 243;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'matches %', n;
  DELETE FROM precomputed_team_scores WHERE tournament_id = 243;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'team scores %', n;
  DELETE FROM tournament_entries WHERE tournament_id = 243;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'entries %', n;
  DELETE FROM playoff_history_bouts WHERE gender = 'M' AND season_id = 2013 AND kind = 'district' AND num = 24;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'staged bouts %', n;
  DELETE FROM playoff_history_entrants WHERE gender = 'M' AND season_id = 2013 AND kind = 'district' AND num = 24;
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'staged entrants %', n;
  DELETE FROM playoff_history_profiles WHERE wrestler_id IN (
    '09bb2463-360e-44bd-8017-83d608e49020',
    '162f90a6-dd52-430a-882d-3dbbdbf40268',
    '19df612f-e8c7-435d-884b-9a489a74260f',
    '688f636b-5843-47a1-9a57-9bc4807b17ce',
    '7833f46a-152c-40c3-8e10-24752b0a6072',
    '79f49f66-e259-4a97-a302-d77e333ca7bf',
    '85fc597c-77d2-42d9-9b0e-b742cc3b9cf6',
    '88b4b0cc-adbf-488f-962b-c458e202620e',
    '9061c7e4-770b-49b5-b16e-ef67747963b0',
    'b42af6fb-f005-462b-bac4-0698f6f11cb5',
    'ca39821f-bbc5-49d9-8812-928d8afe136d',
    'e53d2f4b-3d3d-4e7b-afbc-57bdb130a1b6',
    'f79a2b5c-7e5b-402e-985d-dd52ce56ef46');
  DELETE FROM wrestlers WHERE id IN (
    '09bb2463-360e-44bd-8017-83d608e49020',
    '162f90a6-dd52-430a-882d-3dbbdbf40268',
    '19df612f-e8c7-435d-884b-9a489a74260f',
    '688f636b-5843-47a1-9a57-9bc4807b17ce',
    '7833f46a-152c-40c3-8e10-24752b0a6072',
    '79f49f66-e259-4a97-a302-d77e333ca7bf',
    '85fc597c-77d2-42d9-9b0e-b742cc3b9cf6',
    '88b4b0cc-adbf-488f-962b-c458e202620e',
    '9061c7e4-770b-49b5-b16e-ef67747963b0',
    'b42af6fb-f005-462b-bac4-0698f6f11cb5',
    'ca39821f-bbc5-49d9-8812-928d8afe136d',
    'e53d2f4b-3d3d-4e7b-afbc-57bdb130a1b6',
    'f79a2b5c-7e5b-402e-985d-dd52ce56ef46');
  GET DIAGNOSTICS n = ROW_COUNT; RAISE NOTICE 'wrestlers %', n;
END $$;

CREATE TABLE IF NOT EXISTS history_podiums (
  id            bigserial PRIMARY KEY,
  tournament_id integer   NOT NULL REFERENCES tournaments(id),
  weight        integer,                       -- NULL = a team-order row
  place         smallint  NOT NULL,
  wrestler_id   uuid      REFERENCES wrestlers(id),
  school_id     integer   REFERENCES schools(id),
  source        text      NOT NULL,
  UNIQUE (tournament_id, weight, place)
);
ALTER TABLE history_podiums ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS history_podiums_read ON history_podiums;
CREATE POLICY history_podiums_read ON history_podiums FOR SELECT USING (true);
GRANT SELECT ON history_podiums TO anon, authenticated;
GRANT ALL ON history_podiums TO service_role;
GRANT USAGE, SELECT ON SEQUENCE history_podiums_id_seq TO service_role;

INSERT INTO history_podiums (tournament_id, weight, place, wrestler_id, school_id, source)
SELECT v.t::integer, v.w::integer, v.p::smallint, v.wid::uuid, v.sid::integer, 'Shore Conference Wrestling Archives (2013 team pages)'
FROM (VALUES
  (243, 106, 1, '5928923b-8741-43fd-9d10-aeaf15879f52', 255),
  (243, 106, 2, 'eb40d2a9-bb3e-44a0-8355-f02f2d8513be', 252),
  (243, 106, 3, '1f07b30b-74ab-4fd3-b47b-3017b1a25ea6', 246),
  (243, 113, 1, '2c87c04a-d04c-4e51-beb0-9d646e92eed7', 255),
  (243, 113, 2, '60e3c385-b042-4a9d-8b0b-df9ef70d2c34', 249),
  (243, 113, 3, 'df389904-7c97-4a98-a692-392c5c341d6e', 252),
  (243, 120, 1, '38c51f9b-823f-4a59-84c6-7c9e0519a489', 255),
  (243, 120, 2, 'a37f552e-fba2-4484-9ee1-c8ffd89774f2', 249),
  (243, 120, 3, 'f04285ee-772a-4f2a-ba49-938e02decdfd', 253),
  (243, 126, 1, '8f7e5803-9aef-4b8f-95dd-fe13623b9f9f', 255),
  (243, 126, 2, '3ae80b2c-1928-40ab-b964-61a46aedfef7', 252),
  (243, 126, 3, '3735cac6-e55a-4367-988e-a3efb384b81d', 251),
  (243, 132, 1, 'c43259be-3b38-4f74-9c12-e760a157aa7c', 252),
  (243, 132, 2, 'f6c7108a-e8f7-4182-9b6f-536e4042a117', 254),
  (243, 132, 3, '434c9154-8ca1-4daa-bacc-73d185499db5', 246),
  (243, 138, 1, 'cc58899a-8920-4ba4-b175-0c16229d4cb8', 253),
  (243, 138, 2, '42d04d51-562f-4410-86e3-43c3e3390742', 252),
  (243, 138, 3, 'cae1bc71-92df-44f9-8c70-e5bf3823d398', 249),
  (243, 145, 1, 'e457d7d6-b9ad-478f-88af-ed2b45e02505', 255),
  (243, 145, 2, '8b7483be-1be4-4679-bcd5-ade4bf797400', 252),
  (243, 145, 3, '8cdc3a23-75df-4857-9a42-bbd83cf48b07', 249),
  (243, 152, 1, '3518b046-cd35-481e-b7d0-d9449194cb6a', 252),
  (243, 152, 2, '9e093d53-ba19-4912-b9a2-b8b1e4047aa9', 254),
  (243, 152, 3, '0339a5d4-aba6-4408-a30f-b9c3e70796f4', 255),
  (243, 160, 1, 'e13cc36d-81d4-40b3-9361-8497578a8ff6', 252),
  (243, 160, 2, 'a54a8eb2-680a-477b-9f61-aad6acd7a9e8', 255),
  (243, 160, 3, '3e56feaa-2620-44d0-b119-4a8b1dd2ffc4', 250),
  (243, 170, 1, '0edb65a7-2e58-4c04-af48-f4b2a5b4f88f', 249),
  (243, 170, 2, '5d65cd5f-2d65-48e4-b5e1-878644cdaf7c', 254),
  (243, 170, 3, 'ba921109-18f3-40c2-accd-ba7db5f3771f', 246),
  (243, 182, 1, 'd7312a27-6896-409b-9918-01c40e6123cd', 252),
  (243, 182, 2, 'bce23dc2-ecc8-4559-a026-a7d714d09207', 255),
  (243, 182, 3, 'a3b7a923-e8f2-46d1-b73e-483b390c925c', 246),
  (243, 195, 1, 'e62521a8-fe9a-450d-a221-6c01f1a6c7ca', 254),
  (243, 195, 2, '43aa7dc1-ad0b-4a8b-8c94-6a411ddbbc02', 253),
  (243, 195, 3, '2b27570c-2355-409a-9a87-c076acb674d2', 247),
  (243, 220, 1, 'c45eeb4c-3b20-41cb-a456-6653ac7fc198', 249),
  (243, 220, 2, '166d7418-1cc3-47ce-b1e9-0d0edd9b66c6', 246),
  (243, 220, 3, 'a3ecfd61-635b-4f0a-87a9-be0e82d0de66', 252),
  (243, 285, 1, 'd2e15f48-d760-41a3-9409-86da8cd93637', 255),
  (243, 285, 2, 'eb8c26a5-6039-4780-b8bb-abf1f11d1304', 247),
  (243, 285, 3, '268e8184-50fb-42f7-80e9-0924c2b451d8', 246)
) AS v(t, w, p, wid, sid);

INSERT INTO history_podiums (tournament_id, weight, place, wrestler_id, school_id, source)
SELECT v.t::integer, v.w::integer, v.p::smallint, v.wid::uuid, v.sid::integer, 'Shore Conference Wrestling Archives (2013 team pages)'
FROM (VALUES
  (243, NULL, 1, NULL, 252),
  (243, NULL, 2, NULL, 255),
  (243, NULL, 3, NULL, 249),
  (243, NULL, 4, NULL, 254),
  (243, NULL, 5, NULL, 246),
  (243, NULL, 6, NULL, 253),
  (243, NULL, 7, NULL, 247),
  (243, NULL, 8, NULL, 250),
  (243, NULL, 9, NULL, 251),
  (243, NULL, 10, NULL, 248),
  (243, NULL, 11, NULL, 203)
) AS v(t, w, p, wid, sid);

-- district_placements: bouts first; a district with no placement bouts reads its history_podiums rows
CREATE OR REPLACE FUNCTION public.district_placements(p_district integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(weight integer, place integer, wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Districts District ' || p_district::text
      AND gender = p_gender AND season_id = p_season
  ),
  sides AS (
    SELECT wc.weight::int AS w,
      CASE m.round::text WHEN 'F' THEN 1 WHEN '3rd_Place' THEN 3 ELSE 5 END + CASE WHEN s.won THEN 0 ELSE 1 END AS p,
      CASE WHEN s.won THEN m.winner_entry_id ELSE m.loser_entry_id END AS entry_id
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN weight_classes wc ON wc.id = m.weight_class_id
    CROSS JOIN (VALUES (true), (false)) s(won)
    WHERE m.validated = true
      AND ((m.round = 'F' AND m.bracket_side = 'championship') OR m.round::text IN ('3rd_Place', '5th_Place'))
  ),
  from_bouts AS (
    SELECT sd.w, sd.p, te.wrestler_id,
      TRIM(COALESCE(wr.first_name, '') || ' ' || COALESCE(wr.last_name, '')) AS nm,
      te.school_id
    FROM sides sd
    JOIN tournament_entries te ON te.id = sd.entry_id
    LEFT JOIN wrestlers wr ON wr.id = te.wrestler_id
    WHERE te.wrestler_id IS NOT NULL
  ),
  from_podium AS (
    SELECT hp.weight, hp.place::int, hp.wrestler_id,
      TRIM(COALESCE(wr.first_name, '') || ' ' || COALESCE(wr.last_name, '')), hp.school_id
    FROM history_podiums hp JOIN t ON hp.tournament_id = t.id
    LEFT JOIN wrestlers wr ON wr.id = hp.wrestler_id
    WHERE hp.weight IS NOT NULL AND NOT EXISTS (SELECT 1 FROM from_bouts)
  ),
  allp AS (SELECT * FROM from_bouts UNION ALL SELECT * FROM from_podium)
  SELECT a.w, a.p, a.wrestler_id, a.nm,
    school_display_name(a.school_id, p_season, p_gender::text),
    school_display_name(a.school_id, p_season, p_gender::text),
    a.school_id
  FROM allp a
  ORDER BY 1, 2;
$function$;

-- Verify (expect 42 placers, 11 team rows, 0 bouts / entries; Corrigan first at 113)
SELECT (SELECT count(*) FROM history_podiums WHERE tournament_id = 243 AND weight IS NOT NULL) AS placers,
       (SELECT count(*) FROM history_podiums WHERE tournament_id = 243 AND weight IS NULL) AS team_rows,
       (SELECT count(*) FROM matches WHERE tournament_id = 243) AS bouts,
       (SELECT count(*) FROM tournament_entries WHERE tournament_id = 243) AS entries,
       (SELECT wrestler_name || ' (' || school_name || ')' FROM district_placements(24, 'M', 2013::smallint) WHERE weight = 113 AND place = 1) AS d24_113_champion;

-- ROLLBACK: DROP TABLE history_podiums; re-run district_placements from docs/migrations/20261102_district_placements_5th.sql;
-- restore the removed rows from the backup JSON (scripts can re-insert them with the guard set).
