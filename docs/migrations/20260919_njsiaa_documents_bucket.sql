-- docs/migrations/20260919_njsiaa_documents_bucket.sql
--
-- RECONSTRUCTED: bucket was created via the Storage API on 2026-09-19.
-- Public bucket holding archived copies of NJSIAA regulatory PDFs so they
-- survive NJSIAA moving/removing its links.
-- Path convention: <season end year>/<boys|girls>/<doc-slug>.pdf
--   e.g. 2026/boys/regular-season-rules.pdf  (2025-26 season)

INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('njsiaa-documents', 'njsiaa-documents', true, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
