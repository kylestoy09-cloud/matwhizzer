import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { boysRosterGradeCounts } from '@/lib/rosterGrades'
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

  const { data: schools } = await db
    .from('schools')
    .select('id, town, address, website_url, twitter_handle, facebook_url, ad_name, ad_email')
    .eq('is_nj', true)

  const schoolIds = (schools ?? []).map(s => s.id)
  const total     = schoolIds.length

  // Gender-independent stats (from schools table columns)
  const withAddress   = (schools ?? []).filter(s => s.address).length
  const withWebsite   = (schools ?? []).filter(s => s.website_url).length
  const withTwitter   = (schools ?? []).filter(s => s.twitter_handle).length
  const withFacebook  = (schools ?? []).filter(s => s.facebook_url).length
  const withAdName    = (schools ?? []).filter(s => s.ad_name).length
  const withAdEmail   = (schools ?? []).filter(s => s.ad_email).length
  const pctAddress    = pct(withAddress,  total)
  const pctWebsite    = pct(withWebsite,  total)
  const pctTwitter    = pct(withTwitter,  total)
  const pctFacebook   = pct(withFacebook, total)
  const pctAdName     = pct(withAdName,   total)
  const pctAdEmail    = pct(withAdEmail,  total)

  // Fetch all gender-specific data in parallel
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
    { data: gradeReviewRows },
  ] = await Promise.all([
    db.from('boys_coaches').select('school_id').in('school_id', schoolIds).not('name', 'is', null),
    db.from('girls_coaches').select('school_id').in('school_id', schoolIds).not('name', 'is', null),
    db.from('girls_coaches').select('school_id').in('school_id', schoolIds).eq('title', 'Athletic Director'),
    db.from('boys_coaches').select('school_id').in('school_id', schoolIds).not('email', 'is', null),
    db.from('girls_coaches').select('school_id').in('school_id', schoolIds).not('email', 'is', null),
    preSeasonIdM
      ? fetchAllRows<{ team1_school_id: number; team2_school_id: number }>((from, to) =>
          db.from('dual_meets').select('team1_school_id,team2_school_id').eq('season_id', preSeasonIdM).eq('gender', 'M').order('id').range(from, to))
      : Promise.resolve({ data: [] }),
    preSeasonIdF
      ? fetchAllRows<{ team1_school_id: number; team2_school_id: number }>((from, to) =>
          db.from('dual_meets').select('team1_school_id,team2_school_id').eq('season_id', preSeasonIdF).eq('gender', 'F').order('id').range(from, to))
      : Promise.resolve({ data: [] }),
    // wrestlers has no school_id column — rosters come from wrestler_name_aliases (active wrestlers only)
    fetchAllRows<{ school_id: number }>((from, to) =>
      db.from('wrestler_name_aliases').select('school_id, wrestlers!inner(gender, is_active)')
        .in('school_id', schoolIds).eq('wrestlers.gender', 'M').eq('wrestlers.is_active', true).order('id').range(from, to)),
    fetchAllRows<{ school_id: number }>((from, to) =>
      db.from('wrestler_name_aliases').select('school_id, wrestlers!inner(gender, is_active)')
        .in('school_id', schoolIds).eq('wrestlers.gender', 'F').eq('wrestlers.is_active', true).order('id').range(from, to)),
    // Grade % = schools that have completed a roster_match micro check / total schools
    fetchAllRows<{ school_id: number }>((from, to) =>
      db.from('microcheck_task_log').select('school_id').eq('gender', 'M').eq('field', 'roster_match').in('school_id', schoolIds).order('id').range(from, to)),
  ])

  // Grades = % of boys roster wrestlers with a grade; Grade Reviews = % of schools
  // whose roster grade review (roster_match micro check) is done
  const schoolsWithGradeReview = new Set((gradeReviewRows ?? []).map(r => r.school_id))
  const pctGradeReviews        = pct(schoolsWithGradeReview.size, total)
  const gradeCounts            = await boysRosterGradeCounts(db, schoolIds)
  const pctGrades              = pct(gradeCounts.graded, gradeCounts.roster)

  const schoolsWithBoysCoach    = new Set((boysCoachRows ?? []).map(r => r.school_id))
  const schoolsWithGirlsCoach   = new Set((girlsCoachRows ?? []).map(r => r.school_id))
  const schoolsWithAd           = new Set((adRows ?? []).map(r => r.school_id))
  const schoolsWithBoysEmail    = new Set((boysEmailRows ?? []).map(r => r.school_id))
  const schoolsWithGirlsEmail   = new Set((girlsEmailRows ?? []).map(r => r.school_id))
  const schoolsWithBoysSchedule = new Set(
    (boysScheduleRows ?? []).flatMap(r => [r.team1_school_id, r.team2_school_id]).filter(Boolean)
  )
  const schoolsWithGirlsSchedule = new Set(
    (girlsScheduleRows ?? []).flatMap(r => [r.team1_school_id, r.team2_school_id]).filter(Boolean)
  )
  const schoolsWithBoysRoster   = new Set((boysRosterRows ?? []).map(r => r.school_id))
  const schoolsWithGirlsRoster  = new Set((girlsRosterRows ?? []).map(r => r.school_id))

  function buildStats(
    coachSet: Set<number>,
    coachEmailSet: Set<number>,
    scheduleSet: Set<number>,
    rosterSet: Set<number>
  ): GenderPreseasonStats {
    const completedCount = schoolIds.filter(id =>
      coachSet.has(id) &&
      (schools ?? []).find(s => s.id === id)?.town &&
      scheduleSet.has(id) &&
      rosterSet.has(id)
    ).length
    return {
      pctCoaches:      pct(coachSet.size,      total),
      pctAds:          pct(schoolsWithAd.size, total),
      pctCoachEmail:   pct(coachEmailSet.size, total),
      pctSchedules:    pct(scheduleSet.size,   total),
      pctRosters:      pct(rosterSet.size,     total),
      pctCompleted:    pct(completedCount,      total),
    }
  }

  return (
    <PreseasonDashboard
      seasonLabelM={seasonLabelM}
      seasonLabelF={seasonLabelF}
      total={total}
      pctGrades={pctGrades}
      pctGradeReviews={pctGradeReviews}
      pctAddress={pctAddress}
      pctWebsite={pctWebsite}
      pctTwitter={pctTwitter}
      pctFacebook={pctFacebook}
      pctAdName={pctAdName}
      pctAdEmail={pctAdEmail}
      statsM={buildStats(schoolsWithBoysCoach,  schoolsWithBoysEmail,  schoolsWithBoysSchedule,  schoolsWithBoysRoster)}
      statsF={buildStats(schoolsWithGirlsCoach, schoolsWithGirlsEmail, schoolsWithGirlsSchedule, schoolsWithGirlsRoster)}
      preSeasonIdM={preSeasonIdM ?? 3}
    />
  )
}
