-- Create a non-NJSIAA "Holy Cross Prep" school and relink all East Coast Catholic
-- Classic tournament bouts and wrestlers that were incorrectly matched to NJ Holy
-- Cross (id=201).
--
-- Catholic Classic tournament id: 1d0e6aea-c5ce-4753-9111-b51545355560
-- Affected wrestlers (10): Hopkins/106, Anthony/113, D'Ambrosio/120, Haase/126,
--                          A.Peters/132, Bucchi/144, K.Peters/150, Bowman/157,
--                          N.Wurzberger/215, N.Wurzberger/285

DO $$
DECLARE v_new_id INT;
BEGIN
  INSERT INTO schools (display_name, is_nj)
  VALUES ('Holy Cross Prep', false)
  RETURNING id INTO v_new_id;

  UPDATE tournament_bouts
  SET wrestler1_school_id = v_new_id
  WHERE in_season_tournament_id = '1d0e6aea-c5ce-4753-9111-b51545355560'
    AND wrestler1_school_id = 201;

  UPDATE tournament_bouts
  SET wrestler2_school_id = v_new_id
  WHERE in_season_tournament_id = '1d0e6aea-c5ce-4753-9111-b51545355560'
    AND wrestler2_school_id = 201;

  UPDATE wrestler_name_aliases
  SET school_id = v_new_id
  WHERE school_id = 201
    AND wrestler_id IN (
      '63e91d95-d9fe-4376-9c18-1aec0698884a',  -- Ben Hopkins       106
      '5dedc8ec-ba3b-4d8e-9b03-570fa45ae67d',  -- Jayden Anthony    113
      '2f928395-6018-44d2-aed4-4a568f13187c',  -- John D'Ambrosio   120
      '3d4168cc-b3b9-4973-a9a1-f536a27aba43',  -- Richie Haase      126
      '6de2f56d-38c2-4a67-8a14-55bc3e66e5c2',  -- Aiden Peters      132
      '13f07e3a-4f68-4a5e-b240-4918d4cda74b',  -- Albert Bucchi     144
      '658d41c0-3818-400e-8f3f-de5ffa627cdf',  -- Kevin Peters      150
      '75123732-c730-48d2-9109-7ca35998abe8',  -- Blake Bowman      157
      'ff69c9c9-3a4c-4772-a10b-2cb913cab00b',  -- Nathan Wurzberger 215
      '35f77cc2-275c-485f-8398-cfe2adbae933'   -- Nick Wurzberger   285
    );
END;
$$;
