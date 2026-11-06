// The 10 grade ties (docs/reviews/grade_conflicts_20261106.md), Kyle 2026-11-06. "Class" below is the
// 2025-26 grade; graduation_year follows (Sr 2026, Jr 2027, So 2028).
//   Jimenez Jr, Allen Jr, Villanueva Jr, Butler Jr (Kyle); Lopez Diaz Sr, Donoghue Jr, Goss So (Kyle
//   deferred: the 2024-25 bracket's grade, advanced); Scanlon and Lawrence were 2024-25 seniors:
//   graduated 2025, inactive.
//   Silva: two Delran wrestlers on one profile under neither's name ("Gabriella"). The 2024-25 Region
//   South entry is Gabrielly Silva, a senior (graduated 2025): new profile + link, entry moved. The
//   2025-26 bouts and links are Grazyelle Silva, a junior: the profile is renamed.
//   npx tsx --tsconfig tsconfig.json scripts/fix_grade_ties_20261106.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const GY: Record<string, number> = { Sr: 2026, Jr: 2027, So: 2028 }
const SET: [string, string, string | null][] = [   // id prefix, name, 2025-26 class (null = graduated 2025)
  ['0441d24b', 'Gerald Jimenez', 'Jr'], ['13a955c1', 'Eziar Allen', 'Jr'], ['93605fe4', 'Erick Villanueva', 'Jr'], ['b47ecc8c', 'Andrew Butler', 'Jr'],
  ['04d28a9f', 'Kevin Lopez Diaz', 'Sr'], ['207dd03e', 'Rory Donoghue', 'Jr'], ['6225d974', 'Luke Goss', 'So'],
  ['3a669760', 'Patrick Scanlon', null], ['ae9ce516', 'Skylar Lawrence', null],
]
const all: any[] = []; for (let i = 0; ; i += 1000) { const d = chk(await db.from('wrestlers').select('*').order('id').range(i, i + 999), 'w'); all.push(...d); if (d.length < 1000) break }
const byP = (p: string) => { const x = all.filter(w => w.id.startsWith(p)); if (x.length !== 1) throw new Error(p); return x[0] }
const plan = SET.map(([p, name, cls]) => { const w = byP(p); if (`${w.first_name} ${w.last_name}` !== name) throw new Error(`${p} is ${w.first_name} ${w.last_name}`); return { w, upd: cls ? { grade: cls, graduation_year: GY[cls], is_active: true } : { grade: 'Sr', graduation_year: 2025, is_active: false } } })
for (const p of plan) console.log(`${p.w.first_name} ${p.w.last_name}: ${p.w.grade} → ${JSON.stringify(p.upd)}`)
const silva = byP('daa67f8e')
const entry = chk(await db.from('tournament_entries').select('id, grade_label, school_id, tournaments(name, season_id)').eq('wrestler_id', silva.id), 'e')
if (entry.length !== 1 || entry[0].tournaments.season_id !== 2025) throw new Error('Silva: expected one 2024-25 entry')
console.log(`Silva: rename ${silva.first_name} → Grazyelle (Jr, class of 2027); new profile Gabrielly Silva (Sr, class of 2025, graduated) gets entry ${entry[0].id.slice(0, 8)} (${entry[0].tournaments.name})`)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261106_grade_ties_before.json', JSON.stringify({ wrestlers: [...plan.map(p => p.w), silva], silvaEntry: entry[0] }, null, 1))
for (const p of plan) chk(await db.from('wrestlers').update(p.upd).eq('id', p.w.id).select('id'), p.w.last_name)
chk(await db.from('wrestlers').update({ first_name: 'Grazyelle', grade: 'Jr', graduation_year: 2027 }).eq('id', silva.id).select('id'), 'rename')
const g = chk(await db.from('wrestlers').insert({ first_name: 'Gabrielly', last_name: 'Silva', gender: 'F', grade: 'Sr', graduation_year: 2025, is_active: false, is_oos: false, grade_confirmed_source: 'manual', grade_confirmed_at: new Date().toISOString() }).select('id'), 'new')[0].id
chk(await db.from('tournament_entries').update({ wrestler_id: g }).eq('id', entry[0].id).eq('wrestler_id', silva.id).select('id'), 'move entry')
chk(await db.from('wrestler_name_aliases').insert({ raw_name: 'Gabrielly Silva', school_id: entry[0].school_id, wrestler_id: g }).select('id'), 'link')
fs.writeFileSync('docs/migrations/backups/20261106_grade_ties_inserted.json', JSON.stringify({ gabrielly: g }, null, 1))
console.log(`APPLIED: 9 grades; Silva split (Gabrielly ${g.slice(0, 8)})`)
