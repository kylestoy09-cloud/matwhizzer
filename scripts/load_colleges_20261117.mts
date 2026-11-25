// Loads the D1 college list (src/lib/ncaa/colleges.ts) into colleges + college_aliases. Re-runnable: adds what's
// missing, never changes a college's colors once Kyle has checked them.
import { createClient } from '@supabase/supabase-js'
import { COLLEGES_D1 } from '../src/lib/ncaa/colleges'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: have, error } = await db.from('colleges').select('id, name, colors_checked')
if (error) throw error
const byName = new Map((have ?? []).map(c => [c.name, c]))
let added = 0, aliases = 0
for (const c of COLLEGES_D1) {
  let row = byName.get(c.name)
  if (!row) {
    const { data, error: e } = await db.from('colleges').insert({ name: c.name, primary_color: c.primary, secondary_color: c.secondary }).select('id, name, colors_checked').single()
    if (e) throw e
    row = data; added++
  } else if (!row.colors_checked) await db.from('colleges').update({ primary_color: c.primary, secondary_color: c.secondary }).eq('id', row.id)
  const rows = [c.name, ...c.aliases].map(alias => ({ alias, college_id: row!.id }))
  const { error: aErr } = await db.from('college_aliases').upsert(rows, { onConflict: 'alias', ignoreDuplicates: true })
  if (aErr) throw aErr
  aliases += rows.length
}
console.log({ colleges: COLLEGES_D1.length, added, aliases })
