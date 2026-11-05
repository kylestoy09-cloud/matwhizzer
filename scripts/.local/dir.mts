import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const s of [2025, 2026]) {
  const r = await db.rpc('school_directory', { p_gender: 'F', p_season: s })
  if (r.error) { console.log(s, r.error.message); continue }
  const ids = new Set((r.data ?? []).map((x: any) => x.school_id ?? x.id))
  console.log(s, 'rows', r.data.length, '| shown:', [13, 297, 253, 191, 26, 35, 268, 294, 87, 64, 6, 315].map(i => `${i}:${ids.has(i) ? 'Y' : '-'}`).join(' '))
}
