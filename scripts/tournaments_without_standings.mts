// 2025-26 in-season tournaments with no team standings on file, both sides, as a CSV for Kyle to compile from
// TrackWrestling (place / team / points). Read-only. Writes docs/reviews/tournaments_without_team_standings.csv.
//   npx tsx --tsconfig tsconfig.json scripts/tournaments_without_standings.mts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
const rows: string[] = ['side,start_date,end_date,tournament,out_of_state,bouts_on_file']
for (const [side, tt, bt] of [['Boys', 'in_season_tournaments', 'tournament_bouts'], ['Girls', 'in_season_tournaments_girls', 'tournament_bouts_girls']] as const) {
  const { data: ts } = await db.from(tt).select('id, name, start_date, end_date, tournament_type').eq('season', '2025-26').order('start_date')
  const { data: have } = await db.from('in_season_tournament_team_scores').select('tournament_id').in('tournament_id', (ts ?? []).map(t => t.id))
  const got = new Set((have ?? []).map(h => h.tournament_id))
  let n = 0
  for (const t of ts ?? []) {
    if (got.has(t.id)) continue
    const { count } = await db.from(bt).select('*', { count: 'exact', head: true }).eq('in_season_tournament_id', t.id)
    rows.push([side, t.start_date, t.end_date ?? t.start_date, t.name, t.tournament_type === 'outside' ? 'yes' : '', count ?? 0].map(q).join(',')); n++
  }
  console.log(`${side}: ${n} of ${ts?.length} without standings`)
}
fs.writeFileSync('docs/reviews/tournaments_without_team_standings.csv', rows.join('\n') + '\n')
