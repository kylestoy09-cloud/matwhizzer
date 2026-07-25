-- =============================================================================
-- MIGRATION: 20260722_staged_imports.sql
-- =============================================================================
-- Adds persistence for the /admin/import-tournament review workflow.
-- Previously all review state (school overrides, wrestler overrides) lived in
-- React useState and was lost on tab close.  This migration adds two tables:
--
--   staged_imports     — one row per uploaded JSON file, including the full
--                        PipeImportJSON payload as a write-once JSONB column.
--                        Never updated after upload — only status changes.
--
--   staged_decisions   — one row per school or wrestler decision made during
--                        review.  One UPDATE per click.  Keyed by
--                        (import_id, key_type, key_value) so upserts are safe.
--
-- Design rationale (vs. staged_bouts rows):
--   The review unit is an entity (school or wrestler), not a bout.  One school
--   decision resolves all bouts containing that raw name.  Per-bout rows would
--   force N-row updates per decision, require reconstructing the grouped view
--   from rows on resume, and add complexity without benefit.  JSONB for the
--   payload is write-once (never modified after upload), so the usual JSONB
--   update cost is irrelevant.  Only staged_decisions rows change.
--
-- On resume:
--   1. Load staged_imports row — parse payload → rebuild PipeImportJSON
--   2. Load staged_decisions for import_id → rebuild schoolOverrides and
--      wrestlerOverrides maps
--   3. Render TournamentImportClient with pre-populated override state
--
-- Submit:
--   Still a single action that writes to tournament_bouts.  Nothing in these
--   tables lands in tournament_bouts until submit.  On submit success, status
--   is set to 'submitted' (rows are kept for audit; use abandon to delete).
-- =============================================================================

BEGIN;

-- ── staged_imports ────────────────────────────────────────────────────────────

CREATE TABLE public.staged_imports (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  filename       text        NOT NULL,
  source_format  text        NOT NULL,   -- 'pipe', 'bullet', 'pdf', 'rtf', etc.

  -- Status lifecycle: in_review → submitted (on final import)
  --                   in_review → abandoned (explicit delete)
  status         text        NOT NULL DEFAULT 'in_review'
                 CHECK (status IN ('in_review', 'submitted', 'abandoned')),

  -- The full PipeImportJSON (or equivalent) from the import script.
  -- Write-once: set at upload, never modified.
  -- Schools/wrestlers/bouts are read from here on resume.
  payload        jsonb       NOT NULL,

  -- Denormalized counters (set on upload, never change).
  -- Used on the list page without parsing payload.
  total_bouts    integer     NOT NULL DEFAULT 0,
  total_flags    integer     NOT NULL DEFAULT 0,
  -- total_flags = (schools with confidence 'none'/'low') +
  --              (wrestlers with confidence 'low' or is_new=true, NJ schools only)
  -- Corresponds to the denominator in "X of Y resolved" on the list.

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── staged_decisions ──────────────────────────────────────────────────────────

CREATE TABLE public.staged_decisions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id    uuid        NOT NULL
               REFERENCES public.staged_imports(id) ON DELETE CASCADE,

  -- 'school'   → key_value is the raw school name string (e.g. 'HTWN', 'GFA')
  -- 'wrestler' → key_value is the wrestler key string  (e.g. 'Smith J|112|157')
  key_type     text        NOT NULL
               CHECK (key_type IN ('school', 'wrestler')),
  key_value    text        NOT NULL,

  -- School decisions:
  --   { "type": "nj",  "school_id": 112, "display_name": "Hackettstown" }
  --   { "type": "oos" }
  -- Wrestler decisions:
  --   { "type": "existing", "wrestler_id": "uuid...", "display_name": "John Smith" }
  --   { "type": "new" }
  decision     jsonb       NOT NULL,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- One decision per entity per import — upsert on (import_id, key_type, key_value)
  UNIQUE (import_id, key_type, key_value)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- List page: show imports ordered by recency
CREATE INDEX idx_staged_imports_created_at
  ON public.staged_imports (created_at DESC);

-- Resume page: load all decisions for an import
CREATE INDEX idx_staged_decisions_import_id
  ON public.staged_decisions (import_id);

-- Progress query: count decisions per import efficiently
-- (covered by the index above; separate partial index if needed later)

-- ── Grants ────────────────────────────────────────────────────────────────────
-- Admin-only tables. anon gets no access.
-- API routes run as service_role.
-- Admin UI uses supabase auth (authenticated role).

GRANT ALL ON TABLE public.staged_imports   TO service_role, authenticated;
GRANT ALL ON TABLE public.staged_decisions TO service_role, authenticated;

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Restrict to authenticated users.  The admin layout already redirects
-- unauthenticated requests at the Next.js level; RLS is a second line.

ALTER TABLE public.staged_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin only" ON public.staged_imports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.staged_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin only" ON public.staged_decisions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- service_role bypasses RLS by default in Supabase — no policy needed for it.

COMMIT;


-- =============================================================================
-- ROLLBACK
-- =============================================================================
--
-- BEGIN;
-- DROP TABLE IF EXISTS public.staged_decisions;
-- DROP TABLE IF EXISTS public.staged_imports;
-- COMMIT;
