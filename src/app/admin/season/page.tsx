import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { SeasonDashboard } from './SeasonDashboard'
import type { GenderSeasonData } from './SeasonHeader'

export const dynamic = 'force-dynamic'

type CountsRow = { tournament_id: string; bout_count: number; participant_count: number }

const ZERO = Promise.resolve({ count: 0 })

export default async function SeasonPage() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) redirect('/admin/login')

  const db    = createSupabaseAdmin()
  const today = new Date().toISOString().slice(0, 10)

  // ── Round 1: live season IDs ───────────────────────────────────────────────
  const { data: sgsRows } = await db
    .from('season_gender_state')
    .select('season_id, gender')
    .eq('is_public_default', true)
    .in('gender', ['M', 'F'])

  const seasonIdM = sgsRows?.find(r => r.gender === 'M')?.season_id ?? null
  const seasonIdF = sgsRows?.find(r => r.gender === 'F')?.season_id ?? null
  const allSeasonIds = [...new Set([seasonIdM, seasonIdF].filter(Boolean))] as number[]

  // ── Round 2: season labels + counts (all server-side, no row cap) ──────────
  const [
    { data: seasonRows },
    { count: schoolCount },
    { count: wrestlerCountM },
    { count: wrestlerCountF },
    // Boys dual counts
    { count: dualTotalM },
    { count: dualDoneM },
    { count: dualTodayM },
    { count: dualUpcomingM },
    // Girls dual counts
    { count: dualTotalF },
    { count: dualDoneF },
    { count: dualTodayF },
    { count: dualUpcomingF },
  ] = await Promise.all([
    db.from('seasons').select('id, year_label').in('id', allSeasonIds.length ? allSeasonIds : [0]),
    db.from('schools').select('*', { count: 'exact', head: true }).eq('is_nj', true),
    db.from('wrestlers').select('*', { count: 'exact', head: true }).eq('gender', 'M').eq('is_oos', false),
    db.from('wrestlers').select('*', { count: 'exact', head: true }).eq('gender', 'F').eq('is_oos', false),
    // Boys duals
    seasonIdM ? db.from('dual_meets').select('*', { count: 'exact', head: true }).eq('gender', 'M').eq('season_id', seasonIdM) : ZERO,
    seasonIdM ? db.from('dual_meets').select('*', { count: 'exact', head: true }).eq('gender', 'M').eq('season_id', seasonIdM).not('team1_score', 'is', null) : ZERO,
    seasonIdM ? db.from('dual_meets').select('*', { count: 'exact', head: true }).eq('gender', 'M').eq('season_id', seasonIdM).eq('meet_date', today) : ZERO,
    seasonIdM ? db.from('dual_meets').select('*', { count: 'exact', head: true }).eq('gender', 'M').eq('season_id', seasonIdM).gt('meet_date', today).is('team1_score', null) : ZERO,
    // Girls duals
    seasonIdF ? db.from('dual_meets_girls').select('*', { count: 'exact', head: true }).eq('season_id', seasonIdF) : ZERO,
    seasonIdF ? db.from('dual_meets_girls').select('*', { count: 'exact', head: true }).eq('season_id', seasonIdF).eq('is_complete', true) : ZERO,
    seasonIdF ? db.from('dual_meets_girls').select('*', { count: 'exact', head: true }).eq('season_id', seasonIdF).eq('meet_date', today) : ZERO,
    seasonIdF ? db.from('dual_meets_girls').select('*', { count: 'exact', head: true }).eq('season_id', seasonIdF).gt('meet_date', today).eq('is_complete', false) : ZERO,
  ])

  const findLabel = (id: number | null) =>
    (seasonRows as { id: number; year_label: string }[] | null)?.find(r => r.id === id)?.year_label ?? ''
  const seasonLabelM = findLabel(seasonIdM)
  const seasonLabelF = findLabel(seasonIdF)

  // ── Round 3: tournament rows by season label ───────────────────────────────
  const [{ data: tournsM_raw }, { data: tournsF_raw }] = await Promise.all([
    seasonLabelM
      ? db.from('in_season_tournaments').select('id').eq('season', seasonLabelM)
      : Promise.resolve({ data: [] as { id: string }[] }),
    seasonLabelF
      ? db.from('in_season_tournaments_girls').select('id').eq('season', seasonLabelF)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ])

  const tourneyIdsM = (tournsM_raw ?? []).map(t => t.id)
  const tourneyIdsF = (tournsF_raw ?? []).map(t => t.id)

  // ── Round 4: tournament bout counts via RPC (avoids 1000-row cap) ─────────
  const [countsM_res, countsF_res] = await Promise.all([
    tourneyIdsM.length > 0
      ? db.rpc('tournament_hub_counts', { p_tournament_ids: tourneyIdsM, p_gender: 'M' })
      : Promise.resolve({ data: [] as CountsRow[] }),
    tourneyIdsF.length > 0
      ? db.rpc('tournament_hub_counts', { p_tournament_ids: tourneyIdsF, p_gender: 'F' })
      : Promise.resolve({ data: [] as CountsRow[] }),
  ])

  const completedM = ((countsM_res.data ?? []) as CountsRow[]).filter(r => r.bout_count > 0)
  const completedF = ((countsF_res.data ?? []) as CountsRow[]).filter(r => r.bout_count > 0)

  // Upcoming tournaments: not completed AND start_date > today
  // We only have IDs from the tournament tables; get start_dates for "today" and "upcoming" counts
  // These are small sets, so no cap concern
  const completedSetM = new Set(completedM.map(r => r.tournament_id))
  const completedSetF = new Set(completedF.map(r => r.tournament_id))

  const [{ data: tournDatesM_raw }, { data: tournDatesF_raw }] = await Promise.all([
    tourneyIdsM.length > 0
      ? db.from('in_season_tournaments').select('id, start_date').in('id', tourneyIdsM)
      : Promise.resolve({ data: [] as { id: string; start_date: string | null }[] }),
    tourneyIdsF.length > 0
      ? db.from('in_season_tournaments_girls').select('id, start_date').in('id', tourneyIdsF)
      : Promise.resolve({ data: [] as { id: string; start_date: string | null }[] }),
  ])

  const tournDatesM = (tournDatesM_raw ?? []) as { id: string; start_date: string | null }[]
  const tournDatesF = (tournDatesF_raw ?? []) as { id: string; start_date: string | null }[]

  const tournTotalM   = tourneyIdsM.length
  const tournTotalF   = tourneyIdsF.length
  const tournDoneM    = completedSetM.size
  const tournDoneF    = completedSetF.size
  const tournTodayM   = tournDatesM.filter(t => t.start_date === today).length
  const tournTodayF   = tournDatesF.filter(t => t.start_date === today).length
  const tournUpcomingM = tournDatesM.filter(t => !completedSetM.has(t.id) && (t.start_date ?? '') > today).length
  const tournUpcomingF = tournDatesF.filter(t => !completedSetF.has(t.id) && (t.start_date ?? '') > today).length

  const dataM: GenderSeasonData = {
    wrestlerCount: wrestlerCountM ?? 0,
    completed: [
      { label: 'Duals',       done: dualDoneM    ?? 0, total: dualTotalM    ?? 0 },
      { label: 'Tournaments', done: tournDoneM,         total: tournTotalM         },
    ],
    today: [
      { label: 'Duals',       done: dualTodayM   ?? 0, total: dualTotalM    ?? 0 },
      { label: 'Tournaments', done: tournTodayM,        total: tournTotalM         },
    ],
    upcoming: [
      { label: 'Duals',       done: dualUpcomingM ?? 0, total: dualTotalM   ?? 0 },
      { label: 'Tournaments', done: tournUpcomingM,      total: tournTotalM        },
    ],
  }

  const dataF: GenderSeasonData = {
    wrestlerCount: wrestlerCountF ?? 0,
    completed: [
      { label: 'Duals',       done: dualDoneF    ?? 0, total: dualTotalF    ?? 0 },
      { label: 'Tournaments', done: tournDoneF,         total: tournTotalF         },
    ],
    today: [
      { label: 'Duals',       done: dualTodayF   ?? 0, total: dualTotalF    ?? 0 },
      { label: 'Tournaments', done: tournTodayF,        total: tournTotalF         },
    ],
    upcoming: [
      { label: 'Duals',       done: dualUpcomingF ?? 0, total: dualTotalF   ?? 0 },
      { label: 'Tournaments', done: tournUpcomingF,      total: tournTotalF        },
    ],
  }

  return (
    <SeasonDashboard
      seasonLabel={seasonLabelM || seasonLabelF || 'Current Season'}
      schoolCount={schoolCount ?? 0}
      dataM={dataM}
      dataF={dataF}
    />
  )
}
