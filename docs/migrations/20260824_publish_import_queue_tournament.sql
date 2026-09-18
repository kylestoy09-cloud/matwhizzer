-- Atomic publish function for tournament_rtf import queue items.
--
-- Runs in a single transaction. Any INSERT/UPDATE failure auto-rolls back all
-- writes; the import_queue row stays in 'ready_for_review' for retry.
--
-- reviewed_data shape:
-- {
--   "tournament": {
--     "id":                        "<uuid | null>",   -- existing in_season_tournament id; null = create
--     "name":                      "...",
--     "season":                    "2025-26",
--     "season_id":                 2,
--     "start_date":                "YYYY-MM-DD",
--     "end_date":                  "YYYY-MM-DD | null",
--     "location":                  "... | null",
--     "gender":                    "M | F",
--     "source_format":             "rtf",
--     "tournament_type":           "inside | outside | inside_outside | null",
--     "is_oos":                    false,
--     "is_grade_confirmation_event": false   -- true for district-level imports
--   },
--   "bouts": [
--     {
--       "weight_class":        106,
--       "round":               "F",
--       "nj_wrestler1_id":     "<uuid | null>",
--       "wrestler1_name_raw":  "Smith John",
--       "wrestler1_school_id": 42,
--       "wrestler1_school_raw":"Hackettstown",
--       "wrestler1_grade":     "Sr | null",   -- populated from district import data
--       "nj_wrestler2_id":     "<uuid | null>",
--       "wrestler2_name_raw":  "Jones Bob",
--       "wrestler2_school_id": 78,
--       "wrestler2_school_raw":"Warren Hills",
--       "wrestler2_grade":     "Jr | null",
--       "winner":              1,
--       "result_type":         "dec",
--       "result_detail":       "3-2",
--       "fall_time_seconds":   null
--     }
--   ]
-- }

