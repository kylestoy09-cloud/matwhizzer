-- docs/migrations/20261118_poll_any_number_of_answers.sql
--
-- Polls (Kyle 2026-11-18): "I need to be able to have however many poll options as I want, no min or max."
-- Polls were made with exactly four answers (20261112_daily_challenge_game.sql): polls.answers had to hold 4 and a
-- vote's choice had to be 0–3. Both checks come off; a poll still needs at least one answer (nothing to vote on
-- otherwise) and a choice can't be negative. Existing polls and votes are unchanged.
-- Run in the Supabase SQL editor.

DO $$
DECLARE c record;
BEGIN
  -- the two unnamed checks (Postgres named them polls_answers_check / poll_votes_choice_check; looked up, not assumed)
  FOR c IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'c'
      AND ((conrelid = 'polls'::regclass AND pg_get_constraintdef(oid) ILIKE '%array_length(answers%')
        OR (conrelid = 'poll_votes'::regclass AND pg_get_constraintdef(oid) ILIKE '%choice%'))
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.tbl, c.conname);
  END LOOP;

  ALTER TABLE polls      ADD CONSTRAINT polls_answers_some      CHECK (cardinality(answers) >= 1);
  ALTER TABLE poll_votes ADD CONSTRAINT poll_votes_choice_index CHECK (choice >= 0);
END $$;

-- Verify: the two new checks, and nothing else on answers / choice
SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE contype = 'c' AND conrelid IN ('polls'::regclass, 'poll_votes'::regclass)
ORDER BY 1, 2;

-- ROLLBACK (only if every poll has 4 answers and every choice is 0–3):
--   ALTER TABLE polls DROP CONSTRAINT polls_answers_some;      ALTER TABLE polls ADD CHECK (array_length(answers, 1) = 4);
--   ALTER TABLE poll_votes DROP CONSTRAINT poll_votes_choice_index; ALTER TABLE poll_votes ADD CHECK (choice BETWEEN 0 AND 3);
