import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const L = fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/dmd2026.txt', 'utf8').split('\n')
const n = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const tw = new Map<string, number>()  // d|weight|name → points
let d = 0, w = 0
for (const l of L) {
  const h = l.match(/^NJSIAA District (\d+) Results for/); if (h) { d = Number(h[1]); continue }
  if (/^\d{3}$/.test(l.trim())) { w = Number(l.trim()); continue }
  const m = l.match(/^(.+?) \(\d+-\d+\) (?:placed|place is).*?scored ([\d.]+) team points\./)
  if (m && d) tw.set(`${d}|${w}|${n(m[1])}`, Number(m[2]))
}
let same = 0, diff = 0, siteOnly = 0, deltas: number[] = []; const ex: string[] = []
const seen = new Set<string>()
for (let dd = 1; dd <= 18; dd++) {
  const rows = (await db.rpc('district_team_pts', { p_district: dd, p_gender: 'M', p_season: 2026 })).data as any[]
  for (const r of rows ?? []) {
    const k = `${dd}|${r.weight}|${n(r.wrestler_name)}`; seen.add(k)
    const t = tw.get(k)
    if (t == null) { siteOnly++; ex.push(`MISSING D${dd} ${r.weight} ${r.wrestler_name} (${r.school}): site ${r.team_points}`); continue }
    if (Math.abs(t - Number(r.team_points)) < 0.01) same++; else { diff++; deltas.push(t - Number(r.team_points)); ex.push(`D${dd} ${r.weight} ${r.wrestler_name}: site ${r.team_points}, TrackWrestling ${t}`) }
  }
}
deltas.sort((a, b) => a - b)
const twScoring = [...tw.entries()].filter(([k, v]) => v > 0 && k.split('|')[0] <= '18').length
console.log(`TrackWrestling per-wrestler lines D1-18: ${tw.size} (${[...tw.values()].filter(v => v > 0).length} with points)`)
console.log(`site rows checked: ${same + diff + siteOnly}; equal ${same}; different ${diff}; not matched by name ${siteOnly}`)
if (deltas.length) console.log(`TrackWrestling minus site: min ${deltas[0]}, median ${deltas[Math.floor(deltas.length / 2)]}, max ${deltas.at(-1)}`)
console.log(ex.join('\n'))
const count: Record<string, number> = {}; for (const x of deltas) count[x] = (count[x] ?? 0) + 1
console.log('difference sizes:', JSON.stringify(Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 8)))
