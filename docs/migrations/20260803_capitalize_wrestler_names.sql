-- docs/migrations/20260803_capitalize_wrestler_names.sql
--
-- Capitalizes the first character of first_name and last_name for all wrestlers
-- where either field starts with a lowercase letter. Leaves the rest of the name
-- unchanged (preserves DeLuca, D'Ambrosio, deJong, etc.).
-- Also corrects three confirmed typos found during the capitalization audit.

-- Bulk capitalization
UPDATE public.wrestlers
SET
  first_name = UPPER(LEFT(first_name, 1)) || SUBSTRING(first_name FROM 2),
  last_name  = UPPER(LEFT(last_name,  1)) || SUBSTRING(last_name  FROM 2)
WHERE first_name IS DISTINCT FROM UPPER(LEFT(first_name, 1)) || SUBSTRING(first_name FROM 2)
   OR last_name  IS DISTINCT FROM UPPER(LEFT(last_name,  1)) || SUBSTRING(last_name  FROM 2);

-- Typo corrections
UPDATE public.wrestlers SET first_name = 'Chris'       WHERE id = '1c17423a-96b3-4b27-a124-df0fa2b458fa'; -- chrs → Chris
UPDATE public.wrestlers SET first_name = 'Michael'     WHERE id = 'a142af75-59fd-41e1-a87b-84c8e67677fa'; -- micheal → Michael
UPDATE public.wrestlers SET first_name = 'Christopher' WHERE id = '10af1011-d393-4776-902e-4780e2a30e90'; -- Chistopher → Christopher
