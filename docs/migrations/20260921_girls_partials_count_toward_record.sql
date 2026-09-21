-- docs/migrations/20260921_girls_partials_count_toward_record.sql
--
-- Girls only. Reverses the default from 20260920_dual_meets_girls_meet_kind:
-- 1-2 bout meets stay tagged meet_kind = 'partial' but now COUNT toward team
-- W-L. Some partial meets appear in official standings and some don't; until
-- every girls result is in and records can be checked against standings, they
-- count. Individual meets can still be switched off later via
-- counts_toward_record. Jamboree pairings are unchanged (never count).
--
-- The importer sets the same thing for new partial meets (code ships with this).

-- ── DRY RUN (read-only) ─────────────────────────────────────────────────────
SELECT meet_kind, counts_toward_record, COUNT(*)
FROM dual_meets_girls
GROUP BY 1, 2
ORDER BY 1, 2;

UPDATE dual_meets_girls
SET counts_toward_record = true
WHERE meet_kind = 'partial'
  AND counts_toward_record = false;

-- Verify: expect every partial to be counts_toward_record = true
SELECT meet_kind, counts_toward_record, COUNT(*)
FROM dual_meets_girls
GROUP BY 1, 2
ORDER BY 1, 2;

-- ROLLBACK:
-- UPDATE dual_meets_girls SET counts_toward_record = false WHERE meet_kind = 'partial';
