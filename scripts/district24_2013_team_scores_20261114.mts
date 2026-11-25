// 2012-13 boys District 24 official team scores (tournament 243), copied by Kyle 2026-11-14 into
// History/2013/District 24 Brackets/Team Scores.rtf (place, team, points, then 1st/2nd/3rd/4th place counts — the
// place counts match the Shore Conference podium in history_podiums exactly). Copied standings are the truth
// (CLAUDE.md), stored as source 'official'. Schools come from the podium's team-order rows (same order, same 11).
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const T = 243
const POINTS = [194, 193, 135, 95, 81, 80.5, 60.5, 37, 30.5, 25.5, 16]   // places 1-11 as copied
const NAMES = ['Southern Regional', 'Toms River South', 'Lacey', 'Toms River North', 'Barnegat', 'Toms River East', 'Central Regional', 'Manchester Twp.', 'Pinelands', 'Msgr. Donovan', 'Lakewood']
const { data: order, error } = await db.from('history_podiums').select('place, school_id, schools(display_name)').eq('tournament_id', T).is('weight', null).order('place')
if (error || order?.length !== 11) throw new Error(`team order: ${error?.message ?? order?.length}`)
const { count } = await db.from('precomputed_team_scores').select('*', { count: 'exact', head: true }).eq('tournament_id', T)
if (count) throw new Error(`tournament ${T} already has ${count} team score rows — stop`)
const { data: top } = await db.from('precomputed_team_scores').select('id').order('id', { ascending: false }).limit(1)
let id = (top?.[0]?.id ?? 0) + 1
const rows = (order as unknown as { place: number; school_id: number; schools: { display_name: string } }[]).map((o, i) => {
  console.log(o.place, NAMES[i], '→', o.school_id, o.schools.display_name, POINTS[i])
  return { id: id++, tournament_id: T, school_name: o.schools.display_name, total_points: POINTS[i], season_id: 2013, tournament_type: 'boys_districts', school_id: o.school_id, source: 'official' }
})
if (process.argv.includes('--write')) {
  const { data, error: e } = await db.from('precomputed_team_scores').insert(rows).select('id')
  if (e) throw new Error(e.message)
  console.log('inserted', data?.length)
} else console.log('dry run — add --write')
