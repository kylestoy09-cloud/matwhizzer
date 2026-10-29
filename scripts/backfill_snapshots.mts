// Rebuilds a season of daily snapshot reports for one gender, in date order, so
// streak state and season highs accumulate the way they would have live.
//
//   node --env-file=.env.local scripts/backfill_snapshots.mts <M|F> <season label> <season id>          dry run
//   node --env-file=.env.local scripts/backfill_snapshots.mts <M|F> <season label> <season id> --apply  backup, clear, rebuild
//
// Days = every date with a scored match in wrestler_match_score_log or a dual
// meet, for that season and gender. Before rebuilding, the gender's existing
// reports, streak state, season highs and team season highs for the season are
// saved to docs/migrations/backups/ and removed. Each day is then computed with
// src/lib/snapshot/compute(-girls).ts and saved the same way as
// /api/admin/snapshot(-girls) (report upsert, season highs only when beaten,
// streak upsert, team highs only when beaten).
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'

const [gender, season, seasonIdArg, flag] = process.argv.slice(2)
if (!['M', 'F'].includes(gender) || !season || !seasonIdArg) throw new Error('usage: <M|F> <season label> <season id> [--apply]')
const seasonId = Number(seasonIdArg)
const APPLY = flag === '--apply'
const G = gender === 'F'
const T = {
  reports: G ? 'snapshot_reports_girls' : 'snapshot_reports',
  streaks: G ? 'snapshot_streak_state_girls' : 'snapshot_streak_state',
  highs:   G ? 'snapshot_season_highs_girls' : 'snapshot_season_highs',
  team:    G ? 'snapshot_team_season_highs_girls' : 'snapshot_team_season_highs',
  duals:   G ? 'dual_meets_girls' : 'dual_meets',
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ok = <X,>(r: { data: X; error: any }) => { if (r.error) throw r.error; return r.data }
async function all(q: () => any) { let out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q().range(i, i + 999); if (error) throw error; out = out.concat(data); if (data.length < 1000) break } return out }

// The compute modules import './types' without an extension (Next resolves it,
// Node does not), so load copies with the extension added.
const TMP = 'scripts/.snapshot_tmp'
mkdirSync(TMP, { recursive: true })
for (const f of ['compute', 'compute-girls', 'types']) {
  const src = readFileSync(`src/lib/snapshot/${f}.ts`, 'utf8').replace(/from '\.\/types'/g, "from './types.ts'")
  writeFileSync(`${TMP}/${f}.ts`, src)
}
const mod = await import(`../${TMP}/${G ? 'compute-girls' : 'compute'}.ts`)
const compute = G ? mod.computeSnapshotGirls : mod.computeSnapshot
const buildStreaks = G ? mod.buildStreakStateUpsertsGirls : mod.buildStreakStateUpserts

