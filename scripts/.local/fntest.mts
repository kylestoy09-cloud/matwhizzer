// Call every function changed by 20261103_school_names_by_season.sql, both genders where it takes one
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const sql = fs.readFileSync('docs/migrations/20261103_school_names_by_season.sql', 'utf8')
const sigs = [...sql.matchAll(/^-- ([a-z_]+)\((.*)\)$/gm)].map(m => ({ fn: m[1], args: m[2] }))
const REGION_TEXT = process.env.RT ?? '1'
let ok = 0, bad = 0
for (const { fn, args } of sigs) {
  const names = args.split(',').map(a => a.trim().split(' ')).filter(a => a[0])
  const genders = names.some(([n]) => n === 'p_gender') ? ['M', 'F'] : ['-']
  for (const g of genders) {
    const p: Record<string, unknown> = {}
    for (const [n, t] of names) {
      if (n === 'p_gender') p[n] = g
      else if (n === 'p_season') p[n] = 2026
      else if (n === 'p_season_id') p[n] = 2026
      else if (n === 'p_district') p[n] = 1
      else if (n === 'p_region') p[n] = t === 'text' ? REGION_TEXT : 1
      else if (n === 'p_pool') p[n] = 'state'
      else if (n === 'p_limit') p[n] = 5
    }
    const t0 = Date.now()
    const r = await db.rpc(fn, p)
    if (r.error) { bad++; console.log(`ERR ${fn}(${JSON.stringify(p)}): ${r.error.message}`) }
    else { ok++; const rows = Array.isArray(r.data) ? r.data.length : '?'; if (rows === 0) console.log(`empty ${fn} ${g}`); }
    await new Promise(res => setTimeout(res, 150))
  }
}
console.log(`${ok} calls ok, ${bad} errors`)
