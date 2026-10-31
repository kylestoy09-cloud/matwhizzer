-- Admin boys and girls sides (2026-10-30): tasks and articles belong to one side.
--
-- admin_tasks: every dashboard task is a boys task or a girls task. The five
-- existing tasks (the preseason process steps) are boys tasks; girls get their
-- own copy of each process step so the girls preseason dashboard has its checklist.
-- articles: written for one side (the table is empty today).
--
-- Run this BEFORE deploying the admin sides code: the task panels and article
-- lists filter on these columns.
DO $$
BEGIN
  ALTER TABLE public.admin_tasks ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'M';
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_tasks_gender_check') THEN
    ALTER TABLE public.admin_tasks ADD CONSTRAINT admin_tasks_gender_check CHECK (gender IN ('M', 'F'));
  END IF;
  CREATE INDEX IF NOT EXISTS admin_tasks_gender_idx ON public.admin_tasks (gender);
  -- One process step per dashboard per gender (was per dashboard)
  DROP INDEX IF EXISTS public.admin_tasks_process_key_idx;
  CREATE UNIQUE INDEX admin_tasks_process_key_idx
    ON public.admin_tasks (dashboard, process_key, gender) WHERE process_key IS NOT NULL;

  INSERT INTO public.admin_tasks (dashboard, group_type, process_key, title, description, workspace_tool, workspace_href, due_date, order_index, created_by, gender)
  SELECT t.dashboard, t.group_type, t.process_key, t.title, t.description, t.workspace_tool, t.workspace_href, NULL, t.order_index, t.created_by, 'F'
  FROM public.admin_tasks t
  WHERE t.gender = 'M' AND t.group_type = 'process'
    AND NOT EXISTS (
      SELECT 1 FROM public.admin_tasks g
      WHERE g.gender = 'F' AND g.dashboard = t.dashboard AND g.process_key = t.process_key
    );

  ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'M';
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articles_gender_check') THEN
    ALTER TABLE public.articles ADD CONSTRAINT articles_gender_check CHECK (gender IN ('M', 'F'));
  END IF;
END $$;

-- Check: expect boys 5 / girls 5 tasks, and the articles column present
SELECT gender, count(*) FROM public.admin_tasks GROUP BY gender ORDER BY gender;
SELECT column_name FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'gender';
