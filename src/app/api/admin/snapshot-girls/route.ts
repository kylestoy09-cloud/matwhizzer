// POST /api/admin/snapshot-girls
// Computes and persists a girls snapshot report for a given date.
// Body: { date: string, season: string, seasonId: number }

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { computeSnapshotGirls, buildStreakStateUpsertsGirls } from '@/lib/snapshot/compute-girls'

export const dynamic = 'force-dynamic'

function serviceDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return null
  const { data } = await userSupabase.from('app_users').select('role').eq('id', user.id).single()
  return data?.role === 'admin' ? user : null
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { date, season, seasonId } = body

  if (!date || !season || !seasonId) {
    return NextResponse.json({ error: 'Missing date, season, or seasonId' }, { status: 400 })
  }

  const db = serviceDb()

  let payload, seasonHighUpdates, updatedStreaks, todayTeamHighs
  try {
    const result = await computeSnapshotGirls(date, season, seasonId, db)
    payload           = result.payload
    seasonHighUpdates = result.seasonHighUpdates
    updatedStreaks     = result.updatedStreaks
    todayTeamHighs    = result.todayTeamHighs
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Compute failed: ${message}` }, { status: 500 })
  }

  const { error: reportError } = await db.from('snapshot_reports_girls').upsert({
    report_date: date,
    season,
    payload,
    computed_at: new Date().toISOString(),
  }, { onConflict: 'report_date' })

  if (reportError) {
    return NextResponse.json({ error: `Failed to save report: ${reportError.message}` }, { status: 500 })
  }

  for (const [stat_key, { value, context, set_on }] of Object.entries(seasonHighUpdates)) {
    const { data: existing } = await db.from('snapshot_season_highs_girls')
      .select('value, is_lower_better')
      .eq('season', season)
      .eq('stat_key', stat_key)
      .maybeSingle()

    const isLowerBetter = stat_key.startsWith('fastest_')
    const beats = existing == null ||
      (isLowerBetter ? value < existing.value : value > existing.value)

    if (beats) {
      await db.from('snapshot_season_highs_girls').upsert({
        season, stat_key, value, context, set_on, is_lower_better: isLowerBetter,
      }, { onConflict: 'season,stat_key' })
    }
  }

  if (updatedStreaks && updatedStreaks.size > 0) {
    const streakRows = buildStreakStateUpsertsGirls(updatedStreaks, season, date)
    await db.from('snapshot_streak_state_girls').upsert(streakRows, { onConflict: 'wrestler_id,season,streak_type' })
  }

  if (todayTeamHighs && todayTeamHighs.length > 0) {
    const schoolIds = [...new Set(todayTeamHighs.map(r => r.school_id))]
    const { data: existing } = await db.from('snapshot_team_season_highs_girls')
      .select('season, school_id, stat_key, best_value, avg_time_sec')
      .eq('season', season).in('school_id', schoolIds)
    const existMap = new Map<string, { best_value: number; avg_time_sec: number | null }>()
    for (const e of (existing ?? [])) existMap.set(`${e.school_id}:${e.stat_key}`, { best_value: parseFloat(e.best_value), avg_time_sec: e.avg_time_sec })
    const toUpsert = todayTeamHighs.filter(row => {
      const ex = existMap.get(`${row.school_id}:${row.stat_key}`)
      if (!ex) return true
      if (row.best_value > ex.best_value) return true
      if (row.best_value === ex.best_value && row.avg_time_sec != null && ex.avg_time_sec != null && row.avg_time_sec < ex.avg_time_sec) return true
      return false
    })
    if (toUpsert.length > 0) {
      await db.from('snapshot_team_season_highs_girls').upsert(
        toUpsert.map(r => ({ ...r, season, best_on: date })),
        { onConflict: 'season,school_id,stat_key' }
      )
    }
  }

  return NextResponse.json({ ok: true, date })
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = req.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

  const db = serviceDb()
  const { data, error } = await db.from('snapshot_reports_girls')
    .select('report_date, season, payload, computed_at')
    .eq('report_date', date)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'No snapshot for this date' }, { status: 404 })

  const [teamHighsRes, scalarHighsRes] = await Promise.all([
    db.from('snapshot_team_season_highs_girls').select('school_id, school_name, stat_key, best_value, avg_time_sec, bonus_wins, total_bouts, pins, techs, best_on').eq('season', data.season),
    db.from('snapshot_season_highs_girls').select('stat_key, value, context, set_on').eq('season', data.season),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function groupTeamHighs(rows: any[]) {
    const g: Record<string, any[]> = { pins: [], techs: [], combined: [], bonus_pct: [] }
    for (const r of rows) { const key = r.stat_key as string; if (!g[key]) g[key] = []; g[key].push({ ...r, best_value: parseFloat(r.best_value) }) }
    for (const key of Object.keys(g)) { g[key].sort((a: any, b: any) => b.best_value - a.best_value || (a.avg_time_sec ?? Infinity) - (b.avg_time_sec ?? Infinity)) }
    return g
  }

  const scalar: Record<string, unknown> = {}
  for (const r of (scalarHighsRes.data ?? [])) scalar[r.stat_key] = { value: r.value, context: r.context, set_on: r.set_on }

  return NextResponse.json({ ...data, season_highs: { team: groupTeamHighs(teamHighsRes.data ?? []), scalar } })
}
