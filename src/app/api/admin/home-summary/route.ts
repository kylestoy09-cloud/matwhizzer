import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getSeasonProgress } from '@/lib/season-progress'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSupabase
    .from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// GET /api/admin/home-summary?seasonId=X&gender=M
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawId = req.nextUrl.searchParams.get('seasonId')
  const rawG  = req.nextUrl.searchParams.get('gender')
  const seasonId = rawId ? Number(rawId) : undefined
  const gender: 'M' | 'F' = rawG === 'F' ? 'F' : 'M'

  const db = createSupabaseAdmin()

  // Resolve season
  let season: { id: number; year_label: string } | null = null
  if (seasonId !== undefined) {
    const { data } = await db.from('seasons').select('id, year_label').eq('id', seasonId).single()
    season = data
  } else {
    const { data: sgs } = await db
      .from('season_gender_state')
      .select('season_id')
      .eq('gender', gender)
      .eq('is_public_default', true)
      .single()
    if (sgs) {
      const { data } = await db.from('seasons').select('id, year_label').eq('id', sgs.season_id).single()
      season = data
    }
  }

  if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 })

  const sid = season.id
  const label = season.year_label

  // ── Season progress (data-driven) ───────────────────────────────────────
  const seasonProgress = await getSeasonProgress(sid, gender)

  // ── Preseason checks (auto, not manual) ─────────────────────────────────
  const p = gender === 'F' ? 'girls' : 'boys'
  // Season calendar event types every season needs, per gender. Wrestler profiles, hammer
  // recalculation and playoff detection read their dates from these rows.
  const REQUIRED_CALENDAR = gender === 'F'
    ? ['individual_region_girls', 'individual_state_girls',
       'team_playoff_r12_girls', 'team_playoff_sectional_final_girls', 'team_playoff_state_final_girls']
    : ['individual_district_boys', 'individual_region_boys', 'individual_state_boys',
       'team_playoff_r12_public', 'team_playoff_sectional_final_public', 'team_playoff_state_sf_public',
       'team_playoff_state_final_public', 'team_playoff_r12_np', 'team_playoff_state_sf_np', 'team_playoff_state_final_np']

  const [
    { count: groupCount },
    { count: dualCount },
    { count: tournCount },
    { count: wrestlerCount },
    { data: calendarRows },
    { count: weekCount },
    { count: hammerCfgCount },
  ] = await Promise.all([
    // Groups: how many schools have a district assignment for this gender + season
    db.from(`${p}_school_districts`).select('*', { count: 'exact', head: true }).eq('season_id', sid)
      .then(r => ({ count: r.count ?? 0 })),
    (gender === 'F'
      ? db.from('dual_meets_girls').select('*', { count: 'exact', head: true }).eq('season_id', sid)
      : db.from('dual_meets').select('*', { count: 'exact', head: true }).eq('season_id', sid).eq('gender', 'M')
    ).then(r => ({ count: (r as { count: number | null }).count ?? 0 })),
    db.from(gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments').select('*', { count: 'exact', head: true }).eq('season', label ?? '')
      .then(r => ({ count: r.count ?? 0 })),
    // Wrestlers: active wrestlers in the system for this gender
    db.from('wrestlers').select('*', { count: 'exact', head: true }).eq('gender', gender)
      .then(r => ({ count: r.count ?? 0 })),
    db.from('season_calendar').select('event_type').eq('season_id', sid).in('event_type', REQUIRED_CALENDAR),
    db.from('individual_ranking_weeks').select('*', { count: 'exact', head: true }).eq('season_id', sid).eq('gender', gender)
      .then(r => ({ count: r.count ?? 0 })),
    db.from('hammer_score_config').select('*', { count: 'exact', head: true }).eq('season', label ?? '').eq('gender', gender).eq('is_active', true)
      .then(r => ({ count: r.count ?? 0 })),
  ])
  const haveCalendar   = new Set((calendarRows ?? []).map(r => r.event_type as string))
  const missingCalendar = REQUIRED_CALENDAR.filter(e => !haveCalendar.has(e))

  // Fetch manual overrides for auto-check keys
  const AUTO_KEYS = ['groups', 'schedule', 'tournaments', 'wrestlers', 'calendar', 'ranking_weeks', 'hammer_config']
  const { data: overrideRows } = await db
    .from('preseason_checklist')
    .select('id, step_key, status')
    .eq('season_id', sid)
    .in('step_key', AUTO_KEYS)

  const overrideMap = Object.fromEntries(
    (overrideRows ?? []).map(r => [r.step_key, { id: r.id, status: r.status }])
  )

  const prog = gender === 'F' ? 'Girls' : 'Boys'
  const preseasonChecks = [
    { key: 'groups',      label: `${prog} district assignments configured`, autoOk: groupCount > 0,    detail: groupCount > 0 ? `${groupCount} schools assigned` : 'None found' },
    { key: 'schedule',    label: `${prog} dual meet schedule imported`,      autoOk: dualCount > 0,     detail: dualCount > 0 ? `${dualCount} dual meets scheduled` : 'No dual meets yet' },
    { key: 'tournaments', label: `${prog} tournament list registered`,       autoOk: tournCount > 0,    detail: tournCount > 0 ? `${tournCount} tournaments registered` : 'None yet' },
    { key: 'wrestlers',   label: `${prog} wrestlers in system`,              autoOk: wrestlerCount > 0, detail: wrestlerCount > 0 ? `${wrestlerCount} wrestlers` : 'No wrestlers yet' },
    { key: 'calendar',    label: `${prog} postseason & playoff dates in season calendar`, autoOk: missingCalendar.length === 0,
      detail: missingCalendar.length === 0 ? `All ${REQUIRED_CALENDAR.length} dates entered` : `Missing: ${missingCalendar.join(', ')}` },
    { key: 'ranking_weeks', label: `${prog} individual ranking weeks seeded`, autoOk: weekCount > 0, detail: weekCount > 0 ? `${weekCount} weeks` : 'No weeks for this season' },
    { key: 'hammer_config', label: `${prog} hammer score formula set for ${label}`, autoOk: hammerCfgCount > 0, detail: hammerCfgCount > 0 ? 'Active formula found' : 'No formula row for this season' },
  ].map(c => {
    const override = overrideMap[c.key]
    const overridden = override?.status === 'complete'
    return {
      ...c,
      done: c.autoOk || overridden,
      overridden,
      overrideId: override?.id ?? null,
    }
  })

  const preseasonComplete = preseasonChecks.filter(c => c.done).length
  const preseasonPct = Math.round((preseasonComplete / preseasonChecks.length) * 100)

  // ── Postseason checklist (manual) ───────────────────────────────────────
  const { data: postTeam }  = await db.from('postseason_checklist').select('status').eq('season_id', sid).eq('side', 'team')
  const { data: postIndiv } = await db.from('postseason_checklist').select('status').eq('season_id', sid).eq('side', 'individual')
  const allPost = [...(postTeam ?? []), ...(postIndiv ?? [])]
  const postComplete = allPost.filter(r => r.status === 'complete').length
  const postPct = allPost.length > 0 ? Math.round((postComplete / allPost.length) * 100) : 0

  return NextResponse.json({
    seasonId: sid,
    yearLabel: label,
    season: seasonProgress ? {
      duals:       seasonProgress.duals,
      tournaments: seasonProgress.tournaments,
      pct: Math.round((
        (seasonProgress.duals.pct + seasonProgress.tournaments.pct) / 2
      )),
    } : null,
    preseason: {
      checks: preseasonChecks,
      complete: preseasonComplete,
      total: preseasonChecks.length,
      pct: preseasonPct,
    },
    postseason: {
      complete: postComplete,
      total: allPost.length,
      pct: postPct,
      hasData: allPost.length > 0,
    },
  })
}
