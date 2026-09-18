-- Add logo_direction column to schools table.
-- Values: 'left' (logo naturally faces left), 'right' (naturally faces right), null (forward-facing, no flip needed).
-- Seeded from the LOGO_DIRECTION map in src/lib/logo-direction.ts.

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS logo_direction text
  CHECK (logo_direction IN ('left', 'right'));

-- Seed from existing static map (right-facing schools)
UPDATE schools SET logo_direction = 'right'
WHERE id IN (
  1,2,3,4,5,7,10,11,12,15,16,17,20,21,24,25,29,33,36,39,40,43,44,46,
  50,52,53,60,61,62,70,74,75,76,77,79,81,82,83,84,101,102,111,113,114,
  117,119,120,122,123,125,126,129,130,131,132,138,144,145,147,149,150,
  153,159,163,166,168,171,172,182,189,193,203,204,206,207,211,218,221,
  224,227,229,236,238,246,248,249,250,251,256,262,266,267,272,273,281,
  282,283,284,286,289,292,293,301,306,311,312,321,356,360,364,370,381,
  393,394
);

-- Seed from existing static map (left-facing schools)
UPDATE schools SET logo_direction = 'left'
WHERE id IN (
  8,13,14,19,26,28,31,32,34,35,37,38,41,42,45,49,56,58,59,63,66,67,
  80,89,97,98,99,103,104,105,107,108,109,110,112,115,118,121,124,127,
  133,134,136,139,141,148,151,152,154,155,157,158,167,169,174,177,181,
  185,186,195,197,198,199,200,208,209,213,215,217,220,222,223,235,237,
  240,241,243,245,253,255,257,258,260,265,271,274,278,279,280,285,287,
  291,294,303,304,314,315,322,369,379,383,388,397
);
