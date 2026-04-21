-- =============================================================================
-- MIGRATION: 20260420_cumberland_header_bg.sql
-- =============================================================================
-- Fixes Cumberland (id=289) header_background from '#FFFFFF' to '#DB5B2A'.
-- The reseed migration seeded '#FFFFFF' from the CSV "Background: White" entry,
-- but white-on-white renders the header invisible. Orange (#DB5B2A) is the
-- school's primary color and the correct header background.
--
-- ROLLBACK: UPDATE schools SET header_background = '#FFFFFF' WHERE id = 289;
-- =============================================================================

BEGIN;
UPDATE schools SET header_background = '#DB5B2A' WHERE id = 289;
COMMIT;
