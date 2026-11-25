// Kyle 2026-11-18: add printed spellings of colleges already on our list (college_aliases), e.g. from a transcript's
// "colleges not on our list"; a new college first with "+Name|City|ST|Conference|Mascot|#primary|#secondary" (colors
// for Kyle to check). Dry run unless --apply.
//   npx tsx scripts/add_college_aliases.mts "+Carson-Newman|Jefferson City|TN|SAC|Eagles|#F58025|#002D72" "Carson-Newman=Carson-Newman" "Augustana (SD)=Augustana - SD" [--apply]
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const args = process.argv.slice(2).filter(a => !a.startsWith('--'))
const pairs = args.filter(a => !a.startsWith('+')).map(a => a.split('='))
const adds = args.filter(a => a.startsWith('+')).map(a => { const [name, city, state, conference, mascot, primary_color, secondary_color] = a.slice(1).split('|'); return { name, city, state, conference: conference || null, mascot, primary_color, secondary_color } })
const { data: cols } = await db.from('colleges').select('id, name')
const { data: have } = await db.from('college_aliases').select('alias, college_id')
const id = new Map((cols ?? []).map(c => [c.name.toLowerCase(), c.id as number]))
for (const c of adds) {
  if (id.has(c.name.toLowerCase())) { console.log(`already a college: ${c.name}`); continue }
  console.log('new college', c)
  if (APPLY) { const { data, error } = await db.from('colleges').insert(c).select('id').single(); if (error) throw new Error(error.message); id.set(c.name.toLowerCase(), data.id) }
  else id.set(c.name.toLowerCase(), -1)
}
const taken = new Map((have ?? []).map(a => [a.alias.toLowerCase(), a.college_id as number]))
const rows: { alias: string; college_id: number }[] = []
for (const [name, alias] of pairs) {
  const cid = id.get(name.toLowerCase())
  if (cid == null) throw new Error(`no college named "${name}"`)
  const t = taken.get(alias.toLowerCase())
  if (t != null) { console.log(`already: ${alias} → ${t}${t === cid ? '' : ' (A DIFFERENT COLLEGE)'}`); continue }
  rows.push({ alias: alias.toLowerCase(), college_id: cid })
}
console.log(rows)
if (APPLY && rows.length) { const { error } = await db.from('college_aliases').insert(rows); if (error) throw new Error(error.message); console.log('added', rows.length) }
