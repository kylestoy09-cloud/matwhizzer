import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ents = (await db.from('tournament_entries').select('wrestler_id').eq('tournament_id', 243)).data ?? []
const wids = [...new Set(ents.map(e => e.wrestler_id))] as string[]
const other = new Set(((await db.from('tournament_entries').select('wrestler_id').in('wrestler_id', wids).neq('tournament_id', 243)).data ?? []).map(r => r.wrestler_id))
const only = wids.filter(w => !other.has(w))
for (const line of readFileSync(process.argv[2], 'utf8').trim().split('\n')) {
  const [t, c] = line.split(' ')
  const r = await db.from(t).select('*', { count: 'exact', head: true }).in(c, only)
  if (r.error || r.count) console.log(t, c, r.error ? r.error.message : r.count)
}
console.log('checked', only.length, 'profiles')
