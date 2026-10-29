// Applies docs/migrations/20261028_newton_kittatinny_playoffs.sql via the service role.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, existsSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BACKUP = 'docs/migrations/backups/20261028_newton_kittatinny_playoffs.json'
const ok = <T,>(r: { data: T; error: any }) => { if (r.error) throw r.error; return r.data }
if (existsSync(BACKUP)) throw new Error('backup exists — already applied?')
const meets = ok(await db.from('dual_meets_girls').select('*').eq('season_id', 2026).eq('is_playoff', true).or('team1_school_id.eq.315,team2_school_id.eq.315')) as any[]
if (meets.length !== 2) throw new Error(`expected 2 meets, got ${meets.length}`)
const ids = meets.map(m => m.id)
const bouts = ok(await db.from('dual_meet_matches_girls').select('*').in('dual_meet_id', ids)) as any[]
const alias = ok(await db.from('school_aliases').select('*').eq('id', 577)) as any[]
writeFileSync(BACKUP, JSON.stringify({ meets, bouts, alias }, null, 1))
for (const m of meets) {
  ok(await db.from('dual_meets_girls').update({ team1_school_id: m.team1_school_id === 315 ? 24 : m.team1_school_id, team2_school_id: m.team2_school_id === 315 ? 24 : m.team2_school_id }).eq('id', m.id))
}
ok(await db.from('dual_meet_matches_girls').update({ school_a_id: 24 }).in('dual_meet_id', ids).eq('school_a_id', 315))
ok(await db.from('dual_meet_matches_girls').update({ school_b_id: 24 }).in('dual_meet_id', ids).eq('school_b_id', 315))
ok(await db.from('school_aliases').update({ school_id: 24 }).eq('id', 577).eq('alias', 'Newton/Kittatinny'))
const { count } = await db.from('dual_meets_girls').select('*', { count: 'exact', head: true }).eq('season_id', 2026).or('team1_school_id.eq.315,team2_school_id.eq.315')
console.log('moved', meets.length, 'meets,', bouts.length, 'bouts; girls meets left on 315:', count)
