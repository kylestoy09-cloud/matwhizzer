-- Create a non-NJSIAA Pitman school (OOS, California) and relink all Doc Buchanan
-- tournament bouts and wrestlers that were incorrectly linked to NJ Pitman (id=311).
--
-- Doc Buchanan tournament id: 34cac166-64d8-4b27-995e-193d3340d44b
-- Affected wrestlers (8): Camacho, Wilharm, Sheeran, M. Ontiveros, Padilla,
--                         Ma. Ontiveros, Vannest, Mora
--
-- All three UPDATE statements use the RETURNING id from the INSERT so this
-- is one atomic transaction; no manual ID lookup needed.

DO $$
DECLARE v_new_id INT;
BEGIN
  INSERT INTO schools (display_name, is_nj)
  VALUES ('Pitman', false)
  RETURNING id INTO v_new_id;

  UPDATE tournament_bouts
  SET wrestler1_school_id = v_new_id
  WHERE in_season_tournament_id = '34cac166-64d8-4b27-995e-193d3340d44b'
    AND wrestler1_school_id = 311;

  UPDATE tournament_bouts
  SET wrestler2_school_id = v_new_id
  WHERE in_season_tournament_id = '34cac166-64d8-4b27-995e-193d3340d44b'
    AND wrestler2_school_id = 311;

  UPDATE wrestler_name_aliases
  SET school_id = v_new_id
  WHERE school_id = 311
    AND wrestler_id IN (
      '796cf3c8-cd93-468a-a9cf-61bf5f0a29dc',  -- Gabrial Camacho   116
      '5b351ca6-fdd8-4961-b041-48a5abf0f63e',  -- Rj Wilharm        135
      '6cebd122-2227-46d1-a8c8-893a7ed10f0f',  -- Ej Sheeran        147
      'd8c62478-dd20-4560-aed3-3a4c20d748b7',  -- Mika Ontiveros    153
      'a2c9f4f4-2dc6-479f-b260-e4d7d8f37b05',  -- Xadian Padilla    168
      'c6358ede-0be7-4560-9c89-7df6ea8fa1de',  -- Mason Ontiveros   178
      'fb246d93-8f94-47c7-a5bb-4b3a2ced840e',  -- Carter Vannest    193
      'e33c8b08-73fd-447e-b900-5dc35e110f1d'   -- Jeremiah Mora     218
    );
END;
$$;
