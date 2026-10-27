import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { boysRosterGradeCounts, girlsRosterGradeCounts } from '@/lib/rosterGrades'
import { boysProgramSchoolIds, girlsProgramSchoolIds } from '@/lib/genderPrograms'
import { PreseasonDashboard } from './PreseasonDashboard'
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
  const [boysIds, girlsIds] = await Promise.all([
    boysProgramSchoolIds(db, preSeasonIdM),
    girlsProgramSchoolIds(db, preSeasonIdF),
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
    // Grade Reviews = schools that have completed a roster_match micro check
    fetchAllRows<{ school_id: number }>((from, to) =>
      db.from('microcheck_task_log').select('school_id').eq('gender', 'M').eq('field', 'roster_match').in('school_id', boysIds).order('id').range(from, to)),
    fetchAllRows<{ school_id: number }>((from, to) =>
      db.from('microcheck_task_log').select('school_id').eq('gender', 'F').eq('field', 'roster_match').in('school_id', girlsIds).order('id').range(from, to)),
    boysRosterGradeCounts(db, boysIds),
    girlsRosterGradeCounts(db, girlsIds),
  ])

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
      pctCompleted:    pct(count(id => coachSet.has(id) && schoolById.get(id)?.town && scheduleSet.has(id) && rosterSet.has(id)), total),
    }
  }

  return (
    <PreseasonDashboard
      seasonLabelM={seasonLabelM}
      seasonLabelF={seasonLabelF}
      statsM={buildStats(boysIds,  ids(boysCoachRows),  ids(boysEmailRows),  scheduleIds(boysScheduleRows),  ids(boysRosterRows),  ids(boysGradeReviewRows),  boysGrades)}
      statsF={buildStats(girlsIds, ids(girlsCoachRows), ids(girlsEmailRows), scheduleIds(girlsScheduleRows), ids(girlsRosterRows), ids(girlsGradeReviewRows), girlsGrades)}
      preSeasonIdM={preSeasonIdM ?? 3}
    />
  )
}
