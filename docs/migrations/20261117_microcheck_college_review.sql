-- docs/migrations/20261117_microcheck_college_review.sql
--
-- College review in Microcheck (Kyle 2026-11-17: "make the college review a micro check"). Data only (no schema
-- change): one task type per side, a queue whose items are the college entrants waiting for review
-- ({boys,girls}_college_entries.match_status = 'review', read by src/app/api/admin/microcheck/_workload.ts), placed
-- last in the Task Order; Kyle can move it there. A decision is logged as a completed microcheck_tasks row
-- (task_type 'college_review') for the scoreboard. Applied by Claude 2026-11-17 with the service role (same statement).

INSERT INTO public.microcheck_task_types (key, label, gender, source, field, queue_type, sort_order, enabled)
VALUES ('boys_college_review',  'College review', 'M', 'queue', NULL, 'college_review', 15, true),
       ('girls_college_review', 'College review', 'F', 'queue', NULL, 'college_review', 16, true)
ON CONFLICT (key) DO NOTHING;

-- ROLLBACK: DELETE FROM public.microcheck_task_types WHERE key IN ('boys_college_review', 'girls_college_review');
