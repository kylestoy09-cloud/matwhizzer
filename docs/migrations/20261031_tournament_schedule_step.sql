-- Preseason step "Enter Tournament Schedule" for boys and girls (2026-10-31).
-- Each season the tournament schedule (names and dates) is entered by hand in the
-- Tournament Registry; the Tournament Checklist now compares imported tournaments
-- against that list instead of a list typed into the code. The step sits just before
-- "Roll Over Tournaments". The checklist works for both sides again.
DO $$
BEGIN
  UPDATE public.admin_tasks SET order_index = order_index + 1
  WHERE dashboard = 'preseason' AND group_type = 'process' AND order_index >= 3
    AND NOT EXISTS (SELECT 1 FROM public.admin_tasks WHERE process_key = 'tournament_schedule');

  INSERT INTO public.admin_tasks (dashboard, group_type, process_key, title, description, workspace_tool, order_index, gender)
  SELECT 'preseason', 'process', 'tournament_schedule', 'Enter Tournament Schedule',
         'Enter this season''s tournaments and dates in the Tournament Registry', 'tournament_schedule', 3, g
  FROM (VALUES ('M'), ('F')) AS v(g)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.admin_tasks t
    WHERE t.dashboard = 'preseason' AND t.process_key = 'tournament_schedule' AND t.gender = v.g
  );

  UPDATE public.admin_tool_registry
  SET gender = 'both', path = '/admin/tournament-checklist', updated_at = now()
  WHERE key = 'tournament_checklist';
END $$;

-- Check: six preseason steps per gender; the schedule step is order 3, before Roll Over Tournaments
SELECT gender, order_index, process_key, title FROM public.admin_tasks
WHERE dashboard = 'preseason' AND group_type = 'process' ORDER BY gender, order_index;
