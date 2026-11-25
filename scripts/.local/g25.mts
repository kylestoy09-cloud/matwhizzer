import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const d = (await q(i, i + 999)).data!; o.push(...d); if (d.length < 1000) break } return o }
for (const ty of ['districts', 'regions']) {
  const tids = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2025).eq('tournament_type', ty)).data!.map((t: any) => t.id)
  const ms = await all((f, t) => db.from('matches').select('round, win_type, loser_entry_id').in('tournament_id', tids).range(f, t))
  const nl = ms.filter(m => !m.loser_entry_id); const c: Record<string, number> = {}; for (const m of nl) c[`${m.round} ${m.win_type}`] = (c[`${m.round} ${m.win_type}`] ?? 0) + 1
  console.log(`2024-25 ${ty}: ${ms.length} bouts, ${nl.length} with no loser`, JSON.stringify(c))
}
// region bouts in the export vs the database, by region and round
const RND: Record<string, string> = { 'Champ. Round 1': 'R2', Quarterfinal: 'QF', Semifinal: 'SF', '1st Place Match': 'F', '3rd Place Match': '3rd_Place', '5th Place Match': '5th_Place', 'Cons. Round 1': 'C1', 'Cons. Round 2': 'C2', 'Cons. Semi': 'C3' }
const src: Record<string, Set<string>> = {}; let r = 0, w = 0; const seenRounds = new Set<string>()
for (const raw of fs.readFileSync('../gt_s1_regions.txt', 'utf8').split('\n')) {
  const l = raw.trim(); const h = l.match(/^Region (\d+)$/); if (h) { r = Number(h[1]); continue }
  if (/^\d{3}$/.test(l)) { w = Number(l); continue }
  const m = l.match(/^(.+?) - (.+?) \(.*? won (?:by|in) .*? over (.*?) \(/); if (!m || !r) continue
  seenRounds.add(m[1]); if (/received a bye/.test(l)) continue
  const k = `r${r}|${RND[m[1]] ?? m[1]}`; (src[k] ??= new Set()).add(`${w}|${m[2]}|${m[3]}`)
}
console.log('round names in the 2024-25 region export:', [...seenRounds].join(' | '))
const tours = (await db.from('tournaments').select('id, name').eq('gender', 'M').eq('season_id', 2025).eq('tournament_type', 'regions')).data!
const short: string[] = []
for (const t of tours as any[]) {
  const rn = t.name.match(/r(\d+)$/)[1]
  const ms = await all((f, x) => db.from('matches').select('round').eq('tournament_id', t.id).range(f, x))
  const db_c: Record<string, number> = {}; for (const m of ms) db_c[m.round] = (db_c[m.round] ?? 0) + 1
  for (const [k, set] of Object.entries(src).filter(([k]) => k.startsWith(`r${rn}|`))) { const rd = k.split('|')[1]; if ((db_c[rd] ?? 0) < set.size) short.push(`r${rn} ${rd}: export ${set.size}, db ${db_c[rd] ?? 0}`) }
}
console.log('region rounds short in the database:', short.length ? short.join('; ') : 'none')
