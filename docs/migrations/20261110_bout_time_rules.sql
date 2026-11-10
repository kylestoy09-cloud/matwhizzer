-- docs/migrations/20261110_bout_time_rules.sql
--
-- Kyle's bout-time rules (2026-11-10), enforced on every write so every import path follows them (the
-- one-time fix was 20261110_bout_times_to_6_00.sql):
--   a fall at 0:00-0:02                            → 6:00  (0:00 = time never entered; 0:03 and up can happen)
--   a tech fall under 0:13 (the minimum) or no time → 6:00
--   an injury default at 0:00-0:02 or no time       → 6:00
-- One trigger function on the five bout tables; its argument names the column holding the result
-- (result_type, or win_type in the postseason table, an enum). Only fall_time_seconds is changed.
-- ROLLBACK: DROP TRIGGER bout_time_rules ON each table; DROP FUNCTION public.bout_time_rules().
-- Run in the Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.bout_time_rules() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp' AS $$
DECLARE t text := upper(coalesce(to_jsonb(NEW) ->> TG_ARGV[0], ''));
BEGIN
  IF t = 'FALL' AND NEW.fall_time_seconds < 3 THEN
    NEW.fall_time_seconds := 360;
  ELSIF t LIKE 'TF%' AND (NEW.fall_time_seconds IS NULL OR NEW.fall_time_seconds < 13) THEN
    NEW.fall_time_seconds := 360;
  ELSIF t LIKE 'INJ%' AND (NEW.fall_time_seconds IS NULL OR NEW.fall_time_seconds < 3) THEN
    NEW.fall_time_seconds := 360;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bout_time_rules ON public.dual_meet_matches;
CREATE TRIGGER bout_time_rules BEFORE INSERT OR UPDATE ON public.dual_meet_matches FOR EACH ROW EXECUTE FUNCTION public.bout_time_rules('result_type');
DROP TRIGGER IF EXISTS bout_time_rules ON public.dual_meet_matches_girls;
CREATE TRIGGER bout_time_rules BEFORE INSERT OR UPDATE ON public.dual_meet_matches_girls FOR EACH ROW EXECUTE FUNCTION public.bout_time_rules('result_type');
DROP TRIGGER IF EXISTS bout_time_rules ON public.tournament_bouts;
CREATE TRIGGER bout_time_rules BEFORE INSERT OR UPDATE ON public.tournament_bouts FOR EACH ROW EXECUTE FUNCTION public.bout_time_rules('result_type');
DROP TRIGGER IF EXISTS bout_time_rules ON public.tournament_bouts_girls;
CREATE TRIGGER bout_time_rules BEFORE INSERT OR UPDATE ON public.tournament_bouts_girls FOR EACH ROW EXECUTE FUNCTION public.bout_time_rules('result_type');
DROP TRIGGER IF EXISTS bout_time_rules ON public.matches;
CREATE TRIGGER bout_time_rules BEFORE INSERT OR UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.bout_time_rules('win_type');

-- Verify: five rows, one per bout table
SELECT tgrelid::regclass AS on_table, tgname FROM pg_trigger WHERE tgname = 'bout_time_rules' ORDER BY 1;
