import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [id, n] of [[111, 'East Orange'], [61, 'Dover'], [214, 'Riverside']] as const) {
  const r = await db.rpc('school_wrestlers', { p_school_id: id, p_gender: 'F', p_season: 2026 })
  console.log(n, r.error?.message ?? `${r.data.length} rows`, r.data?.[0] ? Object.keys(r.data[0]).join(',') : '')
  // girls with an alias at the school and 2025-26 bouts
  const al = (await db.from('wrestler_name_aliases').select('wrestler_id, wrestlers!inner(gender, first_name, last_name)').eq('school_id', id).eq('wrestlers.gender', 'F')).data ?? []
  const ids = new Set((r.data ?? []).map((x: any) => x.wrestler_id))
  console.log('  girls linked to the school:', al.length, '| on Roster tab:', al.filter((a: any) => ids.has(a.wrestler_id)).length, '| missing:', al.filter((a: any) => !ids.has(a.wrestler_id)).map((a: any) => `${a.wrestlers.first_name} ${a.wrestlers.last_name}`).slice(0, 8).join(', '))
}