CREATE OR REPLACE FUNCTION publish_import_queue_tournament(
  p_queue_id    uuid,
  p_admin_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item              record;
  v_tournament        jsonb;
  v_bouts             jsonb;
  v_bout              jsonb;
  v_tournament_id     uuid;
  v_is_grade_event    boolean;
  v_bouts_count       int := 0;
  v_grades_confirmed  int := 0;
  v_grade_val         text;
  v_wrestler_id       uuid;
  i                   int;
BEGIN
  SELECT id, status, source_type, reviewed_data
  INTO v_item
  FROM import_queue
  WHERE id = p_queue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Queue item not found');
  END IF;

  IF v_item.status != 'ready_for_review' THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', 'Item is not ready_for_review (current status: ' || v_item.status || ')'
    );
  END IF;

  IF v_item.source_type != 'tournament_rtf' THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', 'This function only publishes tournament_rtf items (got: ' || v_item.source_type || ')'
    );
  END IF;

  v_tournament     := v_item.reviewed_data -> 'tournament';
  v_bouts          := v_item.reviewed_data -> 'bouts';
  v_is_grade_event := COALESCE((v_tournament ->> 'is_grade_confirmation_event')::boolean, false);

  IF v_tournament IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reviewed_data.tournament is missing');
  END IF;

  -- ── Get or create in_season_tournaments row ───────────────────────────────────
  -- If a UUID was supplied (tournament pre-exists from rollover), use it.
  -- Otherwise create a new row; the unique index on (name, season) will error
  -- if a duplicate exists — that's intentional (fail loudly, not silently).

  IF (v_tournament ->> 'id') IS NOT NULL AND (v_tournament ->> 'id') != 'null' THEN
    v_tournament_id := (v_tournament ->> 'id')::uuid;
  ELSE
    INSERT INTO in_season_tournaments (
      name,
      season,
      season_id,
      start_date,
      end_date,
      location,
      gender,
      source_format,
      tournament_type,
      is_oos
    ) VALUES (
      v_tournament ->> 'name',
      COALESCE(v_tournament ->> 'season', '2025-26'),
      NULLIF(v_tournament ->> 'season_id', 'null')::int,
      (v_tournament ->> 'start_date')::date,
      NULLIF(v_tournament ->> 'end_date', 'null')::date,
      NULLIF(v_tournament ->> 'location', 'null'),
      COALESCE(v_tournament ->> 'gender', 'M'),
      COALESCE(v_tournament ->> 'source_format', 'rtf'),
      NULLIF(v_tournament ->> 'tournament_type', 'null'),
      COALESCE((v_tournament ->> 'is_oos')::boolean, false)
    )
    RETURNING id INTO v_tournament_id;
  END IF;

  -- ── Insert bouts ─────────────────────────────────────────────────────────────
  IF v_bouts IS NOT NULL AND jsonb_typeof(v_bouts) = 'array' THEN
    FOR i IN 0 .. jsonb_array_length(v_bouts) - 1 LOOP
      v_bout := v_bouts -> i;

      INSERT INTO tournament_bouts (
        in_season_tournament_id,
        weight_class,
        round,
        nj_wrestler1_id,
        wrestler1_name_raw,
        wrestler1_school_id,
        wrestler1_school_raw,
        nj_wrestler2_id,
        wrestler2_name_raw,
        wrestler2_school_id,
        wrestler2_school_raw,
        winner,
        result_type,
        result_detail,
        fall_time_seconds,
        source_format
      ) VALUES (
        v_tournament_id,
        (v_bout ->> 'weight_class')::int,
        COALESCE(v_bout ->> 'round', ''),
        NULLIF(v_bout ->> 'nj_wrestler1_id',  'null')::uuid,
        COALESCE(v_bout ->> 'wrestler1_name_raw',  ''),
        NULLIF(v_bout ->> 'wrestler1_school_id', 'null')::int,
        COALESCE(v_bout ->> 'wrestler1_school_raw', ''),
        NULLIF(v_bout ->> 'nj_wrestler2_id',  'null')::uuid,
        COALESCE(v_bout ->> 'wrestler2_name_raw',  ''),
        NULLIF(v_bout ->> 'wrestler2_school_id', 'null')::int,
        COALESCE(v_bout ->> 'wrestler2_school_raw', ''),
        NULLIF(v_bout ->> 'winner', 'null')::smallint,
        NULLIF(v_bout ->> 'result_type', 'null'),
        NULLIF(v_bout ->> 'result_detail', 'null'),
        NULLIF(v_bout ->> 'fall_time_seconds', 'null')::int,
        COALESCE(v_tournament ->> 'source_format', 'rtf')
      );

      v_bouts_count := v_bouts_count + 1;

      -- ── Grade confirmation (district imports only) ──────────────────────────
      -- Only fires when is_grade_confirmation_event = true.
      -- Does not overwrite an already-confirmed grade (grade_confirmed_at IS NOT NULL)
      -- unless this district import is more recent (grade_confirmed_source != 'districts').
      -- Valid grade values: 'Fr', 'So', 'Jr', 'Sr' — others are ignored.

      IF v_is_grade_event THEN
        -- Wrestler 1
        v_wrestler_id := NULLIF(v_bout ->> 'nj_wrestler1_id', 'null')::uuid;
        v_grade_val   := v_bout ->> 'wrestler1_grade';
        IF v_wrestler_id IS NOT NULL
           AND v_grade_val IN ('Fr', 'So', 'Jr', 'Sr')
        THEN
          UPDATE wrestlers
          SET    grade                  = v_grade_val,
                 grade_confirmed_at     = now(),
                 grade_confirmed_source = 'districts'
          WHERE  id = v_wrestler_id
            AND  (grade_confirmed_at IS NULL OR grade_confirmed_source != 'districts');
          IF FOUND THEN v_grades_confirmed := v_grades_confirmed + 1; END IF;
        END IF;

        -- Wrestler 2
        v_wrestler_id := NULLIF(v_bout ->> 'nj_wrestler2_id', 'null')::uuid;
        v_grade_val   := v_bout ->> 'wrestler2_grade';
        IF v_wrestler_id IS NOT NULL
           AND v_grade_val IN ('Fr', 'So', 'Jr', 'Sr')
        THEN
          UPDATE wrestlers
          SET    grade                  = v_grade_val,
                 grade_confirmed_at     = now(),
                 grade_confirmed_source = 'districts'
          WHERE  id = v_wrestler_id
            AND  (grade_confirmed_at IS NULL OR grade_confirmed_source != 'districts');
          IF FOUND THEN v_grades_confirmed := v_grades_confirmed + 1; END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- ── Mark published ────────────────────────────────────────────────────────────
  UPDATE import_queue
  SET    status       = 'published',
         published_at = now()
  WHERE  id = p_queue_id;

  INSERT INTO admin_activity_log (admin_email, action, entity_type, entity_id, details)
  VALUES (
    p_admin_email,
    'import_queue_publish',
    'import_queue',
    p_queue_id::text,
    jsonb_build_object(
      'source_type',          'tournament_rtf',
      'tournament_id',        v_tournament_id,
      'bouts_written',        v_bouts_count,
      'grades_confirmed',     v_grades_confirmed,
      'is_grade_event',       v_is_grade_event
    )
  );

  RETURN jsonb_build_object(
    'ok',               true,
    'tournament_id',    v_tournament_id,
    'bouts_written',    v_bouts_count,
    'grades_confirmed', v_grades_confirmed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION publish_import_queue_tournament(uuid, text) TO service_role;

-- Rollback:
--   DROP FUNCTION IF EXISTS publish_import_queue_tournament(uuid, text);