try {
  // ── Days ──────────────────────────────────────────────────────────────────
  const logDates = await all(() => db.from('wrestler_match_score_log').select('match_date').eq('season', season).eq('gender', gender).order('id'))
  const dualQ = () => { let q = db.from(T.duals).select('meet_date').eq('season_id', seasonId); if (!G) q = q.eq('gender', 'M'); return q.order('id') }
  const dualDates = await all(dualQ)
  // The season's log also carries the previous postseason (it seeds starting
  // ratings); keep only this season's days, Nov 1 – Mar 31.
  const [sy, ey] = season.split('-').map((p, i) => i === 0 ? Number(p) : 2000 + Number(p))
  const from = `${sy}-11-01`, to = `${ey}-03-31`
  const days = [...new Set([...logDates.map((r: any) => r.match_date), ...dualDates.map((r: any) => r.meet_date)])]
    .filter((d: string) => d && d >= from && d <= to).sort()
  console.log(`${G ? 'girls' : 'boys'} ${season}: ${days.length} days, ${days[0]} → ${days[days.length - 1]}`)

  // ── Existing rows for this gender / season ───────────────────────────────
  const reports = ok(await db.from(T.reports).select('report_date,season,computed_at')) as any[]
  const reportsToClear = reports.filter(r => r.season === season || (r.report_date >= days[0] && r.report_date <= days[days.length - 1]))
  const counts = { reports: reportsToClear.length } as Record<string, number>
  for (const k of ['streaks', 'highs', 'team'] as const) counts[k] = (await db.from(T[k]).select('*', { count: 'exact', head: true }).eq('season', season)).count ?? 0
  console.log('existing rows to replace:', counts, reportsToClear.map(r => `${r.report_date} (${r.season})`).join(', '))
  if (!APPLY) process.exit(0)

  // ── Backup, then clear ───────────────────────────────────────────────────
  const backup = `docs/migrations/backups/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_snapshot_backfill_${G ? 'girls' : 'boys'}.json`
  if (existsSync(backup)) throw new Error(`backup ${backup} exists — already run today?`)
  const dates = reportsToClear.map(r => r.report_date)
  const saved = {
    reports: dates.length ? ok(await db.from(T.reports).select('*').in('report_date', dates)) : [],
    streaks: await all(() => db.from(T.streaks).select('*').eq('season', season).order('wrestler_id')),
    highs: ok(await db.from(T.highs).select('*').eq('season', season)),
    team: ok(await db.from(T.team).select('*').eq('season', season)),
  }
  writeFileSync(backup, JSON.stringify(saved))
  console.log('backup', backup, Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, (v as any[]).length])))
  if (dates.length) ok(await db.from(T.reports).delete().in('report_date', dates))
  for (const k of ['streaks', 'highs', 'team'] as const) ok(await db.from(T[k]).delete().eq('season', season))

  // ── Rebuild, day by day ──────────────────────────────────────────────────
  const t0 = Date.now()
  for (const [i, date] of days.entries()) {
    const { payload, seasonHighUpdates, updatedStreaks, todayTeamHighs } = await compute(date, season, seasonId, db)
    ok(await db.from(T.reports).upsert({ report_date: date, season, payload, computed_at: new Date().toISOString() }, { onConflict: 'report_date' }))

    for (const [stat_key, { value, context, set_on }] of Object.entries(seasonHighUpdates as Record<string, any>)) {
      const existing = ok(await db.from(T.highs).select('value, is_lower_better').eq('season', season).eq('stat_key', stat_key).maybeSingle()) as any
      const isLowerBetter = stat_key.startsWith('fastest_')
      if (existing == null || (isLowerBetter ? value < existing.value : value > existing.value)) {
        ok(await db.from(T.highs).upsert({ season, stat_key, value, context, set_on, is_lower_better: isLowerBetter }, { onConflict: 'season,stat_key' }))
      }
    }
    if (updatedStreaks && updatedStreaks.size > 0) {
      const rows = buildStreaks(updatedStreaks, season, date)
      for (let j = 0; j < rows.length; j += 500) ok(await db.from(T.streaks).upsert(rows.slice(j, j + 500), { onConflict: 'wrestler_id,season,streak_type' }))
    }
    if (todayTeamHighs && todayTeamHighs.length > 0) {
      const schoolIds = [...new Set(todayTeamHighs.map((r: any) => r.school_id))]
      const existing = ok(await db.from(T.team).select('season, school_id, stat_key, best_value, avg_time_sec').eq('season', season).in('school_id', schoolIds)) as any[]
      const ex = new Map(existing.map(e => [`${e.school_id}:${e.stat_key}`, { best_value: parseFloat(e.best_value), avg_time_sec: e.avg_time_sec }]))
      const up = todayTeamHighs.filter((r: any) => { const e = ex.get(`${r.school_id}:${r.stat_key}`); return !e || r.best_value > e.best_value || (r.best_value === e.best_value && r.avg_time_sec != null && e.avg_time_sec != null && r.avg_time_sec < e.avg_time_sec) })
      if (up.length) ok(await db.from(T.team).upsert(up.map((r: any) => ({ ...r, season, best_on: date })), { onConflict: 'season,school_id,stat_key' }))
    }
    if ((i + 1) % 10 === 0 || i === days.length - 1) console.log(`  ${i + 1}/${days.length} ${date}  (${Math.round((Date.now() - t0) / 1000)}s)`)
  }
  const after: Record<string, number> = {}
  for (const k of ['reports', 'streaks', 'highs', 'team'] as const) after[k] = (await db.from(T[k]).select('*', { count: 'exact', head: true }).eq('season', season)).count ?? 0
  console.log('done:', after)
} finally {
  rmSync(TMP, { recursive: true, force: true })
}
