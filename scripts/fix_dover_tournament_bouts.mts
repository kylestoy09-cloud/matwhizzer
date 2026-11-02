// The Dover Holiday Tournament (2025-12-13) and Howdy Duncan (2025-12-19) sources label
// Dover, NJ as "Dover, DE" / "Dover", so the import credited Dover, NJ wrestlers' bouts to
// the Delaware school (608). The 9 wrestlers below have full Dover, NJ careers (duals,
// NJSIAA postseason, Dover's Track roster). Their bouts there move to Dover (61). The 3
// other "Dover, DE" wrestlers (no NJ record, not on Dover's roster) stay. Approved 2026-11-02.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const NJ = 61, DE = 608
const names = [['Juan', 'Torres'], ['Leo', 'Lorenzo'], ['Dominic', 'Fritts'], ['Christopher', 'McKenzie'], ['Matthew', 'Le'], ['Marcel', 'Pallavicini'], ['Jonathan', 'Carmona'], ['Christopher', 'Caamano-Enriquez'], ['Brayan', 'Cabrera']]
const ids: string[] = []
for (const [f, l] of names) {
  const { data } = await db.from('wrestlers').select('id').eq('gender', 'M').eq('first_name', f).eq('last_name', l)
  for (const w of data!) {
    const { count } = await db.from('tournament_entries').select('*', { count: 'exact', head: true }).eq('wrestler_id', w.id).eq('school_id', NJ)
    const { count: d } = await db.from('dual_meet_matches').select('*', { count: 'exact', head: true }).or(`and(wrestler_a_id.eq.${w.id},school_a_id.eq.${NJ}),and(wrestler_b_id.eq.${w.id},school_b_id.eq.${NJ})`)
    if ((count ?? 0) + (d ?? 0) > 0) ids.push(w.id)
  }
}
if (ids.length !== 9) throw new Error(`expected 9 Dover, NJ wrestlers, found ${ids.length}`)
const rows: any[] = []
for (const [w, s] of [['wrestler1_id', 'wrestler1_school_id'], ['wrestler2_id', 'wrestler2_school_id']]) {
  const { data } = await db.from('tournament_bouts').select('*').in(w, ids).eq(s, DE); rows.push(...data!.map(r => ({ ...r, _side: s })))
}
fs.writeFileSync('docs/migrations/backups/20261102_dover_tournament_bouts_before.json', JSON.stringify(rows, null, 1))
for (const r of rows) {
  const { error } = await db.from('tournament_bouts').update({ [r._side]: NJ }).eq('id', r.id).eq(r._side, DE)
  if (error) throw error
}
console.log(`moved ${rows.length} bout sides to Dover, NJ`)
const left = await db.from('tournament_bouts').select('*', { count: 'exact', head: true }).or(`wrestler1_school_id.eq.${DE},wrestler2_school_id.eq.${DE}`)
console.log('bouts still credited to Dover, DE (the 3 others):', left.count)
for (const t of ['in_season_tournament_team_scores', 'in_season_tournament_teams']) { const r = await db.from(t).select('*', { count: 'exact', head: true }).eq('school_id', DE); console.log(t, r.error ? 'n/a' : r.count) }
