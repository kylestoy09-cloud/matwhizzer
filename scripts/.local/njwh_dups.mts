import { createClient } from '@supabase/supabase-js'
import { readYear } from '../../src/lib/playoffHistory/readFiles'
import { buildBrackets } from '../../src/lib/playoffHistory/brackets'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const rows: any[] = []
for (let f = 0; ; f += 1000) { const { data } = await db.from('history_finishes').select('id, year, level, region, weight, place, name, school').eq('gender', 'M').eq('level', 'state').gte('year', 2013).order('id').range(f, f + 999); rows.push(...(data ?? [])); if ((data ?? []).length < 1000) break }
for (let y = 2013; y <= 2024; y++) {
  const st = readYear(y).events.find(e => e.kind === 'state'); if (!st) continue
  const brs = buildBrackets(st)
  for (const b of brs) {
    const nj = rows.filter(r => r.year === y && Number(r.weight) === b.weight)
    const wrong = nj.filter(r => { const o = b.places.get(r.place); return !o || norm(o) !== norm(r.name) })
    if (wrong.length < 3) continue   // spellings differ one-off; a copied list differs wholesale
    const elsewhere = wrong.filter(r => brs.some(o => o.weight !== b.weight && [...o.places.values()].some(n => norm(n) === norm(r.name))))
    console.log(`${y} ${b.weight}: ${wrong.length} differ, ${elsewhere.length} of them are placers at another weight | NJWH: ${wrong.map(r => `${r.place} ${r.name}`).join(', ')} | file: ${wrong.map(r => `${r.place} ${b.places.get(r.place)}`).join(', ')}`)
  }
}
