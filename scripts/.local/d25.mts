import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const d = (await q(i, i + 999)).data!; o.push(...d); if (d.length < 1000) break } return o }
const RND: Record<string, string> = { 'Champ. Round 1': 'R2', Quarterfinal: 'QF', Semifinal: 'SF', '1st Place Match': 'F', '3rd Place Match': '3rd_Place' }
const WC: Record<number, number> = {106:53,113:54,120:55,126:56,132:57,138:58,144:59,150:60,157:61,165:62,175:63,190:64,215:65,285:66}
const n = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '')
// source bouts by district|weight
const src = new Map<string, { round: string; w: string; l: string; line: string }[]>(); let d = 0, w = 0, inList = false, afterList = false
for (const raw of fs.readFileSync('../gt_s1_districts.txt', 'utf8').split('\n')) {
  const l = raw.trim(); const h = l.match(/^District (\d+)$/); if (h) { d = Number(h[1]); afterList = false; inList = false; continue }
  // the export has no "District 21" line: a second standings list inside District 20 starts District 21
  const st = /^\d+\t.+\t[\d.]+\s*$/.test(raw)
  if (st && raw.startsWith('1\t') && afterList) d = d + 1
  if (st) { inList = true; continue } else if (inList) { inList = false; afterList = true }
  if (/^\d{3}$/.test(l)) { w = Number(l); continue }
  const m = l.match(/^(Champ\. Round 1|Quarterfinal|Semifinal|1st Place Match|3rd Place Match) - (.+?) \(.*?\) [\d-]+ won (?:by|in) .*? over (.*?) \(/)
  if (!m || /received a bye/.test(l) || d === 23) continue
  const k = `${d}|${w}`; const arr = src.get(k) ?? src.set(k, []).get(k)!
  if (!arr.some(x => x.line === l)) arr.push({ round: RND[m[1]], w: n(m[2]), l: n(m[3]), line: l })
}
const tours = (await db.from('tournaments').select('id, name').eq('gender', 'M').eq('season_id', 2025).eq('tournament_type', 'districts')).data!
const missing: string[] = []; const extra: string[] = []; const byD: Record<number, number> = {}
for (const t of tours as any[]) {
  const dn = Number(t.name.match(/District (\d+)$/)[1])
  const ms = await all((f, x) => db.from('matches').select('round, weight_class_id, w:winner_entry_id(wrestlers(first_name,last_name)), l:loser_entry_id(wrestlers(first_name,last_name))').eq('tournament_id', t.id).range(f, x))
  for (const [wt, wc] of Object.entries(WC)) {
    const s = (src.get(`${dn}|${wt}`) ?? []).map(x => ({ ...x, used: false }))
    for (const m of ms.filter(m => m.weight_class_id === wc)) {
      const mw = n(`${m.w?.wrestlers?.first_name ?? ''}${m.w?.wrestlers?.last_name ?? ''}`), ml = n(`${m.l?.wrestlers?.first_name ?? ''}${m.l?.wrestlers?.last_name ?? ''}`)
      const hit = s.find(x => !x.used && x.round === m.round && x.w === mw && (x.l === ml || !ml))
      if (hit) hit.used = true; else extra.push(`D${dn} ${wt} ${m.round}: ${mw} over ${ml || '(none)'}`)
    }
    for (const x of s.filter(x => !x.used && !/forfeit|^$/i.test(x.l))) { missing.push(`D${dn} ${wt}: ${x.line.slice(0, 120)}`); byD[dn] = (byD[dn] ?? 0) + 1 }
  }
}
console.log(`source bouts not in the database: ${missing.length}`, JSON.stringify(byD)); console.log(missing.join('\n'))
console.log(`database bouts not in the source: ${extra.length}`); console.log(extra.slice(0, 10).join('\n'))
