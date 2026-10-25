// Applies docs/migrations/20261024_girls_duplicate_meets_cleanup.sql via the
// service role, after saving every affected row to the backup file.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BACKUP = 'docs/migrations/backups/20261024_girls_duplicate_meets_cleanup.json'
const sql = readFileSync('docs/migrations/20261024_girls_duplicate_meets_cleanup.sql', 'utf8')
const pairs = [...sql.matchAll(/\('([0-9a-f-]{36})'::uuid, '([0-9a-f-]{36})'::uuid\)/g)].map(m => ({ del: m[1], keep: m[2] }))
const TOURN_DEL = ['a1120f19-4316-4116-9083-c2a4ff9b3ad9', 'b8c7ac03-95bc-416f-baff-e3908180a263']
const HOWDY_KEEP = '3cb4ae0d-a329-452a-a96c-6fbd3f52f023', HOWDY_DEL = 'b8c7ac03-95bc-416f-baff-e3908180a263'
const TIES = ['6e5e6e2b-f629-4e19-bff7-7fe0976ec855', '74d770e9-21ab-47aa-9e2a-7647f8d930a8']
if (pairs.length !== 9) throw new Error(`expected 9 dual pairs, got ${pairs.length}`)
const ok = <T,>(r: { data: T; error: any }) => { if (r.error) throw r.error; return r.data }
async function all(t: string, col: string, ids: string[]) { let out: any[] = []; for (let i = 0; ; i += 1000) { const d = ok(await db.from(t).select('*').in(col, ids).order('id').range(i, i + 999)) as any[]; out = out.concat(d); if (d.length < 1000) break } return out }

if (existsSync(BACKUP)) throw new Error('backup exists — already applied?')
const delIds = pairs.map(p => p.del)
const backup = {
  tournaments: ok(await db.from('in_season_tournaments_girls').select('*').in('id', [...TOURN_DEL, HOWDY_KEEP])),
  tournament_bouts: await all('tournament_bouts_girls', 'in_season_tournament_id', TOURN_DEL),
  participants: await all('in_season_tournament_participants_girls', 'in_season_tournament_id', TOURN_DEL),
  seeds: await all('in_season_tournament_seeds_girls', 'in_season_tournament_id', TOURN_DEL),
  placements: await all('tournament_placements', 'in_season_tournament_id', TOURN_DEL),
  registry: ok(await db.from('tournament_registry').select('*').eq('in_season_tournament_id', HOWDY_DEL)),
  duals: ok(await db.from('dual_meets_girls').select('*').in('id', [...delIds, ...TIES])),
  dual_bouts: await all('dual_meet_matches_girls', 'dual_meet_id', delIds),
  tasks: ok(await db.from('microcheck_tasks').select('*').eq('task_type', 'tie_resolution').eq('gender', 'F').in('entity_id', delIds)),
}
writeFileSync(BACKUP, JSON.stringify(backup, null, 1))
console.log('backup:', Object.fromEntries(Object.entries(backup).map(([k, v]) => [k, (v as any[]).length])))

// 1. tournaments
const [keepT, delT] = [backup.tournaments.find((t: any) => t.id === HOWDY_KEEP), backup.tournaments.find((t: any) => t.id === HOWDY_DEL)]
ok(await db.from('in_season_tournaments_girls').update({ venue_name: keepT.venue_name ?? delT.venue_name, venue_address: keepT.venue_address ?? delT.venue_address, location: keepT.location ?? delT.location }).eq('id', HOWDY_KEEP))
ok(await db.from('tournament_registry').update({ in_season_tournament_id: HOWDY_KEEP }).eq('in_season_tournament_id', HOWDY_DEL))
const dT = ok(await db.from('in_season_tournaments_girls').delete().in('id', TOURN_DEL).select('id')) as any[]
console.log('deleted tournaments', dT.length)
// 2. duals
let nd = 0
for (const p of pairs) {
  const k = ok(await db.from('dual_meets_girls').select('id').eq('id', p.keep)) as any[]
  if (!k.length) { console.log('SKIP (keeper missing)', p.del); continue }
  const d = ok(await db.from('dual_meets_girls').delete().eq('id', p.del).select('id')) as any[]
  if (d.length) { nd++; ok(await db.from('microcheck_tasks').delete().eq('task_type', 'tie_resolution').eq('gender', 'F').eq('entity_id', p.del)) }
}
console.log('deleted duals', nd)
// 3. ties
const t = ok(await db.from('dual_meets_girls').update({ team1_score: 33, team2_score: 33, criteria_winner_school_id: null, tiebreaker_pending: false }).in('id', TIES).select('id')) as any[]
console.log('official ties set', t.length)
