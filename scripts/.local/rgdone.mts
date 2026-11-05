import { createClient } from '@supabase/supabase-js'
import { getRosterImportSeason } from '../../src/lib/season-context'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F'] as const) {
  const season = await getRosterImportSeason(db as never, g)
  const rows: any[] = []
  for (let i = 0; ; i += 1000) { const d = (await db.from('roster_grade_import').select('school_id, status').eq('season_id', season.id).eq('gender', g).range(i, i + 999)).data!; rows.push(...d); if (d.length < 1000) break }
  const by = new Map<number, Record<string, number>>()
  for (const r of rows) if (r.school_id) { const m = by.get(r.school_id) ?? {}; m[r.status] = (m[r.status] ?? 0) + 1; by.set(r.school_id, m) }
  const done = [...by].filter(([, m]) => !m.pending && !m.school_matched).map(([id]) => id).sort((a, b) => a - b)
  console.log(g, 'season', season.id, '| schools linked', by.size, '| show Review today', done.length, JSON.stringify(done))
}
