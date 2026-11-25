import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const WC: Record<number, number> = {106:53,113:54,120:55,126:56,132:57,138:58,144:59,150:60,157:61,165:62,175:63,190:64,215:65,285:66}
const csv = (f: string) => { const [h, ...r] = fs.readFileSync(f, 'utf8').trim().split('\n'); const H = h.split(','); return r.map(l => Object.fromEntries(l.split(',').map((v, i) => [H[i], v]))) }
const n = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '')
const src = new Map<string, any[]>()
for (const [f, col, base, lab] of [['../parsed_s2_districts.csv', 'district_num', 139, 'S2 D'], ['../parsed_s2_regions.csv', 'region_num', 171, 'S2 R'], ['../parsed_s1_districts.csv', 'district_num', 92, 'S1 D'], ['../parsed_s1_regions.csv', 'region_num', 124, 'S1 R']] as const)
  for (const r of csv(f)) { if (!r.winner_name) continue; const k = `${base + Number(r[col])}|${WC[Number(r.weight)]}`; (src.get(k) ?? src.set(k, []).get(k))!.push({ ...r, lab: `${lab}${r[col]}` }) }
const missing: any[] = []
for (const [k, rows] of src) {
  const [tid, wc] = k.split('|').map(Number)
  const cnt = (await db.from('matches').select('id', { count: 'exact', head: true }).eq('tournament_id', tid).eq('weight_class_id', wc)).count ?? 0
  if (cnt >= rows.length) continue
  const ms = (await db.from('matches').select('round, w:winner_entry_id(wrestlers(first_name,last_name)), l:loser_entry_id(wrestlers(first_name,last_name))').eq('tournament_id', tid).eq('weight_class_id', wc)).data as any[]
  const have = ms.map(m => `${n(m.w?.wrestlers?.first_name + m.w?.wrestlers?.last_name)}|${n((m.l?.wrestlers?.first_name ?? '') + (m.l?.wrestlers?.last_name ?? ''))}`)
  for (const r of rows) { const key = `${n(r.winner_name)}|${n(r.loser_name)}`; const i = have.indexOf(key); if (i >= 0) have.splice(i, 1); else missing.push({ tid, wc, ...r }) }
}
const byRound: Record<string, number> = {}; for (const m of missing) byRound[`${m.lab.slice(0, 4)} ${m.round}${m.loser_name ? '' : ' (no loser)'}`] = (byRound[`${m.lab.slice(0, 4)} ${m.round}${m.loser_name ? '' : ' (no loser)'}`] ?? 0) + 1
console.log('missing source bouts:', missing.length, JSON.stringify(byRound))
fs.writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/missing_bouts.json', JSON.stringify(missing, null, 1))
for (const m of missing.filter(m => m.loser_name)) console.log(`  ${m.lab} ${m.weight} ${m.round}: ${m.winner_name} (${m.winner_school}) over ${m.loser_name} (${m.loser_school})`)
