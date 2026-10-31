// Classifies every ranking_published / ranking_computed_variants / ranking_editorial row by
// the genders of the wrestlers in its results: M, F, mixed or empty.
// Run: node --env-file=.env.local --experimental-strip-types scripts/classify_ranking_gender.mts [--json out.json]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function all(table: string, cols: string) {
  const out: Record<string, unknown>[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(cols).order('id').range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data as unknown as Record<string, unknown>[]))
    if (!data || data.length < 1000) break
  }
  return out
}

const tables = {
  ranking_published:         await all('ranking_published', 'id, ranking_type, scope, scope_id, weight_class, published_at, results'),
  ranking_computed_variants: await all('ranking_computed_variants', 'id, ranking_type, scope, scope_id, weight_class, computed_at, results'),
  ranking_editorial:         await all('ranking_editorial', 'id, ranking_type, scope, scope_id, weight_class, updated_at, results'),
}

const ids = new Set<string>()
for (const rows of Object.values(tables)) for (const r of rows) for (const x of (r.results as { wrestler_id?: string }[] ?? [])) if (x.wrestler_id) ids.add(x.wrestler_id)
const gender = new Map<string, string>()
const idList = [...ids]
for (let i = 0; i < idList.length; i += 200) {
  const { data, error } = await db.from('wrestlers').select('id, gender').in('id', idList.slice(i, i + 200))
  if (error) throw error
  for (const w of data ?? []) gender.set(w.id, w.gender)
}

const result: Record<string, Record<string, string[]>> = {}
for (const [t, rows] of Object.entries(tables)) {
  const by: Record<string, string[]> = { M: [], F: [], mixed: [], empty: [] }
  for (const r of rows) {
    const gs = new Set((r.results as { wrestler_id?: string }[] ?? []).map(x => gender.get(x.wrestler_id ?? '') ?? '?'))
    const cls = gs.size === 0 ? 'empty' : gs.size === 1 && (gs.has('M') || gs.has('F')) ? [...gs][0] : 'mixed'
    by[cls].push(r.id as string)
  }
  result[t] = by
  console.log(t.padEnd(26), Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.length])))
}
const out = process.argv.indexOf('--json')
if (out > 0) fs.writeFileSync(process.argv[out + 1], JSON.stringify(result))
