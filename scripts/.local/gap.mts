import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const WC: Record<number, number> = {106:53,113:54,120:55,126:56,132:57,138:58,144:59,150:60,157:61,165:62,175:63,190:64,215:65,285:66}
const csv = (f: string) => { const [h, ...r] = fs.readFileSync(f, 'utf8').trim().split('\n'); const H = h.split(','); return r.map(l => Object.fromEntries(l.split(',').map((v, i) => [H[i], v]))) }
const src = new Map<string, any[]>()
for (const [f, col, base] of [['../parsed_s2_districts.csv', 'district_num', 139], ['../parsed_s2_regions.csv', 'region_num', 171], ['../parsed_s1_districts.csv', 'district_num', 92], ['../parsed_s1_regions.csv', 'region_num', 124]] as const)
  for (const r of csv(f)) { if (!r.winner_name) continue; const k = `${base + Number(r[col])}|${WC[Number(r.weight)]}`; (src.get(k) ?? src.set(k, []).get(k))!.push(r) }
const out: string[] = []; let miss = 0
for (const [k, rows] of src) {
  const [tid, wc] = k.split('|').map(Number)
  const n = (await db.from('matches').select('id', { count: 'exact', head: true }).eq('tournament_id', tid).eq('weight_class_id', wc)).count ?? 0
  if (n < rows.length) { miss += rows.length - n; out.push(`${tid} wc${wc}: source ${rows.length}, db ${n}`) }
}
console.log(`brackets checked ${src.size}; short brackets ${out.length}; bouts short ${miss}`); console.log(out.join('\n'))
