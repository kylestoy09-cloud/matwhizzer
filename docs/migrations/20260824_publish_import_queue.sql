-- Creates publish_import_queue_dual_meet — atomic publish for dual_meet queue items.
--
-- The function runs entirely inside a single transaction. If any INSERT fails,
-- Postgres rolls back all writes automatically and the import_queue row stays in
-- 'ready_for_review' status so the admin can retry.
--
-- reviewed_data shape (stored in import_queue.reviewed_data):
-- {
--   "meets": [
--     {
--       "season_id": 2,
--       "gender": "M",
--       "team1_school_id": 42,
--       "team2_school_id": 78,
--       "team1_school_name_raw": "Hackettstown",
--       "team2_school_name_raw": "Warren Hills",
--       "meet_date": "2026-01-15",
--       "team1_score": 45,
--       "team2_score": 9,
--       "status": "final",
--       "is_playoff": false,
--       "matches": [
--         {
--           "weight_class": 106,
--           "order_index": 0,
--           "wrestler_a_id": "<uuid or null>",
--           "wrestler_b_id": "<uuid or null>",
--           "wrestler_a_name_raw": "Smith",
--           "wrestler_b_name_raw": "Jones",
--           "school_a_id": 42,
--           "school_b_id": 78,
--           "winner_id": "<uuid or null>",
--           "result_type": "fall",
--           "result_detail": "fall 3:45",
--           "fall_time_seconds": 225,
--           "result_time_estimated": false,
--           "winner_score": null,
--           "loser_score": null,
--           "team1_points": 6,
--           "team2_points": 0,
--           "is_double_forfeit": false,
--           "is_forfeit_win": false
--         }
--       ]
--     }
--   ]
-- }

CREATE OR REPLACE FUNCTION publish_import_queue_dual_meet(
  p_queue_id    uuid,
  p_admin_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item        record;
  v_meets       jsonb;
  v_meet        jsonb;
  v_match       jsonb;
  v_meet_id     uuid;
  v_meets_count int := 0;
  v_match_count int := 0;
  i             int;
  j             int;
BEGIN
  -- Lock the row so concurrent publish calls are serialized
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

  IF v_item.source_type != 'dual_meet' THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', 'This function only publishes dual_meet items (got: ' || v_item.source_type || ')'
    );
  END IF;

  v_meets := v_item.reviewed_data -> 'meets';

  IF v_meets IS NULL OR jsonb_typeof(v_meets) != 'array' OR jsonb_array_length(v_meets) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reviewed_data.meets is empty or missing');
  END IF;

  FOR i IN 0 .. jsonb_array_length(v_meets) - 1 LOOP
    v_meet := v_meets -> i;

    INSERT INTO dual_meets (
      season_id,
      team1_school_id,
      team2_school_id,
      team1_school_name_raw,
      team2_school_name_raw,
      meet_date,
      team1_score,
      team2_score,
      gender,
      status,
      schedule_source,
      is_playoff
    ) VALUES (
      (v_meet ->> 'season_id')::int,
      NULLIF(v_meet ->> 'team1_school_id', 'null')::int,
      NULLIF(v_meet ->> 'team2_school_id', 'null')::int,
      v_meet ->> 'team1_school_name_raw',
      v_meet ->> 'team2_school_name_raw',
      (v_meet ->> 'meet_date')::date,
      NULLIF(v_meet ->> 'team1_score', 'null')::int,
      NULLIF(v_meet ->> 'team2_score', 'null')::int,
      COALESCE(v_meet ->> 'gender', 'M'),
      COALESCE(v_meet ->> 'status', 'final'),
      'import_queue',
      COALESCE((v_meet ->> 'is_playoff')::boolean, false)
    )
    RETURNING id INTO v_meet_id;

    v_meets_count := v_meets_count + 1;

    IF (v_meet -> 'matches') IS NOT NULL AND jsonb_typeof(v_meet -> 'matches') = 'array' THEN
      FOR j IN 0 .. jsonb_array_length(v_meet -> 'matches') - 1 LOOP
        v_match := (v_meet -> 'matches') -> j;

        INSERT INTO dual_meet_matches (
          dual_meet_id,
          weight_class,
          order_index,
          wrestler_a_id,
          wrestler_b_id,
          wrestler_a_name_raw,
          wrestler_b_name_raw,
          school_a_id,
          school_b_id,
          winner_id,
          result_type,
          result_detail,
          fall_time_seconds,
          result_time_estimated,
          winner_score,
          loser_score,
          team1_points,
          team2_points,
          is_double_forfeit,
          is_forfeit_win,
          validated
        ) VALUES (
          v_meet_id,
          (v_match ->> 'weight_class')::int,
          NULLIF(v_match ->> 'order_index', 'null')::int,
          NULLIF(v_match ->> 'wrestler_a_id', 'null')::uuid,
          NULLIF(v_match ->> 'wrestler_b_id', 'null')::uuid,
          v_match ->> 'wrestler_a_name_raw',
          v_match ->> 'wrestler_b_name_raw',
          NULLIF(v_match ->> 'school_a_id', 'null')::int,
          NULLIF(v_match ->> 'school_b_id', 'null')::int,
          NULLIF(v_match ->> 'winner_id', 'null')::uuid,
          v_match ->> 'result_type',
          v_match ->> 'result_detail',
          NULLIF(v_match ->> 'fall_time_seconds', 'null')::int,
          COALESCE((v_match ->> 'result_time_estimated')::boolean, false),
          NULLIF(v_match ->> 'winner_score', 'null')::smallint,
          NULLIF(v_match ->> 'loser_score', 'null')::smallint,
          NULLIF(v_match ->> 'team1_points', 'null')::int,
          NULLIF(v_match ->> 'team2_points', 'null')::int,
          COALESCE((v_match ->> 'is_double_forfeit')::boolean, false),
          COALESCE((v_match ->> 'is_forfeit_win')::boolean, false),
          false
        );

        v_match_count := v_match_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  -- Mark published — do this last so any exception above keeps status as ready_for_review
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
      'meets_written',   v_meets_count,
      'matches_written', v_match_count
    )
  );

  RETURN jsonb_build_object(
    'ok',              true,
    'meets_written',   v_meets_count,
    'matches_written', v_match_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION publish_import_queue_dual_meet(uuid, text) TO service_role;

-- Rollback:
--   DROP FUNCTION IF EXISTS publish_import_queue_dual_meet(uuid, text);
