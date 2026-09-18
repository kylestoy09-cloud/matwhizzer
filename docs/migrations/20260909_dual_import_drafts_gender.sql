-- Add gender column to dual_import_drafts so saved drafts are self-describing.
-- Without this, a girls draft and a boys draft look identical in storage and
-- the system relies on the user remembering which gender they were working on.

ALTER TABLE dual_import_drafts
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'M'
    CHECK (gender IN ('M', 'F'));
