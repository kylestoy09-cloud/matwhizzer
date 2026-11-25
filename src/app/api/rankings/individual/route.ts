import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { PUBLIC_CDN_HEADERS } from '@/lib/supabase/public-cached'

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
    return NextResponse.json({ rankings: [], prev_rankings: [], upsets: [], is_published: false, week }, { headers: PUBLIC_CDN_HEADERS })
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
  const nameMap = new Map<string, { name: string; school: string; school_id: number | null; school_logo: string | null; school_bg: string | null; grade: string | null }>()
  // wrestlers has no school column: a ranked wrestler's school is the one on their most recent rating
  // (the old wrestlers → schools embed failed, leaving every name '—', 2026-11-11)
  async function loadNames(ids: string[]) {
    for (const part of chunk(ids, 100)) {
      const [{ data: ws }, { data: rated }] = await Promise.all([
        db.from('wrestlers').select('id, first_name, last_name, grade').in('id', part),
        db.from('wrestler_hammer_scores').select('wrestler_id, school_id, season').in('wrestler_id', part).eq('gender', gender).order('season', { ascending: false }),
      ])
      const schoolIdOf = new Map<string, number>()
      for (const h of (rated ?? []) as any[]) if (h.school_id != null && !schoolIdOf.has(h.wrestler_id)) schoolIdOf.set(h.wrestler_id, h.school_id)
      const sids = [...new Set(schoolIdOf.values())]
      const { data: ss } = sids.length ? await db.from('schools').select('id, display_name, logo_url, header_background').in('id', sids) : { data: [] }
      const schoolById = new Map((ss ?? []).map((x: any) => [x.id as number, x]))
      const schoolOf = new Map([...schoolIdOf].map(([w, id]) => [w, schoolById.get(id)]))
      for (const r of (ws ?? []) as any[]) {
        const sc = schoolOf.get(r.id)
        nameMap.set(r.id, {
          name:   `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(),
          school: sc?.display_name ?? '',
          school_id: sc?.id ?? null,
          school_logo: sc?.logo_url ?? null,
          school_bg: sc?.header_background ?? null,
          grade:  r.grade ?? null,
        })
      }
    }
  }
  await loadNames(allIds)

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
  await loadNames(upsetMissingIds)

  // ── Assemble response ─────────────────────────────────────────────────────────

  const rankings = currentRows.map(r => ({
    rank:                  r.manual_rank,
    wrestler_id:           r.wrestler_id,
    name:                  nameMap.get(r.wrestler_id)?.name   ?? '—',
    school:                nameMap.get(r.wrestler_id)?.school ?? '',
    school_id:             nameMap.get(r.wrestler_id)?.school_id ?? null,
    school_logo:           nameMap.get(r.wrestler_id)?.school_logo ?? null,
    school_bg:             nameMap.get(r.wrestler_id)?.school_bg ?? null,
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

  return NextResponse.json({ rankings, prev_rankings, upsets, is_published: true, week }, { headers: PUBLIC_CDN_HEADERS })
}
