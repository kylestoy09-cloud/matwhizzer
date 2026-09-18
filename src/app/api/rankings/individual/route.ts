import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// GET /api/rankings/individual
// ?gender=M&week_id=1&weight_class=106&stage=district&stage_entity=5
//
// Returns published rankings + upsets for a given week/weight/scope.
// Only returns ranking data for stages that have been marked complete by admin.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const gender      = searchParams.get('gender') ?? 'M'
  const weekId      = parseInt(searchParams.get('week_id') ?? '0', 10)
  const weightClass = parseInt(searchParams.get('weight_class') ?? '0', 10)
  const stage       = searchParams.get('stage') ?? 'district'
  const stageEntity = searchParams.get('stage_entity') ?? ''

  if (!weekId || !weightClass || !stageEntity) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const db = createSupabaseAdmin()

  // ── Week info ─────────────────────────────────────────────────────────────────

  const { data: week } = await db
    .from('individual_ranking_weeks')
    .select('id, week_number, week_date, season_id')
    .eq('id', weekId)
    .single()
  if (!week) return NextResponse.json({ error: 'Week not found' }, { status: 404 })

  // ── Completion check ──────────────────────────────────────────────────────────

  const { data: completion } = await db
    .from('individual_ranking_completion')
    .select('id')
    .eq('week_id', weekId)
    .eq('gender', gender)
    .eq('weight_class', weightClass)
    .eq('stage', stage)
    .eq('stage_entity', stageEntity)
    .maybeSingle()

  if (!completion) {
    return NextResponse.json({ rankings: [], prev_rankings: [], upsets: [], is_published: false, week })
  }

  // ── Current rankings ──────────────────────────────────────────────────────────

  const { data: rankRows } = await db
    .from('individual_rankings')
    .select('wrestler_id, manual_rank, hammer_score_snapshot')
    .eq('week_id', weekId)
    .eq('gender', gender)
    .eq('weight_class', weightClass)
    .eq('stage', stage)
    .eq('stage_entity', stageEntity)
    .not('manual_rank', 'is', null)
    .order('manual_rank', { ascending: true })

  const currentRows = (rankRows ?? []) as { wrestler_id: string; manual_rank: number; hammer_score_snapshot: number }[]

  // ── Previous week rankings (for changes section) ──────────────────────────────

  let prevRows: { wrestler_id: string; manual_rank: number }[] = []
  if (week.week_number > 1) {
    const { data: prevWeek } = await db
      .from('individual_ranking_weeks')
      .select('id')
      .eq('season_id', week.season_id)
      .eq('gender', gender)
      .eq('week_number', week.week_number - 1)
      .maybeSingle()

    if (prevWeek) {
      const { data: prevComp } = await db
        .from('individual_ranking_completion')
        .select('id')
        .eq('week_id', prevWeek.id)
        .eq('gender', gender)
        .eq('weight_class', weightClass)
        .eq('stage', stage)
        .eq('stage_entity', stageEntity)
        .maybeSingle()

      if (prevComp) {
        const { data: prevRankRows } = await db
          .from('individual_rankings')
          .select('wrestler_id, manual_rank')
          .eq('week_id', prevWeek.id)
          .eq('gender', gender)
          .eq('weight_class', weightClass)
          .eq('stage', stage)
          .eq('stage_entity', stageEntity)
          .not('manual_rank', 'is', null)
          .order('manual_rank', { ascending: true })
        prevRows = (prevRankRows ?? []) as { wrestler_id: string; manual_rank: number }[]
      }
    }
  }

  // ── Wrestler names ────────────────────────────────────────────────────────────

  const allIds = [...new Set([...currentRows.map(r => r.wrestler_id), ...prevRows.map(r => r.wrestler_id)])]
  const nameMap = new Map<string, { name: string; school: string; grade: string | null }>()
  for (const ids of chunk(allIds, 100)) {
    const { data } = await db
      .from('wrestlers')
      .select('id, first_name, last_name, grade, schools(display_name)')
      .in('id', ids)
    for (const r of (data ?? []) as any[]) {
      nameMap.set(r.id, {
        name:   `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(),
        school: (r.schools as any)?.display_name ?? '',
        grade:  r.grade ?? null,
      })
    }
  }

  // ── Published upsets for this scope ──────────────────────────────────────────

  const baseUpsetQuery = db
    .from('individual_upsets')
    .select('id, winner_id, loser_id, winner_pre_hammer, loser_pre_hammer, differential, win_type, match_date, match_source, winner_district, winner_region, winner_section, loser_district, loser_region, loser_section')
    .eq('week_id', weekId)
    .eq('gender', gender)
    .eq('weight_class', weightClass)
    .eq('include_in_publish', true)
    .order('differential', { ascending: false })

  const { data: rawUpsets } = await (
    stage === 'district' ? baseUpsetQuery.eq('winner_district', parseInt(stageEntity, 10)) :
    stage === 'section'  ? baseUpsetQuery.eq('winner_section', stageEntity) :
    stage === 'region'   ? baseUpsetQuery.or(`winner_region.eq.${stageEntity},loser_region.eq.${stageEntity}`) :
    baseUpsetQuery  // state: all published upsets for this week+weight
  )

  // Bulk-fetch upset wrestler names
  const upsetWrestlerIds = new Set<string>()
  for (const u of (rawUpsets ?? [])) {
    upsetWrestlerIds.add(u.winner_id as string)
    upsetWrestlerIds.add(u.loser_id  as string)
  }
  const upsetMissingIds = [...upsetWrestlerIds].filter(id => !nameMap.has(id))
  for (const ids of chunk(upsetMissingIds, 100)) {
    const { data } = await db
      .from('wrestlers')
      .select('id, first_name, last_name, grade, schools(display_name)')
      .in('id', ids)
    for (const r of (data ?? []) as any[]) {
      nameMap.set(r.id, {
        name:   `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(),
        school: (r.schools as any)?.display_name ?? '',
        grade:  r.grade ?? null,
      })
    }
  }

  // ── Assemble response ─────────────────────────────────────────────────────────

  const rankings = currentRows.map(r => ({
    rank:                  r.manual_rank,
    wrestler_id:           r.wrestler_id,
    name:                  nameMap.get(r.wrestler_id)?.name   ?? '—',
    school:                nameMap.get(r.wrestler_id)?.school ?? '',
    grade:                 nameMap.get(r.wrestler_id)?.grade  ?? null,
    hammer_score_snapshot: r.hammer_score_snapshot,
  }))

  const prev_rankings = prevRows.map(r => ({
    wrestler_id: r.wrestler_id,
    rank:        r.manual_rank,
  }))

  const upsets = (rawUpsets ?? []).map((u: any) => {
    const winner = nameMap.get(u.winner_id)
    const loser  = nameMap.get(u.loser_id)
    return {
      id:                u.id,
      winner_id:         u.winner_id,
      winner_name:       winner?.name   ?? '—',
      winner_school:     winner?.school ?? '',
      winner_grade:      winner?.grade  ?? null,
      loser_id:          u.loser_id,
      loser_name:        loser?.name    ?? '—',
      loser_school:      loser?.school  ?? '',
      loser_grade:       loser?.grade   ?? null,
      winner_pre_hammer: u.winner_pre_hammer,
      loser_pre_hammer:  u.loser_pre_hammer,
      differential:      u.differential,
      win_type:          u.win_type,
      match_date:        u.match_date,
      same_district:     u.winner_district !== null && u.winner_district === u.loser_district,
      same_region:       u.winner_region   !== null && u.winner_region   === u.loser_region,
      same_section:      u.winner_section  !== null && u.winner_section  === u.loser_section,
    }
  })

  return NextResponse.json({ rankings, prev_rankings, upsets, is_published: true, week })
}
