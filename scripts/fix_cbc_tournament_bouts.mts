// 2026 East Coast Catholic Classic (2026-01-09): its results name both Christian Brothers
// Academy (NJ, 197) and Christian Brothers College (St. Louis, 506) "Christian Brothers",
// so all their bouts were credited to CBA. 18 wrestlers there are CBC: their aliases are
// at 506, they're flagged out-of-state, none is on CBA's Track roster, none has a dual.
// Their bout sides move to CBC (506); the 23 CBA wrestlers stay. Approved 2026-11-02.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const CBA = 197, CBC = 506
const { data: t } = await db.from('in_season_tournaments').select('id').eq('name', '2026 East Coast Catholic Classic').single()
const { data: bouts } = await db.from('tournament_bouts').select('*').eq('in_season_tournament_id', t!.id)
const ids = [...new Set(bouts!.flatMap(b => [b.wrestler1_school_id === CBA ? b.wrestler1_id : null, b.wrestler2_school_id === CBA ? b.wrestler2_id : null]).filter(Boolean))] as string[]
const { data: ws } = await db.from('wrestlers').select('id, is_oos').in('id', ids)
const { data: al } = await db.from('wrestler_name_aliases').select('wrestler_id, school_id').in('wrestler_id', ids)
const cbc = new Set(ws!.filter(w => w.is_oos && al!.some(a => a.wrestler_id === w.id && a.school_id === CBC) && !al!.some(a => a.wrestler_id === w.id && a.school_id === CBA)).map(w => w.id))
if (cbc.size !== 18) throw new Error(`expected 18 CBC wrestlers, found ${cbc.size}`)
const changes = bouts!.flatMap(b => [
  ...(b.wrestler1_school_id === CBA && cbc.has(b.wrestler1_id) ? [{ id: b.id, col: 'wrestler1_school_id' }] : []),
  ...(b.wrestler2_school_id === CBA && cbc.has(b.wrestler2_id) ? [{ id: b.id, col: 'wrestler2_school_id' }] : []),
])
fs.writeFileSync('docs/migrations/backups/20261102_cbc_tournament_bouts_before.json', JSON.stringify(bouts!.filter(b => changes.some(c => c.id === b.id)), null, 1))
for (const c of changes) { const { error } = await db.from('tournament_bouts').update({ [c.col]: CBC }).eq('id', c.id).eq(c.col, CBA); if (error) throw error }
console.log(`moved ${changes.length} bout sides for ${cbc.size} CBC wrestlers to Christian Brothers College`)
