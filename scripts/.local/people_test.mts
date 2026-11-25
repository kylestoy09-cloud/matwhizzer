import { createClient } from '@supabase/supabase-js'
import { assignPeople } from '../../src/app/admin/[side]/content/daily-challenge/HistoryTabs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows: any[] = []
for (let a = 0; ; a += 1000) { const { data } = await db.from('history_finishes').select('level, year, region, region_name, weight, place, tie, name, school, note').eq('gender', 'M').order('id').range(a, a + 999); rows.push(...data!); if (data!.length < 1000) break }
const out = assignPeople(rows)
const split = [...new Set(out.map(f => f.person!).filter(p => /\(\d{4}/.test(p)))].sort()
console.log('wrestlers split by career:', split.length); console.log(split.join('\n'))
const duca = out.filter(f => /duca/i.test(f.name) && f.school === 'Paulsboro' && f.name.startsWith('Joe'))
console.log(duca.map(f => `${f.year} ${f.level} ${f.place} → ${f.person}`).join('\n'))
