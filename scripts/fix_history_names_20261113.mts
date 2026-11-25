// History names (Kyle 2026-11-13, "split any same names that are obviously different people"). The boys source
// (njwrestlinghistory.info) prefixes some names with the wrestler's grade ("Jr - Joe Duca" = Joe Duca as a junior,
// not Joe Duca Jr.), and five names were cut off mid-copy. Strip the grade; repair four; "Shelomi (hohn" is garbled
// in the source too and is left. Backup: docs/migrations/backups/20261113_history_names.json. Usage: [go]
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows: any[] = []
for (let a = 0; ; a += 1000) { const { data } = await db.from('history_finishes').select('id, name, school').order('id').range(a, a + 999); rows.push(...data!); if (data!.length < 1000) break }
const REPAIR: Record<number, { name: string; school?: string }> = {
  1704: { name: 'Tom Armino', school: 'Seton Hall' }, 2136: { name: 'Adam Derengowski', school: 'Paul VI' },
  2843: { name: 'John Garriques' }, 8360: { name: 'Antonio Mangione' },
}
const changes: any[] = []
for (const r of rows) {
  const fix = REPAIR[r.id] ?? (/^(jr|sr)\s*-\s*/i.test(r.name) ? { name: r.name.replace(/^(jr|sr)\s*-\s*/i, '').trim() } : null)
  if (fix) changes.push({ id: r.id, before: { name: r.name, school: r.school }, after: { name: fix.name, school: fix.school ?? r.school } })
}
writeFileSync('docs/migrations/backups/20261113_history_names.json', JSON.stringify(changes, null, 1))
console.log('rows to fix', changes.length, changes.slice(0, 4).map(c => `${c.before.name} → ${c.after.name}`))
if (process.argv[2] === 'go') {
  for (const c of changes) { const { error } = await db.from('history_finishes').update({ name: c.after.name, school: c.after.school }).eq('id', c.id); if (error) throw error }
  console.log('fixed')
}
