-- =============================================================================
-- MIGRATION: 20260420_buena_display_name_fix.sql
-- =============================================================================
-- Shortens Buena Regional/Vineland display name to "Buena/Vineland".
--
-- ROLLBACK: UPDATE schools SET display_name = 'Buena Regional/Vineland' WHERE id = 360;
-- =============================================================================

BEGIN;
UPDATE schools SET display_name = 'Buena/Vineland' WHERE id = 360;
COMMIT;
