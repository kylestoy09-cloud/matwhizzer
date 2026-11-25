// Kyle 2026-11-18: add colleges and their printed spellings from a list file, one college a line:
//   Name | City | ST | Mascot | spelling; spelling; …
// A Name already on our list just gets the spellings as aliases (city etc. ignored); a new Name is created (conference
// and colors left for later). A spelling already pointing at a different college is reported, not changed. Dry run
// unless --apply.   npx tsx scripts/add_college_group.mts <list.txt> [--apply]
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const file = process.argv.slice(2).find(a => !a.startsWith('--'))!
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows = readFileSync(file, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => {
  const [name, city, state, mascot, al] = l.split('|').map(x => x.trim())
  return { name, city, state, mascot, aliases: [name, ...(al ?? '').split(';').map(x => x.trim()).filter(Boolean)] }
})
const { data: cols } = await db.from('colleges').select('id, name')
const { data: have } = await db.from('college_aliases').select('alias, college_id')
const id = new Map((cols ?? []).map(c => [c.name.toLowerCase(), c.id as number]))
const taken = new Map((have ?? []).map(a => [a.alias.toLowerCase(), a.college_id as number]))
const fresh = rows.filter(r => !id.has(r.name.toLowerCase()))
console.log({ lines: rows.length, existing: rows.length - fresh.length, new: fresh.length })
if (APPLY && fresh.length) {
  const { data, error } = await db.from('colleges').insert(fresh.map(r => ({ name: r.name, city: r.city || null, state: r.state || null, mascot: r.mascot || null }))).select('id, name')
  if (error) throw new Error(error.message)
  for (const c of data ?? []) id.set(c.name.toLowerCase(), c.id)
}
const add: { alias: string; college_id: number }[] = [], clash: string[] = []
for (const r of rows) {
  const cid = id.get(r.name.toLowerCase()) ?? -1
  for (const a of r.aliases) {
    const t = taken.get(a.toLowerCase())
    if (t == null) { if (!add.some(x => x.alias === a.toLowerCase())) add.push({ alias: a.toLowerCase(), college_id: cid }) }
    else if (t !== cid && cid !== -1) clash.push(`${a} → college ${t}, not ${r.name}`)
  }
}
console.log({ aliases_to_add: add.length, clashes: clash })
if (APPLY && add.length) { const { error } = await db.from('college_aliases').insert(add); if (error) throw new Error(error.message); console.log('added') }
