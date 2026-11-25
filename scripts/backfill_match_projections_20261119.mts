// Backfill projection tracking for 2025-26 (Kyle 2026-11-19), so the Projection Accuracy page has a full season to
// look back on and test levers against: every NJ-vs-NJ bout in the 2025-26 WRR match log is projected with each side's
// version 1 settings (the formula as it stood) from what was known going in, through the same code the rating rebuild
// uses (src/lib/projectionTrack.ts recordProjections, recorded_how 'backfill'). Inserts only — bouts on file are left
// as they are. Needs docs/migrations/20261119_match_projection_tracking.sql. Dry run unless --apply.
//   npx tsx scripts/backfill_match_projections_20261119.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import { buildBouts, recordProjections, activeProjectionSettings, type LogEntry } from '../src/lib/projectionTrack'

const APPLY = process.argv.includes('--apply')
const SEASON = '2025-26'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

for (const g of ['M', 'F'] as const) {
  const s = await activeProjectionSettings(db, g)
  if (!s) throw new Error('run docs/migrations/20261119_match_projection_tracking.sql first (no active projection_settings)')
  if (s.version !== 1) throw new Error(`${g}: active settings are version ${s.version}; the backfill is meant to run with version 1`)
  const log: LogEntry[] = []
  for (let last = ''; ;) {
    let q = db.from('wrestler_match_score_log').select('id, wrestler_id, opponent_wrestler_id, match_date, match_source, source_id, pre_match_hammer, opponent_pre_match_hammer, outcome_rank')
      .eq('gender', g).eq('season', SEASON).order('id').limit(1000)
    if (last) q = q.gt('id', last)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    log.push(...(data ?? []).map(r => ({ ...r, pre_match_hammer: Number(r.pre_match_hammer), opponent_pre_match_hammer: Number(r.opponent_pre_match_hammer) }) as LogEntry))
    if (!data || data.length < 1000) break
    last = data[data.length - 1].id as string
  }
  const { count: before } = await db.from('match_projections').select('id', { count: 'exact', head: true }).eq('gender', g).eq('season', SEASON)
  const bouts = buildBouts(SEASON, log)
  console.log(`${g === 'M' ? 'Boys' : 'Girls'} ${SEASON}: ${log.length} log rows → ${bouts.length} bouts to track (${before ?? 0} on file)`)
  if (!APPLY) continue
  const r = await recordProjections(db, g, SEASON, log, 'backfill')
  const { count: after } = await db.from('match_projections').select('id', { count: 'exact', head: true }).eq('gender', g).eq('season', SEASON)
  console.log(`  recorded ${r.recorded}, results refreshed ${r.updated} → ${after} on file`)
}
console.log(APPLY ? 'done' : 'dry run')
