// Kyle 2026-11-21 ("you can delete those"): records the Powerade 2025-26 history load left with nothing attached —
// school Homewood Flossmoor (IL) #1262 (a double of #765; its alias moved there) and 5 profiles (2 from the failed
// first run, 3 doubles of Franklin (PA) wrestlers already on file). Every table that points at them is counted first;
// anything attached stops the delete. Backup first. Dry run unless --apply.
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SCHOOL = 1262
const DOUBLES = ['7a4dcd5e-6598-43d7-8837-b2ac52cb59eb', 'b2ac7573-d1f1-4571-bd28-8ac6b19f9695', '2e9dbfab-1123-4df8-9bcf-301f02f97d39']
// the 2 from the failed run: created 17:40–17:41 with no bouts or placements
const { data: run } = await db.from('wrestlers').select('id').gte('created_at', '2026-11-21T17:40:00Z').lte('created_at', '2026-11-21T17:41:00Z')
const runIds = (run ?? []).map(w => w.id)
const used = new Set<string>()
for (let i = 0; i < runIds.length; i += 150) {
  const c = runIds.slice(i, i + 150)
  const [a, b, p] = await Promise.all([db.from('tournament_bouts').select('wrestler1_id').in('wrestler1_id', c), db.from('tournament_bouts').select('wrestler2_id').in('wrestler2_id', c), db.from('tournament_placements').select('wrestler_id').in('wrestler_id', c)])
  for (const r of a.data ?? []) used.add(r.wrestler1_id); for (const r of b.data ?? []) used.add(r.wrestler2_id); for (const r of p.data ?? []) used.add(r.wrestler_id)
}
const wrestlers = [...new Set([...runIds.filter(id => !used.has(id)), ...DOUBLES])]
const W_REFS: [string, string][] = [['tournament_bouts', 'wrestler1_id'], ['tournament_bouts', 'wrestler2_id'], ['tournament_bouts_girls', 'wrestler1_id'], ['tournament_bouts_girls', 'wrestler2_id'], ['tournament_placements', 'wrestler_id'], ['tournament_entries', 'wrestler_id'], ['dual_meet_matches', 'wrestler_a_id'], ['dual_meet_matches', 'wrestler_b_id'], ['dual_meet_matches_girls', 'wrestler_a_id'], ['dual_meet_matches_girls', 'wrestler_b_id'], ['wrestler_name_aliases', 'wrestler_id'], ['wrestler_hammer_scores', 'wrestler_id'], ['wrestler_match_score_log', 'wrestler_id'], ['boys_college_entries', 'wrestler_id'], ['girls_college_entries', 'wrestler_id'], ['boys_prospects', 'wrestler_id'], ['girls_prospects', 'wrestler_id'], ['match_projections', 'a_wrestler_id'], ['match_projections', 'b_wrestler_id'], ['history_finishes', 'wrestler_id']]
const S_REFS: [string, string][] = [['school_aliases', 'school_id'], ['tournament_bouts', 'wrestler1_school_id'], ['tournament_bouts', 'wrestler2_school_id'], ['tournament_bouts_girls', 'wrestler1_school_id'], ['tournament_bouts_girls', 'wrestler2_school_id'], ['tournament_placements', 'school_id'], ['in_season_tournament_team_scores', 'school_id'], ['tournament_entries', 'school_id'], ['wrestler_name_aliases', 'school_id'], ['dual_meets', 'home_school_id'], ['dual_meets', 'away_school_id'], ['wrestler_hammer_scores', 'school_id']]
const counts: Record<string, number | string> = {}
for (const [t, c] of W_REFS) { const { count, error } = await db.from(t).select('*', { count: 'exact', head: true }).in(c, wrestlers); counts[`${t}.${c}`] = error ? `n/a (${error.message.slice(0, 40)})` : count ?? 0 }
for (const [t, c] of S_REFS) { const { count, error } = await db.from(t).select('*', { count: 'exact', head: true }).eq(c, SCHOOL); counts[`school ${t}.${c}`] = error ? `n/a (${error.message.slice(0, 40)})` : count ?? 0 }
console.log({ wrestlers: wrestlers.length, counts })
const attached = Object.values(counts).some(v => typeof v === 'number' && v > 0)
if (attached) { console.log('STOP: something is attached'); process.exit(1) }
if (!APPLY) { console.log('dry run'); process.exit(0) }
const { data: wRows } = await db.from('wrestlers').select('*').in('id', wrestlers)
const { data: sRows } = await db.from('schools').select('*').eq('id', SCHOOL)
writeFileSync('docs/migrations/backups/20261121_empty_records.json', JSON.stringify({ wrestlers: wRows, schools: sRows }, null, 1))
const e1 = await db.from('wrestlers').delete().in('id', wrestlers); if (e1.error) throw new Error(e1.error.message)
const e2 = await db.from('schools').delete().eq('id', SCHOOL); if (e2.error) throw new Error(e2.error.message)
console.log(`deleted ${wrestlers.length} profiles and school ${SCHOOL} (backup docs/migrations/backups/20261121_empty_records.json)`)
