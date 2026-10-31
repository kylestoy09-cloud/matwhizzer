// Builds docs/migrations/20261031_ranking_gender.sql and the backup of the rows it deletes.
// Rule: 2025-26 rankings made before 2026-09-14 (boys 2025-26 locked) are the boys publish.
// After that only girls could publish 2025-26, and until 2026-10-30 the girls publish ranked
// every 2025-26 rating, boys included: keep its girls-only rankings, delete the rest.
// Run: node --env-file=.env.local --experimental-strip-types scripts/ranking_gender_cleanup.mts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BOYS_LOCKED = '2026-09-14T00:00:00Z'
const FIXED       = '2026-10-31T00:00:00Z'   // the girls publish filters by gender from this deploy on

async function all(table: string, dateCol: string) {
  const out: Record<string, unknown>[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select('*').order('id').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data as Record<string, unknown>[]))
    if (!data || data.length < 1000) break
  }
  return out.filter(r => r[dateCol] != null)
}

const published = await all('ranking_published', 'published_at')
const variants  = await all('ranking_computed_variants', 'computed_at')

const ids = new Set<string>()
for (const r of [...published, ...variants]) for (const x of (r.results as { wrestler_id?: string }[]) ?? []) if (x.wrestler_id) ids.add(x.wrestler_id)
const gender = new Map<string, string>()
const list = [...ids]
for (let i = 0; i < list.length; i += 200) {
  const { data, error } = await db.from('wrestlers').select('id, gender').in('id', list.slice(i, i + 200))
  if (error) throw error
  for (const w of data ?? []) gender.set(w.id, w.gender)
}
const girlsOnly = (r: Record<string, unknown>) => {
  const res = (r.results as { wrestler_id?: string }[]) ?? []
  return res.length > 0 && res.every(x => gender.get(x.wrestler_id ?? '') === 'F')
}

function split(rows: Record<string, unknown>[], dateCol: string) {
  const girlsRun = rows.filter(r => String(r[dateCol]) >= BOYS_LOCKED && String(r[dateCol]) < FIXED)
  return { keepF: girlsRun.filter(girlsOnly), drop: girlsRun.filter(r => !girlsOnly(r)) }
}
const p = split(published, 'published_at')
const v = split(variants, 'computed_at')

fs.writeFileSync('docs/migrations/backups/20261031_ranking_rows_deleted.json', // then gzip -9
  JSON.stringify({ ranking_published: p.drop, ranking_computed_variants: v.drop }))

const q = (xs: Record<string, unknown>[]) => xs.map(r => `'${r.id}'`).join(',\n    ')
const sql = `-- Rankings get a gender (2026-10-31).
-- ranking_published / ranking_computed_variants / ranking_editorial had no gender, and boys and
-- girls share season ids. Until the 2026-10-30 fix, the girls auto-publish ranked every 2025-26
-- rating, boys included, so girls runs wrote boys and mixed rankings.
--   * Before ${BOYS_LOCKED.slice(0, 10)} (boys 2025-26 locked): the boys publish -> 'M'.
--   * Girls runs (${BOYS_LOCKED.slice(0, 10)} to ${FIXED.slice(0, 10)}): girls-only rankings -> 'F' (${p.keepF.length} published, ${v.keepF.length} variants);
--     the rest are deleted (${p.drop.length} published, ${v.drop.length} variants).
--   * Anything after ${FIXED.slice(0, 10)} is a girls publish made with the fix -> 'F'.
--   * ranking_editorial (one boys row) -> 'M'.
-- Backup of the deleted rows: backups/20261031_ranking_rows_deleted.json.gz
DO $$
BEGIN
  ALTER TABLE public.ranking_published         ADD COLUMN IF NOT EXISTS gender text;
  ALTER TABLE public.ranking_computed_variants ADD COLUMN IF NOT EXISTS gender text;
  ALTER TABLE public.ranking_editorial         ADD COLUMN IF NOT EXISTS gender text;

  UPDATE public.ranking_published         SET gender = 'M' WHERE gender IS NULL AND published_at < '${BOYS_LOCKED}';
  UPDATE public.ranking_computed_variants SET gender = 'M' WHERE gender IS NULL AND computed_at  < '${BOYS_LOCKED}';
  UPDATE public.ranking_editorial         SET gender = 'M' WHERE gender IS NULL;

  UPDATE public.ranking_published SET gender = 'F' WHERE id IN (
    ${q(p.keepF)}
  );
  UPDATE public.ranking_computed_variants SET gender = 'F' WHERE id IN (
    ${q(v.keepF)}
  );

  DELETE FROM public.ranking_published         WHERE gender IS NULL AND published_at < '${FIXED}';
  DELETE FROM public.ranking_computed_variants WHERE gender IS NULL AND computed_at  < '${FIXED}';
  UPDATE public.ranking_published         SET gender = 'F' WHERE gender IS NULL;
  UPDATE public.ranking_computed_variants SET gender = 'F' WHERE gender IS NULL;

  ALTER TABLE public.ranking_published         ALTER COLUMN gender SET NOT NULL;
  ALTER TABLE public.ranking_computed_variants ALTER COLUMN gender SET NOT NULL;
  ALTER TABLE public.ranking_editorial         ALTER COLUMN gender SET NOT NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ranking_published_gender_check') THEN
    ALTER TABLE public.ranking_published         ADD CONSTRAINT ranking_published_gender_check         CHECK (gender IN ('M', 'F'));
    ALTER TABLE public.ranking_computed_variants ADD CONSTRAINT ranking_computed_variants_gender_check CHECK (gender IN ('M', 'F'));
    ALTER TABLE public.ranking_editorial         ADD CONSTRAINT ranking_editorial_gender_check         CHECK (gender IN ('M', 'F'));
  END IF;
  CREATE INDEX IF NOT EXISTS idx_rp_season_gender  ON public.ranking_published (season_id, gender);
  CREATE INDEX IF NOT EXISTS idx_rcv_season_gender ON public.ranking_computed_variants (season_id, gender);
END $$;

-- Check: expect published M ${published.filter(r => String(r.published_at) < BOYS_LOCKED).length} / F ${p.keepF.length}, variants M ${variants.filter(r => String(r.computed_at) < BOYS_LOCKED).length} / F ${v.keepF.length}
SELECT 'published' AS t, gender, count(*) FROM public.ranking_published GROUP BY gender
UNION ALL
SELECT 'variants', gender, count(*) FROM public.ranking_computed_variants GROUP BY gender
ORDER BY 1, 2;
`
fs.writeFileSync('docs/migrations/20261031_ranking_gender.sql', sql)
console.log({ published: published.length, keepF: p.keepF.length, drop: p.drop.length, variants: variants.length, vKeepF: v.keepF.length, vDrop: v.drop.length })
