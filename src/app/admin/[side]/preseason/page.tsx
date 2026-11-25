import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { previousSeasonLabel, rolloverStatus, seasonTournaments } from '@/lib/tournamentSlate'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { boysRosterGradeCounts, girlsRosterGradeCounts } from '@/lib/rosterGrades'
import { boysProgramSchoolIds, girlsProgramSchoolIds } from '@/lib/genderPrograms'
import { PreseasonDashboard } from './PreseasonDashboard'
import { streamingLinks } from '@/lib/streamingLinks'
import { getNewestSeason, getRosterImportSeason, getWorkingSeason } from '@/lib/season-context'
import type { GenderPreseasonStats } from './PreseasonHeader'

export const dynamic = 'force-dynamic'

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100)
}

export default async function PreseasonPage() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()

  // Get the preseason season label per gender from season_gender_state
  const { data: sgsRows } = await db
    .from('season_gender_state')
    .select('season_id, gender')
    .eq('stage', 'preseason')
    .in('gender', ['M', 'F'])

  const preSeasonIdM = sgsRows?.find(r => r.gender === 'M')?.season_id ?? null
  const preSeasonIdF = sgsRows?.find(r => r.gender === 'F')?.season_id ?? null
  const preIds = [...new Set([preSeasonIdM, preSeasonIdF].filter(Boolean) as number[])]

  const { data: seasonLabelRows } = preIds.length
    ? await db.from('seasons').select('id, year_label').in('id', preIds)
    : { data: [] as { id: number; year_label: string }[] }

  const seasonLabelM = (seasonLabelRows ?? []).find(s => s.id === preSeasonIdM)?.year_label ?? '—'
  const seasonLabelF = (seasonLabelRows ?? []).find(s => s.id === preSeasonIdF)?.year_label ?? '—'

  // Each gender's list is that gender's NJ programs for its preseason season —
  // never every NJ school (see src/lib/genderPrograms.ts).
  // Without a preseason season yet (a gender still in its season), the working season decides
  // which programs are active — else inactive ones (co-op members) count and the % never fills.
  const [rosterSeasonM, rosterSeasonF] = await Promise.all([
    preSeasonIdM ?? getWorkingSeason('M').then(s => s.id),
    preSeasonIdF ?? getWorkingSeason('F').then(s => s.id),
  ])
  const [boysIds, girlsIds] = await Promise.all([
    boysProgramSchoolIds(db, rosterSeasonM),
    girlsProgramSchoolIds(db, rosterSeasonF),
  ])
  const schoolIds = [...new Set([...boysIds, ...girlsIds])]

  const { data: schools } = await fetchAllRows<{ id: number; town: string | null; address: string | null; website_url: string | null; twitter_handle: string | null; facebook_url: string | null; ad_name: string | null; ad_email: string | null }>(
    (from, to) => db.from('schools')
      .select('id, town, address, website_url, twitter_handle, facebook_url, ad_name, ad_email')
      .in('id', schoolIds).order('id').range(from, to))
  const schoolById = new Map((schools ?? []).map(s => [s.id, s]))

  const [
    { data: boysCoachRows },
    { data: girlsCoachRows },
    { data: adRows },           // ADs tracked in girls_coaches regardless of gender
    { data: boysEmailRows },
    { data: girlsEmailRows },
    { data: boysScheduleRows },
    { data: girlsScheduleRows },
    { data: boysRosterRows },
    { data: girlsRosterRows },
    { data: boysGradeReviewRows },
    { data: girlsGradeReviewRows },
    boysGrades,
    girlsGrades,
    { data: boysCompleteRows },
    { data: girlsCompleteRows },
    { data: boysStreamRows },
    { data: girlsStreamRows },
    { data: transferTasks },
    { data: slateRows },
  ] = await Promise.all([
    db.from('boys_coaches').select('school_id').in('school_id', boysIds).not('name', 'is', null),
    db.from('girls_coaches').select('school_id').in('school_id', girlsIds).not('name', 'is', null),
    db.from('girls_coaches').select('school_id').in('school_id', schoolIds).eq('title', 'Athletic Director'),
    db.from('boys_coaches').select('school_id').in('school_id', boysIds).not('email', 'is', null),
    db.from('girls_coaches').select('school_id').in('school_id', girlsIds).not('email', 'is', null),
    preSeasonIdM
      ? fetchAllRows<{ team1_school_id: number; team2_school_id: number }>((from, to) =>
          db.from('dual_meets').select('team1_school_id,team2_school_id').eq('season_id', preSeasonIdM).eq('gender', 'M').order('id').range(from, to))
      : Promise.resolve({ data: [] }),
    // girls duals live in their own table (dual_meets holds boys only)
    preSeasonIdF
      ? fetchAllRows<{ team1_school_id: number; team2_school_id: number }>((from, to) =>
          db.from('dual_meets_girls').select('team1_school_id,team2_school_id').eq('season_id', preSeasonIdF).order('id').range(from, to))
      : Promise.resolve({ data: [] }),
    // wrestlers has no school_id column — rosters come from wrestler_name_aliases (active wrestlers only)
    fetchAllRows<{ school_id: number }>((from, to) =>
      db.from('wrestler_name_aliases').select('school_id, wrestlers!inner(gender, is_active)')
        .in('school_id', boysIds).eq('wrestlers.gender', 'M').eq('wrestlers.is_active', true).order('id').range(from, to)),
    fetchAllRows<{ school_id: number }>((from, to) =>
      db.from('wrestler_name_aliases').select('school_id, wrestlers!inner(gender, is_active)')
        .in('school_id', girlsIds).eq('wrestlers.gender', 'F').eq('wrestlers.is_active', true).order('id').range(from, to)),
    // Grade Reviews = schools marked complete in Roster Grade Import (below) or that
    // completed a roster_match micro check
    fetchAllRows<{ school_id: number }>((from, to) =>
      db.from('microcheck_task_log').select('school_id').eq('gender', 'M').eq('field', 'roster_match').in('school_id', boysIds).order('id').range(from, to)),
    fetchAllRows<{ school_id: number }>((from, to) =>
      db.from('microcheck_task_log').select('school_id').eq('gender', 'F').eq('field', 'roster_match').in('school_id', girlsIds).order('id').range(from, to)),
    boysRosterGradeCounts(db, boysIds),
    girlsRosterGradeCounts(db, girlsIds),
    getRosterImportSeason(db, 'M').then(s => db.from('roster_grade_school_complete').select('school_id').eq('gender', 'M').eq('season_id', s.id)),
    getRosterImportSeason(db, 'F').then(s => db.from('roster_grade_school_complete').select('school_id').eq('gender', 'F').eq('season_id', s.id)),
    // streaming links: one per program, entered for the upcoming season like coaches
    // Hudl and NFHS Network counted apart (Kyle 2026-11-19)
    getNewestSeason().then(s => streamingLinks(db, 'M', s.id)).then(m => ({ data: [...m].map(([school_id, l]) => ({ school_id, hudl: !!l.hudl, nfhs: !!l.nfhs })) })),
    getNewestSeason().then(s => streamingLinks(db, 'F', s.id)).then(m => ({ data: [...m].map(([school_id, l]) => ({ school_id, hudl: !!l.hudl, nfhs: !!l.nfhs })) })),
    // Transfers: 0% or 100% from the dashboard's "Complete Transfers" task (Kyle 2026-11-11). Tasks are not
    // kept per season, so it counts when it was completed during this season's preseason (from Aug 1).
    db.from('admin_tasks').select('gender, process_key, completed_at').eq('dashboard', 'preseason').eq('process_key', 'transfers'),
    // Tournament Rollover: last season's tournaments rolled over or marked not returning (src/lib/tournamentSlate.ts)
    Promise.all((['M', 'F'] as const).map(async g => {
      const season = g === 'M' ? seasonLabelM : seasonLabelF
      if (!/^\d{4}-\d{2}$/.test(season)) return 0
      const [cur, prior] = await Promise.all([seasonTournaments(db, g, season), seasonTournaments(db, g, previousSeasonLabel(season))])
      return rolloverStatus(prior, cur).pct
    })).then(([M, F]) => ({ data: { M, F } })),
  ])
  const slatePct = (g: 'M' | 'F') => slateRows?.[g] ?? 0
  const taskDone = (gender: 'M' | 'F', seasonId: number, processKey: string) =>
    (transferTasks ?? []).some(t => t.gender === gender && t.process_key === processKey && t.completed_at && t.completed_at >= `${seasonId - 1}-08-01`) ? 100 : 0

  const ids = (rows: { school_id: number }[] | null) => new Set((rows ?? []).map(r => r.school_id))
  const scheduleIds = (rows: { team1_school_id: number; team2_school_id: number }[] | null) =>
    new Set((rows ?? []).flatMap(r => [r.team1_school_id, r.team2_school_id]).filter(Boolean))
  const schoolsWithAd = ids(adRows)

  function buildStats(
    programIds: number[],
    coachSet: Set<number>,
    coachEmailSet: Set<number>,
    scheduleSet: Set<number>,
    rosterSet: Set<number>,
    gradeReviewSet: Set<number>,
    grades: { roster: number; graded: number },
    streams: { school_id: number; hudl: boolean; nfhs: boolean }[],
    pctTransfers: number,
    pctTournamentRollover: number,
  ): GenderPreseasonStats {
    const total = programIds.length
    const count = (f: (id: number) => unknown) => programIds.filter(id => f(id)).length
    const field = (k: 'address' | 'website_url' | 'twitter_handle' | 'facebook_url' | 'ad_name' | 'ad_email') =>
      pct(count(id => schoolById.get(id)?.[k]), total)
    return {
      total,
      pctGrades:       pct(grades.graded, grades.roster),
      pctGradeReviews: pct(count(id => gradeReviewSet.has(id)), total),
      pctAddress:      field('address'),
      pctWebsite:      field('website_url'),
      pctTwitter:      field('twitter_handle'),
      pctFacebook:     field('facebook_url'),
      pctAdName:       field('ad_name'),
      pctAdEmail:      field('ad_email'),
      pctCoaches:      pct(count(id => coachSet.has(id)),      total),
      pctAds:          pct(count(id => schoolsWithAd.has(id)), total),
      pctCoachEmail:   pct(count(id => coachEmailSet.has(id)), total),
      pctSchedules:    pct(count(id => scheduleSet.has(id)),   total),
      pctRosters:      pct(count(id => rosterSet.has(id)),     total),
      pctHudl:         pct(count(id => streams.some(x => x.school_id === id && x.hudl)), total),
      pctNfhs:         pct(count(id => streams.some(x => x.school_id === id && x.nfhs)), total),
      pctTransfers,
      pctTournamentRollover,
    }
  }

  return (
    <PreseasonDashboard
      seasonLabelM={seasonLabelM}
      seasonLabelF={seasonLabelF}
      statsM={buildStats(boysIds,  ids(boysCoachRows),  ids(boysEmailRows),  scheduleIds(boysScheduleRows),  ids(boysRosterRows),  ids([...(boysGradeReviewRows ?? []), ...(boysCompleteRows ?? [])]),  boysGrades,  boysStreamRows ?? [],  taskDone('M', rosterSeasonM, 'transfers'), slatePct('M'))}
      statsF={buildStats(girlsIds, ids(girlsCoachRows), ids(girlsEmailRows), scheduleIds(girlsScheduleRows), ids(girlsRosterRows), ids([...(girlsGradeReviewRows ?? []), ...(girlsCompleteRows ?? [])]), girlsGrades, girlsStreamRows ?? [], taskDone('F', rosterSeasonF, 'transfers'), slatePct('F'))}
      directorySeasonM={rosterSeasonM}
      directorySeasonF={rosterSeasonF}
      coachSeasonId={(await getNewestSeason()).id}
    />
  )
}
