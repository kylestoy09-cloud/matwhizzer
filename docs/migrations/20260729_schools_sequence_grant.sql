-- Grant service role permission to use the schools auto-increment sequence.
-- Required for the RTF import pipeline to create new OOS school records.
-- Without this, inserts into schools fail with "permission denied for sequence schools_id_seq".

GRANT USAGE, SELECT ON SEQUENCE public.schools_id_seq TO service_role;
