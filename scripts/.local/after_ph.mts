import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261102_placeholder_entries_before.json', 'utf8'))
const ids = b.entries.map((e: any) => e.id)
const { count: ent } = await db.from('tournament_entries').select('id', { count: 'exact', head: true }).in('id', ids)
const { count: noSchool } = await db.from('tournament_entries').select('id', { count: 'exact', head: true }).is('school_id', null)
const { data: m } = await db.from('matches').select('id, win_type, loser_entry_id').in('id', b.matches.map((x: any) => x.id))
console.log('entries left', ent, '| entries with no school anywhere', noSchool, '| matches left', m!.length, JSON.stringify(m!.reduce((a: any, x) => (a[x.win_type] = (a[x.win_type] ?? 0) + 1, a), {})))
const tourn = new Map(b.entries.map((e: any) => [e.tournaments.id, e.tournaments]))
const after: Record<string, number> = {}
for (const t of tourn.values() as any) {
  const d = Number(t.name.match(/District (\d+)/)[1])
  const { data } = await db.rpc('district_team_score', { p_district: d, p_gender: t.gender, p_season: t.season_id })
  for (const r of data as any[]) after[`${t.name} s${t.season_id}|${r.school_name}`] = Number(r.total_points)
}
const before = b.team_scores_before
const keys = new Set([...Object.keys(before), ...Object.keys(after)])
const diffs = [...keys].filter(k => before[k] !== after[k])
console.log(diffs.length ? diffs.map(k => `${k}: ${before[k]} -> ${after[k]}`).join('\n') : 'district team scores unchanged (' + keys.size + ' schools)')
// cached team scores (precomputed_team_scores) for these tournaments vs live
for (const t of tourn.values() as any) {
  const { data: c } = await db.from('precomputed_team_scores').select('school_id, total_points').eq('tournament_id', t.id)
  console.log(t.name, 's' + t.season_id, 'cache rows', c?.length)
}
for (const g of ['M', 'F']) for (const fn of ['lb_rs_refresh', 'lb_ps_refresh']) { const { data, error } = await db.rpc(fn, { p_gender: g, p_season: 2026 }); console.log(g, fn, error?.message ?? JSON.stringify(data)) }
const { count: lb } = await db.from('lb_ps_wrestler').select('wrestler_id', { count: 'exact', head: true }).in('wrestler_id', b.profiles.map((p: any) => p.id))
console.log('filler rows left on postseason leaderboards', lb)
