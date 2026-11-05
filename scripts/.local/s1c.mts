import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/inactive_boys.json', 'utf8'))
const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const all = (await db.from('wrestlers').select('id, first_name, last_name, is_active').eq('gender', 'M').limit(20000)).data!
const byName = new Map<string, any[]>(); for (const w of all) { const k = key(w.first_name + w.last_name); (byName.get(k) ?? byName.set(k, []).get(k)!).push(w) }
let linkedOther = 0, linkedSelf = 0, unlinked = 0, twinActive = 0, statusTally: Record<string, number> = {}
const twins: string[] = []
for (const r of rows) {
  for (const t of r.track) { statusTally[t.status] = (statusTally[t.status] ?? 0) + 1; if (t.linked && t.linked !== r.id) linkedOther++; else if (t.linked === r.id) linkedSelf++; else unlinked++ }
  const others = (byName.get(key(r.name)) ?? []).filter((w: any) => w.id !== r.id)
  if (others.some((w: any) => w.is_active)) { twinActive++; if (twins.length < 10) twins.push(r.name) }
}
console.log(`Track rows for them: ${JSON.stringify(statusTally)} | linked to them ${linkedSelf}, linked to a different profile ${linkedOther}, unlinked ${unlinked}`)
console.log(`of the ${rows.length}, ${twinActive} have another ACTIVE boys profile with the same full name:`, twins.join(', '))
