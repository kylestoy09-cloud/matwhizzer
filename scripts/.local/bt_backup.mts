import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const out: Record<string, unknown[]> = {}
const spec: [string, string[], string][] = [
  ['wrestlers', ['first_name', 'last_name'], 'id, first_name, last_name'],
  ['boys_prospects', ['first_name', 'last_name'], 'id, first_name, last_name'],
  ['girls_prospects', ['first_name', 'last_name'], 'id, first_name, last_name'],
  ['mixed_prospects', ['first_name', 'last_name'], 'id, first_name, last_name'],
  ['schools', ['display_name'], 'id, display_name'],
  ['history_finishes', ['name'], 'id, name'],
]
for (const [t, cols, sel] of spec) {
  const { data, error } = await db.from(t).select(sel).or(cols.map(c => `${c}.like.*\`*`).join(','))
  if (error) throw error
  out[t] = data ?? []
  console.log(t, out[t].length)
}
fs.writeFileSync('docs/migrations/backups/20261113_backtick_names.json', JSON.stringify(out, null, 1))
