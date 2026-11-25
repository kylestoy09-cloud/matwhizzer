// Same as POST /api/admin/snapshot-season: build the End of Season report and save it.
import { createClient } from '@supabase/supabase-js'
import { buildSeasonReport } from '../../src/lib/snapshot/seasonReport'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const gender of ['M', 'F'] as const) {
  const payload = await buildSeasonReport(db as any, gender, 2026)
  const { error } = await db.from(gender === 'F' ? 'snapshot_season_reports_girls' : 'snapshot_season_reports').upsert({ season: payload.season, payload, computed_at: new Date().toISOString() }, { onConflict: 'season' })
  if (error) throw error
  const s = payload.bests.streaks
  for (const k of ['win', 'pin', 'tech', 'bonus'] as const) console.log(' ', gender, 'carried', k, payload.bests.active_streaks![k].slice(0, 5).map(x => `${x.wrestler_name} (${x.school_name}, ${x.class_year}) ${x.streak_len}`).join(' · '))
  for (const x of payload.bests.toughest_schedules!.slice(0, 10)) console.log('  tough', x.avg_opp, x.wrestler_name, `(${x.school_name})`, x.matches, `${x.wins}-${x.losses}`)
  console.log(gender, payload.season, 'saved | top win', s.win.slice(0, 3).map(x => `${x.wrestler_name} ${x.streak_len}`).join(', '), '| top pin', s.pin.slice(0, 2).map(x => `${x.wrestler_name} ${x.streak_len}`).join(', '))
}
