// Boys 2025-26 district team totals: TrackWrestling scored 5 tech falls labelled "TF-1" with a 1-point
// bonus instead of 1.5 (a scoring-table input error; every tech fall is worth the same, Kyle
// 2026-11-05). Kyle, 2026-11-06: put the correct totals on the site. Each winner's school gets +0.5 in
// precomputed_team_scores (the official totals the site shows). Backup first.
//   npx tsx --tsconfig tsconfig.json scripts/fix_tf1_team_totals_20261106.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const FIX: [number, number, number, string][] = [   // tournament, school, TrackWrestling total, bout
  [146, 21, 345, 'D7 Anthony Riotto (Bergen Catholic) QF over Chuck Willoe, TF-1 19-3'],
  [146, 52, 132, 'D7 Tommy Perrota (Fair Lawn) QF over Xavian Robinson, TF-1 16-1'],
  [153, 322, 72.5, 'D14 Ethan Delacruz (Bound Brook) 1st Place over Matthew Vazquez, TF-1 19-4'],
  [153, 135, 252, 'D14 Nicholas Romaniello (North Hunterdon) QF over Oscar Casas, TF-1 17-1'],
  [155, 126, 96, 'D16 Yehuda Pincus (Scotch Plains-Fanwood) Champ. Round 1 over Selah Davis, TF-1 17-2'],
]
const rows: any[] = []
for (const [t, s, was, why] of FIX) {
  const r = (await db.from('precomputed_team_scores').select('*').eq('tournament_id', t).eq('school_id', s)).data!
  if (r.length !== 1 || Number(r[0].total_points) !== was) throw new Error(`${why}: expected one row at ${was}, found ${JSON.stringify(r)}`)
  rows.push(r[0]); console.log(`${why}: ${was} → ${was + 0.5}`)
}
// order check: any other school within half a point that the change passes or ties
for (const t of [...new Set(FIX.map(f => f[0]))]) {
  const all = (await db.from('precomputed_team_scores').select('school_id, school_name, total_points').eq('tournament_id', t)).data!
  for (const [ft, s, was] of FIX.filter(f => f[0] === t)) for (const o of all) if (o.school_id !== s && Number(o.total_points) > was && Number(o.total_points) <= was + 0.5) console.log(`   order: ${o.school_name} (${o.total_points}) is passed or tied`)
}
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261106_tf1_team_totals_before.json', JSON.stringify(rows, null, 1))
for (const r of rows) { const u = await db.from('precomputed_team_scores').update({ total_points: Number(r.total_points) + 0.5 }).eq('id', r.id).eq('total_points', r.total_points).select('id, total_points'); if (u.error || u.data!.length !== 1) throw new Error(`row ${r.id}: ${u.error?.message ?? 'not updated'}`); console.log('updated', r.school_name, u.data![0].total_points) }
