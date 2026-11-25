// Saved Snap Shot reports keep names as they were when saved; after the backtick fix (20261113_backtick_names.sql)
// they still show "O`Dea", "Brandon` Lucia". Same rule as clean_backtick_name(): a backtick-quoted nickname at the
// front of a name goes, a stray backtick at either end of a word goes, any other becomes an apostrophe. Only string
// values containing a backtick change. Backup first.
//   npx tsx --tsconfig tsconfig.json scripts/fix_backtick_names_in_reports_20261113.mts [--apply]
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const clean = (s: string) => s.replace(/(^|\s)`[^`\s]+`\s+/g, '$1').replace(/`(?=\s|$)/g, '').replace(/(^|\s)`/g, '$1').replace(/`/g, "'")
const walk = (v: unknown, hits: string[]): unknown => {
  if (typeof v === 'string') { if (!v.includes('`')) return v; const c = clean(v); hits.push(`${v} → ${c}`); return c }
  if (Array.isArray(v)) return v.map(x => walk(x, hits))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, hits)]))
  return v
}
const backup: Record<string, unknown[]> = {}
for (const t of ['snapshot_reports', 'snapshot_reports_girls']) {
  const rows: Record<string, unknown>[] = []
  for (let f = 0; ; f += 500) { const { data, error } = await db.from(t).select('*').order('report_date').range(f, f + 499); if (error) throw error; rows.push(...(data ?? [])); if ((data ?? []).length < 500) break }
  const changed = []
  const all: string[] = []
  for (const r of rows) {
    const hits: string[] = []
    const payload = walk(r.payload, hits)
    if (hits.length) { changed.push({ r, payload }); all.push(...hits) }
  }
  console.log(t, 'reports', rows.length, '| with backtick names', changed.length, '| strings', all.length, '| e.g.', [...new Set(all)].slice(0, 6).join('; '))
  backup[t] = changed.map(c => c.r)
  if (!APPLY) continue
  fs.writeFileSync('docs/migrations/backups/20261113_backtick_names_reports.json', JSON.stringify(backup, null, 1))
  for (const c of changed) {
    const keys = Object.fromEntries(['report_date', 'season'].filter(k => k in c.r).map(k => [k, c.r[k]]))
    let q = db.from(t).update({ payload: c.payload })
    for (const [k, v] of Object.entries(keys)) q = q.eq(k, v as string)
    const { data, error } = await q.select('report_date')
    if (error) throw error
    if ((data ?? []).length !== 1) throw new Error(`${t} ${JSON.stringify(keys)}: updated ${data?.length} rows`)
  }
  console.log('  updated', changed.length)
}
