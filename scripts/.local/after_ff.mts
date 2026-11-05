import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261102_placeholder_entries_before.json', 'utf8'))
const { data: m } = await db.from('matches').select('win_type').in('id', b.matches.map((x: any) => x.id))
console.log('22 bouts now:', JSON.stringify(m!.reduce((a: any, x) => (a[x.win_type] = (a[x.win_type] ?? 0) + 1, a), {})))
const tourn = new Map(b.entries.map((e: any) => [e.tournaments.id, e.tournaments]))
for (const t of tourn.values() as any) {
  const d = Number(t.name.match(/District (\d+)/)[1])
  const { data } = await db.rpc('district_team_score', { p_district: d, p_gender: t.gender, p_season: t.season_id })
  const diffs = (data as any[]).filter(r => b.team_scores_before[`${t.name} s${t.season_id}|${r.school_name}`] !== Number(r.total_points)).map(r => `${r.school_name} ${b.team_scores_before[`${t.name} s${t.season_id}|${r.school_name}`]}→${r.total_points}`)
  console.log(`${t.name} s${t.season_id}: ${diffs.length ? diffs.join(', ') : 'same as before the cleanup'}`)
}
