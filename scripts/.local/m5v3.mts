import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['F', 'M']) for (const f of ['lb_rs_refresh', 'lb_ps_refresh']) { const r = await db.rpc(f, { p_gender: g, p_season: 2026 }); console.log(g, f, r.error?.message ?? 'ok'); await new Promise(res => setTimeout(res, 3000)) }
for (const [g, s] of [['F', '2025-26'], ['M', '2025-26 (archive)'], ['M', '2026-27']]) await db.rpc('log_admin_activity', { p_admin_email: 'kyle.stoy09@gmail.com', p_action: 'scoring_run', p_entity_type: 'wrestler_hammer_scores', p_entity_id: null, p_details: { gender: g, season: s, note: 'local run after merging 27 duplicate profiles 2026-11-05' } })
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_duplicates_before.json', 'utf8'))
let fails = 0, movedTotal = 0
for (const p of b.pairs) {
  const gone = ((await db.from('wrestlers').select('id').eq('id', p.from)).data ?? []).length === 0
  const kept = (await db.from('wrestlers').select('first_name, last_name, grade, is_active').eq('id', p.into)).data?.[0]
  let moved = 0, wrong = 0
  for (const [k, rows] of Object.entries(b)) {
    const m = k.match(/^(dual_meet_matches(?:_girls)?|tournament_bouts(?:_girls)?|tournament_entries|roster_grade_import|tournament_placements|in_season_tournament_seeds(?:_girls)?)\.(\w+) (.+)$/)
    if (!m || m[3] !== p.from) continue
    for (const r of rows as any[]) { const now = (await db.from(m[1]).select(m[2]).eq('id', r.id)).data?.[0] as any; if (now && now[m[2]] === p.into) moved++; else wrong++ }
  }
  movedTotal += moved; if (!gone || !kept || wrong) fails++
  if (!gone || !kept || wrong) console.log(`FAIL ${p.who} gone ${gone} kept ${!!kept} wrong ${wrong}`)
}
console.log(`${b.pairs.length - fails}/${b.pairs.length} pass; ${movedTotal} moved records now on the kept profile`)
const look = async (id: string) => JSON.stringify((await db.from('wrestlers').select('first_name, last_name, grade, is_active').eq('id', id)).data?.[0])
const find = (re: RegExp) => b.pairs.find((p: any) => re.test(p.who))!.into
console.log('Mariana:', await look(find(/Carteret/)), '| Jackson Clarke Goss:', await look(find(/Steinert/)), '| Gabriella Weinstein:', await look(find(/Scotch Plains/)), '| Julian Sanchez:', await look(find(/West Windsor/)))
