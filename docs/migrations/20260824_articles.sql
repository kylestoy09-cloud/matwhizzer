-- Articles CMS — markdown-based content with draft/published status

CREATE TABLE IF NOT EXISTS articles (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  slug         text        NOT NULL UNIQUE,
  body         text        NOT NULL DEFAULT '',
  author       text        NOT NULL DEFAULT '',
  status       text        NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON articles TO anon, authenticated;
GRANT ALL    ON articles TO service_role;

-- Public reads are filtered by status in queries (no RLS needed — service role writes, anon reads published only via app logic)
