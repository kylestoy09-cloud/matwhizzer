// Kyle 2026-11-13 ("yes"): link the NJ kids listed under a short or long form of one of our wrestlers' names
// (Zach Akers → Zachary Akers). Jack Brown (Evil Empire) → John Brown left out. Each wrestler has no other prospect.
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows = readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/nick.tsv', 'utf8').split('\n').map(l => l.split('\t'))
  .filter(c => !(c[2] === 'Jack Brown'))
for (const c of rows) {
  const [pool, pid, name, , , , wname, wclass, wid] = c
  const { data: other } = await db.from(`${pool}_prospects`).select('id').eq('wrestler_id', wid)
  if (other?.length) { console.log('SKIP (already linked)', name); continue }
  const { error } = await db.from(`${pool}_prospects`).update({ wrestler_id: wid, class_year: Number(wclass) || null }).eq('id', Number(pid))
  if (error) throw error
  console.log(`linked ${name} → ${wname} ${wclass}`)
}
