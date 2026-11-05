import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const t of ['dual_meet_matches_girls', 'wrestlers']) console.log(t, Object.keys((await db.from(t).select('*').limit(1)).data?.[0] ?? {}).join(','))
for (const id of [87, 64]) {
  const r = await db.from('dual_meet_matches_girls').select('id', { count: 'exact', head: true }).or(`school_a_id.eq.${id},school_b_id.eq.${id}`)
  const a = await db.from('wrestler_name_aliases').select('id, wrestlers(gender)').eq('school_id', id)
  const rg = await db.from('roster_grade_import').select('id', { count: 'exact', head: true }).eq('school_id', id).ilike('import_batch', '%girls%')
  console.log(id, 'dual bouts', r.count, r.error?.message ?? '', '| girl aliases', (a.data ?? []).filter((x: any) => x.wrestlers?.gender === 'F').length, '| girls roster rows', rg.count)
}
