import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const season of ['2025-26', '2026-27']) for (const g of ['M', 'F']) {
  const rows: any[] = []
  for (let f = 0; ; f += 1000) { const { data } = await db.from('wrestler_hammer_scores').select('school_id, section, classification, conference, district, region').eq('season', season).eq('gender', g).order('wrestler_id').range(f, f + 999); rows.push(...(data ?? [])); if ((data ?? []).length < 1000) break }
  const c: Record<string, number> = {}; for (const r of rows) c[r.section ?? '(none)'] = (c[r.section ?? '(none)'] ?? 0) + 1
  console.log(season, g, rows.length, 'no school:', rows.filter(r => !r.school_id).length, 'sections:', JSON.stringify(c), 'no district:', rows.filter(r => !r.district).length)
}
