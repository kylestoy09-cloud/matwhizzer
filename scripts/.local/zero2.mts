import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const wcw = new Map((await db.from('weight_classes').select('id, weight')).data!.map((r: any) => [r.id, r.weight]))
const src = fs.readFileSync('../gt_s2_districts.txt', 'utf8')
const merged = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_duplicates_before.json', 'utf8'))
for (const [f, l, dist] of [['Aidan', 'Johnson', 'District 28'], ['Owen', 'Williams', 'District 26'], ['Julian', 'Sanchez', 'District 19'], ['Peter', 'Terranova', 'District 18'], ['Ziyon', 'Moore', 'District 32'], ['Huzafia', 'Abdulkadr', 'District 8']]) {
  const t = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2026).eq('name', `Boy_s Districts ${dist}`)).data![0].id
  const ws = (await db.from('wrestlers').select('id').eq('gender', 'M').eq('first_name', f).eq('last_name', l)).data!.map((w: any) => w.id)
  const ents = (await db.from('tournament_entries').select('id, wrestler_id, school_id, weight_class_id, seed').eq('tournament_id', t).in('wrestler_id', ws)).data ?? []
  const rows = []
  for (const e of ents as any[]) { const n = (await db.from('matches').select('id', { count: 'exact', head: true }).or(`winner_entry_id.eq.${e.id},loser_entry_id.eq.${e.id}`)).count; const wasDup = merged.pairs.some((p: any) => Object.entries(merged).some(([k, v]: any) => k === `tournament_entries.wrestler_id ${p.from}` && v.some((x: any) => x.id === e.id))); rows.push(`entry ${e.id.slice(0, 8)} (${names.get(e.school_id)} ${wcw.get(e.weight_class_id)}lb seed ${e.seed ?? '-'}) bouts ${n}${wasDup ? ' [moved here by today’s merge]' : ''}`) }
  const lines = src.split('\n').filter(x => x.includes(`${f} ${l} (`)).length
  console.log(`${f} ${l} ${dist}: ${rows.join(' | ')} | lines naming him in the source file: ${lines}`)
}
