// Version 4 for each side (Kyle 2026-11-20: "stop putting times for predictions, but still use them for weighting
// results … remove top 3 predictions with % and just put our prediction"): Version 3 exactly, with labels showing the win
// type only ("Pin", "Decision"). Times still weight the WRR and the grading. Version 3 stays on file.
//   npx tsx scripts/save_projection_v4_20261120.mts [--apply]
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F'] as const) {
  const { data: v3 } = await db.from('projection_settings').select('id, version, params').eq('gender', g).eq('is_active', true).single()
  if (!v3 || v3.version !== 3) throw new Error(`${g}: active version is ${v3?.version}, expected 3`)
  console.log(`${g}: Version 4 = Version 3 + win type only`)
  if (!APPLY) continue
  const { error: e1 } = await db.from('projection_settings').update({ is_active: false }).eq('id', v3.id)
  if (e1) throw new Error(e1.message)
  const { error: e2 } = await db.from('projection_settings').insert({ gender: g, version: 4, name: 'Version 4', params: { ...(v3.params as object), showTimes: false }, is_active: true, created_by: 'claude (Kyle: win type only)',
    note: 'Version 3 exactly, with the site showing the win type only (“Pin”, “Decision”) — no times; times still weight the WRR and the grading.' })
  if (e2) { await db.from('projection_settings').update({ is_active: true }).eq('id', v3.id); throw new Error(e2.message) }
}
console.log(APPLY ? 'saved' : 'dry run')
