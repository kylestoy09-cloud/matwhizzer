-- ── Rollover gender diagnostic ────────────────────────────────────────────────
-- Run these in Supabase SQL editor to verify gender data quality before rolling over.
-- None of these statements change any data.

-- 1. Wrestler counts the rollover will actually see (boys only, active, not OOS, has grade)
SELECT gender, grade, COUNT(*) AS wrestlers
FROM wrestlers
WHERE is_active = true
  AND is_oos    = false
  AND grade     IS NOT NULL
GROUP BY gender, grade
ORDER BY gender, grade;

-- 2. Overall active wrestler split by gender (with and without grade)
SELECT
  gender,
  COUNT(*) FILTER (WHERE grade IS NOT NULL) AS with_grade,
  COUNT(*) FILTER (WHERE grade IS NULL)     AS no_grade,
  COUNT(*)                                   AS total
FROM wrestlers
WHERE is_active = true AND is_oos = false
GROUP BY gender;

-- 3. Sanity check: any wrestler rows where gender is NULL or an unexpected value?
SELECT gender, COUNT(*) FROM wrestlers GROUP BY gender ORDER BY gender;

-- 4. Sample of boys wrestlers with grades to spot-check names
SELECT id, first_name, last_name, gender, grade
FROM wrestlers
WHERE gender = 'M' AND is_active = true AND is_oos = false AND grade IS NOT NULL
ORDER BY last_name, first_name
LIMIT 100;
