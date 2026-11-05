// Audit: every merge from 2026-11-04. For each pair, using the backup of the duplicate's rows:
// the duplicate profile is gone, nothing references it, and each moved row now points at the kept profile.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const files = ['20261104_girls_duplicate_profiles_before.json', '20261104_girls_duplicate_profiles_manasquan_before.json', '20261104_girls_duplicate_profiles_batch3_before.json', '20261104_girls_duplicate_profiles_mejia_before.json', '20261104_girls_duplicate_profiles_batch5_before.json']
const REF = ['dual_meet_matches_girls.winner_id', 'dual_meet_matches_girls.wrestler_a_id', 'dual_meet_matches_girls.wrestler_b_id', 'tournament_bouts_girls.wrestler1_id', 'tournament_bouts_girls.wrestler2_id', 'tournament_entries.wrestler_id', 'tournament_placements.wrestler_id', 'roster_grade_import.wrestler_id', 'wrestler_name_aliases.wrestler_id', 'tournament_bracket_slots.top_wrestler_id', 'tournament_bracket_slots.bottom_wrestler_id', 'tournament_bracket_slots.winner_wrestler_id', 'individual_rankings.wrestler_id', 'wrestler_hammer_scores.wrestler_id', 'wrestler_match_score_log.wrestler_id', 'wrestler_match_score_log.opponent_wrestler_id', 'lb_rs_wrestler.wrestler_id', 'lb_ps_wrestler.wrestler_id']
let fails = 0
for (const f of files) {
  const b = JSON.parse(fs.readFileSync(`docs/migrations/backups/${f}`, 'utf8'))
  for (const p of b.pairs) {
    const gone = ((await db.from('wrestlers').select('id').eq('id', p.from)).data ?? []).length === 0
    const kept = ((await db.from('wrestlers').select('id').eq('id', p.into)).data ?? []).length === 1
    let refs = 0; for (const rc of REF) { const [t, c] = rc.split('.'); refs += (await db.from(t).select('*', { count: 'exact', head: true }).eq(c, p.from)).count ?? 0 }
    // moved rows: every backed-up bout/entry/roster row of the duplicate now names the kept profile
    let moved = 0, wrong = 0
    for (const [k, rows] of Object.entries(b)) {
      const m = k.match(/^(dual_meet_matches_girls|tournament_bouts_girls|tournament_entries|roster_grade_import|tournament_placements)\.(\w+) (.+)$/)
      if (!m || m[3] !== p.from) continue
      for (const r of rows as any[]) {
        const now = (await db.from(m[1]).select(m[2]).eq('id', r.id)).data?.[0] as any
        if (now && now[m[2]] === p.into) moved++; else wrong++
      }
    }
    const ok = gone && kept && refs === 0 && wrong === 0
    if (!ok) fails++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${p.who} | duplicate gone: ${gone} | kept exists: ${kept} | references to duplicate: ${refs} | moved rows now on kept: ${moved}, not: ${wrong}`)
  }
}
console.log(fails ? `${fails} FAILED` : 'all merges pass')
