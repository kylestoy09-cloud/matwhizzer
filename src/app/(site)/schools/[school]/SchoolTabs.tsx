'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StatsTable } from '@/components/StatsTable'
import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { useSeasons } from '@/components/SeasonsProvider'

type WrestlerRow = {
  wrestler_id: string
  wrestler_name: string
  primary_weight: number
  districts_placement: string | null
  districts_short: string | null
  regions_placement: string | null
  regions_short: string | null
  state_placement: string | null
}

type BreakdownRow = { tournament_type: string; total_points: number; win_count: number }

type LeaderRow = {
  wrestler_id: string; wrestler_name: string; primary_weight: number
  win_count: number; fall_count: number; fastest_fall_sec: number | null
  bonus_pct: number; district_points: number; region_points: number
  state_points: number; total_points: number
}

type DualMeet = {
  id: string
  team1_school_id: number
  team2_school_id: number
  meet_date: string
  team1_score: number | null
  team2_score: number | null
  status: string
  team1: { display_name: string; is_nj: boolean } | null
  team2: { display_name: string; is_nj: boolean } | null
  // Girls only (dual_meets_girls). Absent for boys, which always count.
  meet_kind?: 'dual' | 'partial' | 'jamboree'
  counts_toward_record?: boolean
}

// Meets with counts_toward_record = false (jamboree pairings, and any partial
// meet switched off) keep their bouts but never move a school's team W-L or
// per-dual averages.
const countsForRecord = (m: { counts_toward_record?: boolean }) => m.counts_toward_record !== false

type TournamentEvent = {
  id: string
  name: string
  start_date: string
  end_date: string | null
}

type MeetMatch = {
  id: string
  weight_class: number
  result_type: string | null
  result_detail: string | null
  fall_time_seconds: number | null
  is_double_forfeit: boolean
  is_forfeit_win: boolean
  winner_id: string | null
  wrestler_a_id: string | null
  wrestler_b_id: string | null
  school_a_id: number | null
  school_b_id: number | null
  wrestler_a_name_raw: string | null
  wrestler_b_name_raw: string | null
}

type TourBout = {
  id: string
  weight_class: number
  round: string
  winner: 1 | 2 | null
  result_type: string | null
  fall_time_seconds: number | null
  winner_score: number | null
  loser_score: number | null
  wrestler1_name_raw: string
  wrestler2_name_raw: string
  wrestler1_school_id: number | null
  wrestler2_school_id: number | null
}

type SeasonStat = {
  wrestlerName: string
  weight: number
  wins: number
  losses: number
  pins: number
  pinTimeSecs: number
  techs: number
  techTimeSecs: number
  mds: number
  teamPts: number
  hammer: number | null
}

function BestFinish({ w }: { w: WrestlerRow }) {
  if (w.state_placement)    return <PlaceBadge placement={w.state_placement}    short="State" />
  if (w.regions_placement)  return <PlaceBadge placement={w.regions_placement}  short={w.regions_short ?? 'Reg'} />
  if (w.districts_placement) return <PlaceBadge placement={w.districts_placement} short={w.districts_short ?? 'Dist'} />
  return <span className="text-slate-300 text-xs">—</span>
}

function placeBadgeClass(p: string | null): string {
  switch (p) {
    case '1st': return 'bg-amber-100 text-amber-800'
    case '2nd': return 'bg-slate-200 text-slate-700'
    case '3rd': return 'bg-orange-100 text-orange-800'
    case '4th': case '5th': case '6th': return 'bg-emerald-50 text-emerald-700'
    default: return 'bg-slate-50 text-slate-500'
  }
}

function PlaceBadge({ placement, short }: { placement: string | null; short?: string | null }) {
  if (!placement) return <span className="text-slate-300 text-xs">—</span>
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${placeBadgeClass(placement)}`}>{placement}</span>
      {short && <span className="text-slate-400 text-xs">{short}</span>}
    </span>
  )
}

function StatChip({ label, value, rank }: { label: string; value: string | null; rank?: number | null }) {
  return (
    <div className="bg-white px-2 py-3 text-center min-w-0">
      {value !== null ? (
        <div className="text-lg font-bold tabular-nums text-slate-900 leading-tight">{value}</div>
      ) : (
        <div className="h-6 w-12 bg-slate-100 animate-pulse rounded mx-auto" />
      )}
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5 leading-tight">{label}</div>
      {rank != null && rank <= 100 ? (
        <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">#{rank} State</div>
      ) : (
        <div className="h-3 mt-0.5" />
      )}
    </div>
  )
}

function fmtTime(secs: number): string {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

function fmtBoutResult(rt: string | null, fallSecs: number | null, winScore: number | null, loseScore: number | null, detail?: string | null): string {
  const t = (rt ?? '').toUpperCase()
  const scoreStr = winScore !== null && loseScore !== null ? `${winScore}-${loseScore}` : (detail ?? null)
  if (t === 'FALL') return fallSecs ? `Fall ${fmtTime(fallSecs)}` : 'Fall'
  if (t === 'TF')   return [scoreStr ? `TF ${scoreStr}` : 'TF', fallSecs ? fmtTime(fallSecs) : ''].filter(Boolean).join(', ')
  if (t === 'MD')   return scoreStr ? `MD ${scoreStr}` : 'MD'
  if (t === 'DEC')  return scoreStr ? `Dec ${scoreStr}` : 'Dec'
  if (t === 'DFF')  return 'DFF'
  if (t === 'FFT' || t === 'FORFEIT') return 'FFT'
  return rt ?? '—'
}

function meetMatchPoints(m: MeetMatch, weAreA: boolean): { our: number; their: number } {
  if (m.is_double_forfeit) return { our: 0, their: 0 }
  const rt = (m.result_type ?? '').toLowerCase()
  const pts = m.is_forfeit_win ? 6
    : rt === 'fall' || rt === 'f' || rt === 'fft' || rt === 'forfeit' ? 6
    : rt === 'tf' ? 5
    : rt === 'md' || rt.startsWith('major') ? 4
    : 3
  const aWins = m.winner_id !== null && m.winner_id === m.wrestler_a_id
  const weWon = weAreA ? aWins : !aWins && m.winner_id !== null
  return weWon ? { our: pts, their: 0 } : { our: 0, their: pts }
}

function roundLabel(r: string): string {
  const map: Record<string, string> = {
    F: 'Final', SF: 'Semis', QF: 'Quarters',
    R1: 'Rd 1', R2: 'Rd 2', R3: 'Rd 3', R4: 'Rd 4',
    '3rd_Place': '3rd Place', '5th_Place': '5th Place', '7th_Place': '7th Place',
    CF: 'Cons. Final', CSF: 'Cons. Semis', CQF: 'Cons. Quarters',
  }
  return map[r] ?? r
}

const TABS = [
  { id: 'schedule',   label: 'Schedule'   },
  { id: 'roster',     label: 'Roster'     },
  { id: 'leaders',    label: 'Leaders'    },
  { id: 'postseason', label: 'Post Season' },
]

type TeamScoreData = { district_points: number; region_points: number; state_points: number; total_points: number } | null

type SchoolData = {
  display_name: string
  primary_color: string | null
  secondary_color: string | null
  logo_url: string | null
}

export function SchoolTabs({
  school, gender, activeTab, primaryColor,
  schoolData,
  wrestlers, breakdown, leaders, teamScore,
  totalPts, totalWins, stateMedalists, tourneyLabel,
  activeSeason: activeSeason,
  basePath,
}: {
  school: string; gender: string; activeTab: string; primaryColor: string
  schoolData: SchoolData
  wrestlers: WrestlerRow[]; breakdown: BreakdownRow[]; leaders: LeaderRow[]
  teamScore: TeamScoreData
  totalPts: number; totalWins: number; stateMedalists: number
  tourneyLabel: Record<string, string>
  activeSeason: number
  basePath?: string
}) {
  const { label: seasonLabelOf } = useSeasons()
  const router = useRouter()
  const resolvedBase = basePath ?? `/schools/${school}`

  function tabUrl(tabId: string) {
    const params = new URLSearchParams()
    if (tabId !== 'schedule') params.set('tab', tabId)
    const qs = params.toString()
    return `${resolvedBase}${qs ? `?${qs}` : ''}`
  }

  const stateChamps    = wrestlers.filter(r => r.state_placement === '1st').sort((a, b) => a.primary_weight - b.primary_weight)
  const regionChamps   = wrestlers.filter(r => r.regions_placement === '1st').sort((a, b) => a.primary_weight - b.primary_weight)
  const districtChamps = wrestlers.filter(r => r.districts_placement === '1st').sort((a, b) => a.primary_weight - b.primary_weight)

  const byWeight = new Map<number, WrestlerRow[]>()
  for (const w of wrestlers) {
    const wt = w.primary_weight ?? 0
    if (!byWeight.has(wt)) byWeight.set(wt, [])
    byWeight.get(wt)!.push(w)
  }
  const weights = [...byWeight.keys()].sort((a, b) => a - b)

  // ── Schedule tab state ──────────────────────────────────────────────────────
  const schoolIdNum = parseInt(school, 10)
  const genderCode  = gender === 'girls' ? 'F' : 'M'
  const dualTable  = genderCode === 'F' ? 'dual_meets_girls'             : 'dual_meets'
  const matchTable = genderCode === 'F' ? 'dual_meet_matches_girls'      : 'dual_meet_matches'
  const boutTable  = genderCode === 'F' ? 'tournament_bouts_girls'       : 'tournament_bouts'
  const istTable   = genderCode === 'F' ? 'in_season_tournaments_girls'  : 'in_season_tournaments'
  const recordCols = genderCode === 'F' ? ', meet_kind, counts_toward_record' : ''
  const [meets,          setMeets]          = useState<DualMeet[]>([])
  const [tourEvents,     setTourEvents]     = useState<TournamentEvent[]>([])
  const [tourPlaces,     setTourPlaces]     = useState<Map<string, number>>(new Map())
  const [meetsLoading,   setMeetsLoading]   = useState(false)

  // ── Expandable row state ────────────────────────────────────────────────────
  const [expandedId,     setExpandedId]     = useState<string | null>(null)
  const [expandLoading,  setExpandLoading]  = useState(false)
  const [meetMatchCache, setMeetMatchCache] = useState<Map<string, MeetMatch[]>>(new Map())
  const [tourBoutCache,  setTourBoutCache]  = useState<Map<string, TourBout[]>>(new Map())
  const [tourWeightSel,  setTourWeightSel]  = useState<Map<string, number>>(new Map())

  // ── Roster tab state ────────────────────────────────────────────────────────
  const [rosterRecords, setRosterRecords] = useState<Map<string, { wins: number; losses: number }>>(new Map())
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterLoaded,  setRosterLoaded]  = useState(false)

  // ── Leaders tab state ────────────────────────────────────────────────────────
  const [leadersSubTab,  setLeadersSubTab]  = useState<'season' | 'postseason'>('season')
  const [seasonStatsMap, setSeasonStatsMap] = useState<Map<string, SeasonStat>>(new Map())
  const [seasonLoading,  setSeasonLoading]  = useState(false)
  const [seasonLoaded,   setSeasonLoaded]   = useState(false)
  const [seasonSort,     setSeasonSort]     = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'wins', dir: 'desc' })
  const [psSubTab,         setPsSubTab]         = useState<'individual' | 'team'>('individual')
  const [psSort,           setPsSort]           = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'total', dir: 'desc' })
  const [postseasonSubTab, setPostseasonSubTab] = useState<'individual' | 'team'>('individual')

  // ── Stats board — dual meet team record + pts/dual + bonus stat state rankings
  type DualStats = {
    teamWins: number; teamLosses: number; totalPts: number; meets: number
    ptsDualRank:   number | null
    pinsRank:      number | null
    techsRank:     number | null
    bonusPctRank:  number | null
  }
  const [dualStats, setDualStats] = useState<DualStats | null>(null)

  async function toggleExpand(id: string, kind: 'meet' | 'tournament') {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (kind === 'meet' && !meetMatchCache.has(id)) {
      setExpandLoading(true)
      const { data } = await (supabase as any)
        .from(matchTable)
        .select('id, weight_class, result_type, result_detail, fall_time_seconds, is_double_forfeit, is_forfeit_win, winner_id, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id, wrestler_a_name_raw, wrestler_b_name_raw')
        .eq('dual_meet_id', id)
        .order('order_index', { ascending: true })
      setMeetMatchCache(prev => new Map(prev).set(id, (data ?? []) as MeetMatch[]))
      setExpandLoading(false)
    } else if (kind === 'tournament' && !tourBoutCache.has(id)) {
      setExpandLoading(true)
      const { data } = await supabase
        .from(boutTable)
        .select('id, weight_class, round, winner, result_type, fall_time_seconds, winner_score, loser_score, wrestler1_name_raw, wrestler2_name_raw, wrestler1_school_id, wrestler2_school_id')
        .eq('in_season_tournament_id', id)
        .or(`wrestler1_school_id.eq.${schoolIdNum},wrestler2_school_id.eq.${schoolIdNum}`)
        .order('weight_class').order('round')
      const bouts = (data ?? []) as TourBout[]
      setTourBoutCache(prev => new Map(prev).set(id, bouts))
      const firstWt = bouts[0]?.weight_class ?? null
      if (firstWt) setTourWeightSel(prev => new Map(prev).set(id, firstWt))
      setExpandLoading(false)
    }
  }

  // Sticky tab bar — pins below the sticky school logo bar (measured via data-school-bar)
  const [tabStickyTop, setTabStickyTop] = useState(219) // 139 nav + ~80 logo bar
  useEffect(() => {
    const bar = document.querySelector('[data-school-bar]')
    if (!bar) return
    const compute = () => setTabStickyTop(139 + (bar as HTMLElement).offsetHeight)
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(bar)
    return () => ro.disconnect()
  }, [])

  // Loads on mount: all meets for this season to derive team W-L, pts/dual, and state ranks
  useEffect(() => {
    if (dualStats) return
    let cancelled = false
    ;(async () => {
      type MeetRow = { team1_school_id: number; team2_school_id: number; team1_score: number | null; team2_score: number | null; counts_toward_record?: boolean }
      const base = { season_id: activeSeason, gender: genderCode }

      const [schoolMeetsRes, allMeetsRes, bonusRes] = await Promise.all([
        // School-specific query — always complete regardless of season size
        (supabase as any)
          .from(dualTable)
          .select(`team1_school_id, team2_school_id, team1_score, team2_score${recordCols}`)
          .eq('season_id', base.season_id)
          .or(`team1_school_id.eq.${schoolIdNum},team2_school_id.eq.${schoolIdNum}`),
        // All-schools query for pts/dual ranking — paged, the API caps each request at 1,000 rows
        fetchAllRows<MeetRow>((from, to) => (supabase as any)
          .from(dualTable)
          .select(`team1_school_id, team2_school_id, team1_score, team2_score${recordCols}`)
          .eq('season_id', base.season_id)
          .order('id')
          .range(from, to)),
        supabase.rpc('dual_meet_bonus_ranks', {
          p_school_id:    schoolIdNum,
          p_season_id:    activeSeason,
          p_gender:       genderCode,
          p_season_label: seasonLabelOf(activeSeason) ?? '',
        }),
      ])
      if (cancelled) return

      // W-L from school-specific rows (complete)
      let teamWins = 0, teamLosses = 0
      for (const m of (schoolMeetsRes.data ?? []) as MeetRow[]) {
        const s1 = m.team1_score; const s2 = m.team2_score
        if (s1 === null || s2 === null || !countsForRecord(m)) continue
        const mine   = m.team1_school_id === schoolIdNum ? s1 : s2
        const theirs = m.team1_school_id === schoolIdNum ? s2 : s1
        if (mine > theirs) teamWins++
        else if (mine < theirs) teamLosses++
      }

      // Per-school pts/meets aggregation for ranking (uses all-schools rows)
      const agg = new Map<number, { pts: number; meets: number }>()
      const touch = (sid: number) => { if (!agg.has(sid)) agg.set(sid, { pts: 0, meets: 0 }) }
      for (const m of (allMeetsRes.data ?? []) as MeetRow[]) {
        const s1 = m.team1_score; const s2 = m.team2_score
        if (s1 === null || s2 === null || !countsForRecord(m)) continue
        touch(m.team1_school_id); touch(m.team2_school_id)
        agg.get(m.team1_school_id)!.pts += s1; agg.get(m.team1_school_id)!.meets++
        agg.get(m.team2_school_id)!.pts += s2; agg.get(m.team2_school_id)!.meets++
      }

      const myAgg = agg.get(schoolIdNum)
      const myAvg = myAgg && myAgg.meets > 0 ? myAgg.pts / myAgg.meets : 0
      const allAvgs = [...agg.values()].map(s => s.meets > 0 ? s.pts / s.meets : 0)
      const ptsDualRank = myAvg > 0 ? allAvgs.filter(a => a > myAvg).length + 1 : null

      const br = (bonusRes.data as { pins_rank: number | null; techs_rank: number | null; bonus_pct_rank: number | null }[] | null)?.[0] ?? null

      if (!cancelled) setDualStats({
        teamWins, teamLosses,
        totalPts: myAgg?.pts ?? 0,
        meets:    myAgg?.meets ?? 0,
        ptsDualRank,
        pinsRank:     br?.pins_rank     ?? null,
        techsRank:    br?.techs_rank    ?? null,
        bonusPctRank: br?.bonus_pct_rank ?? null,
      })
    })()
    return () => { cancelled = true }
  }, [dualStats, schoolIdNum, activeSeason, genderCode])

  useEffect(() => {
    if (activeTab !== 'schedule') return
    let cancelled = false
    setMeetsLoading(true)
    ;(async () => {
      const [meetsRes, boutsRes] = await Promise.all([
        (supabase as any)
          .from(dualTable)
          .select(`
            id, team1_school_id, team2_school_id, meet_date,
            team1_score, team2_score, status${recordCols},
            team1:schools!team1_school_id(display_name, is_nj),
            team2:schools!team2_school_id(display_name, is_nj)
          `)
          .or(`team1_school_id.eq.${schoolIdNum},team2_school_id.eq.${schoolIdNum}`)
          .eq('season_id', activeSeason)
          .order('meet_date', { ascending: true }),
        supabase
          .from(boutTable)
          .select('in_season_tournament_id')
          .or(`wrestler1_school_id.eq.${schoolIdNum},wrestler2_school_id.eq.${schoolIdNum}`),
      ])

      if (cancelled) return
      if (!meetsRes.error) setMeets((meetsRes.data ?? []) as unknown as DualMeet[])

      const tidSet = new Set(
        (boutsRes.data ?? []).map((b: { in_season_tournament_id: string }) => b.in_season_tournament_id),
      )
      if (tidSet.size > 0) {
        const seasonLabel = seasonLabelOf(activeSeason) ?? ''
        const { data: tours } = await supabase
          .from(istTable)
          .select('id, name, start_date, end_date')
          .in('id', [...tidSet])
          .eq('season', seasonLabel)
        if (!cancelled) setTourEvents((tours ?? []) as TournamentEvent[])

        // Fetch school's place in each tournament
        const { data: placeData } = await supabase
          .from('in_season_tournament_team_scores')
          .select('tournament_id, place')
          .in('tournament_id', [...tidSet])
          .eq('school_id', schoolIdNum)
        if (!cancelled) {
          const pm = new Map<string, number>()
          for (const p of (placeData ?? []) as { tournament_id: string; place: number }[]) {
            pm.set(p.tournament_id, p.place)
          }
          setTourPlaces(pm)
        }
      } else {
        if (!cancelled) setTourEvents([])
        if (!cancelled) setTourPlaces(new Map())
      }

      if (!cancelled) setMeetsLoading(false)
    })()
    return () => { cancelled = true }
  }, [activeTab, activeSeason, schoolIdNum, genderCode])

  // ── Roster records (W-L) — lazy-load on first roster tab visit ─────────────
  useEffect(() => {
    if (activeTab !== 'roster' || rosterLoaded || wrestlers.length === 0) return
    let cancelled = false
    setRosterLoading(true)
    ;(async () => {
      const seasonStr = seasonLabelOf(activeSeason) ?? ''

      // Dual meet IDs for this school in the selected season
      const { data: meetData } = await (supabase as any)
        .from(dualTable)
        .select('id')
        .or(`team1_school_id.eq.${schoolIdNum},team2_school_id.eq.${schoolIdNum}`)
        .eq('season_id', activeSeason)
      const dualMeetIds = (meetData ?? []).map((m: { id: string }) => m.id)

      // In-season tournament IDs for this school in the selected season
      const { data: boutTourData } = await supabase
        .from(boutTable)
        .select('in_season_tournament_id')
        .or(`wrestler1_school_id.eq.${schoolIdNum},wrestler2_school_id.eq.${schoolIdNum}`)
      const allTourIds = [...new Set((boutTourData ?? []).map((b: { in_season_tournament_id: string }) => b.in_season_tournament_id))]
      let curTourIds: string[] = []
      if (allTourIds.length > 0) {
        const { data: tours } = await supabase
          .from(istTable).select('id').in('id', allTourIds).eq('season', seasonStr)
        curTourIds = (tours ?? []).map((t: { id: string }) => t.id)
      }

      // Postseason tournament entry IDs for this school in the selected season
      const { data: psTourData } = await supabase
        .from('tournaments').select('id')
        .eq('season_id', activeSeason).eq('gender', genderCode)
      const psTourIds = (psTourData ?? []).map((t: { id: string }) => t.id)
      const entryToWrestler = new Map<string, string>()
      if (psTourIds.length > 0) {
        const { data: psEntries } = await supabase
          .from('tournament_entries').select('id, wrestler_id')
          .eq('school_id', schoolIdNum).in('tournament_id', psTourIds)
        for (const e of (psEntries ?? []) as { id: string; wrestler_id: string }[]) {
          entryToWrestler.set(e.id, e.wrestler_id)
        }
      }
      const entryIds = [...entryToWrestler.keys()]

      const [dualRes, tourRes, psRes] = await Promise.all([
        dualMeetIds.length > 0
          ? (supabase as any).from(matchTable)
              .select('wrestler_a_id, wrestler_b_id, winner_id, is_double_forfeit')
              .in('dual_meet_id', dualMeetIds)
          : Promise.resolve({ data: [] as { wrestler_a_id: string | null; wrestler_b_id: string | null; winner_id: string | null; is_double_forfeit: boolean }[] }),
        curTourIds.length > 0
          ? supabase.from(boutTable)
              .select('wrestler1_id, wrestler2_id, winner')
              .in('in_season_tournament_id', curTourIds)
              .or(`wrestler1_school_id.eq.${schoolIdNum},wrestler2_school_id.eq.${schoolIdNum}`)
          : Promise.resolve({ data: [] as { wrestler1_id: string | null; wrestler2_id: string | null; winner: number | null }[] }),
        entryIds.length > 0
          ? supabase.from('matches')
              .select('winner_entry_id, loser_entry_id')
              .or(`winner_entry_id.in.(${entryIds.join(',')}),loser_entry_id.in.(${entryIds.join(',')})`)
              .eq('validated', true)
              .neq('win_type', 'BYE')
          : Promise.resolve({ data: [] as { winner_entry_id: string | null; loser_entry_id: string | null }[] }),
      ])

      if (cancelled) return

      const records = new Map<string, { wins: number; losses: number }>()
      const touch = (id: string) => { if (!records.has(id)) records.set(id, { wins: 0, losses: 0 }) }

      for (const m of (dualRes.data ?? [])) {
        if (m.is_double_forfeit) continue
        if (m.wrestler_a_id && m.winner_id !== null) {
          touch(m.wrestler_a_id)
          if (m.winner_id === m.wrestler_a_id) records.get(m.wrestler_a_id)!.wins++
          else records.get(m.wrestler_a_id)!.losses++
        }
        if (m.wrestler_b_id && m.winner_id !== null) {
          touch(m.wrestler_b_id)
          if (m.winner_id === m.wrestler_b_id) records.get(m.wrestler_b_id)!.wins++
          else records.get(m.wrestler_b_id)!.losses++
        }
      }

      for (const b of (tourRes.data ?? [])) {
        if (b.winner === null) continue
        if (b.wrestler1_id) {
          touch(b.wrestler1_id)
          if (b.winner === 1) records.get(b.wrestler1_id)!.wins++
          else records.get(b.wrestler1_id)!.losses++
        }
        if (b.wrestler2_id) {
          touch(b.wrestler2_id)
          if (b.winner === 2) records.get(b.wrestler2_id)!.wins++
          else records.get(b.wrestler2_id)!.losses++
        }
      }

      for (const m of (psRes.data ?? [])) {
        const wId = entryToWrestler.get(m.winner_entry_id ?? '')
        const lId = entryToWrestler.get(m.loser_entry_id ?? '')
        if (wId) { touch(wId); records.get(wId)!.wins++ }
        if (lId) { touch(lId); records.get(lId)!.losses++ }
      }

      setRosterRecords(records)
      setRosterLoading(false)
      setRosterLoaded(true)
    })()
    return () => { cancelled = true }
  }, [activeTab, rosterLoaded, schoolIdNum, genderCode, activeSeason, wrestlers])

  // ── Season stats — loads on mount (also powers the stats board) ────────────
  useEffect(() => {
    if (seasonLoaded || wrestlers.length === 0) return
    let cancelled = false
    setSeasonLoading(true)
    ;(async () => {
      const seasonStr = seasonLabelOf(activeSeason) ?? ''

      const [dualMeetRes, boutTourRes, psTourRes] = await Promise.all([
        (supabase as any).from(dualTable).select('id')
          .or(`team1_school_id.eq.${schoolIdNum},team2_school_id.eq.${schoolIdNum}`)
          .eq('season_id', activeSeason),
        supabase.from(boutTable).select('in_season_tournament_id')
          .or(`wrestler1_school_id.eq.${schoolIdNum},wrestler2_school_id.eq.${schoolIdNum}`),
        supabase.from('tournaments').select('id').eq('season_id', activeSeason).eq('gender', genderCode),
      ])
      if (cancelled) return

      const dualMeetIds = (dualMeetRes.data ?? []).map((m: { id: string }) => m.id)
      const allInSeasonIds = [...new Set((boutTourRes.data ?? []).map((b: { in_season_tournament_id: string }) => b.in_season_tournament_id))]
      const psTourIds = (psTourRes.data ?? []).map((t: { id: string }) => t.id)

      let curInSeasonIds: string[] = []
      if (allInSeasonIds.length > 0) {
        const { data: tours } = await supabase
          .from(istTable).select('id').in('id', allInSeasonIds).eq('season', seasonStr)
        curInSeasonIds = (tours ?? []).map((t: { id: string }) => t.id)
      }

      const entryToWrestler = new Map<string, string>()
      if (psTourIds.length > 0) {
        const { data: entries } = await supabase
          .from('tournament_entries').select('id, wrestler_id')
          .eq('school_id', schoolIdNum).in('tournament_id', psTourIds)
        for (const e of (entries ?? []) as { id: string; wrestler_id: string }[]) {
          entryToWrestler.set(e.id, e.wrestler_id)
        }
      }
      const entryIds = [...entryToWrestler.keys()]

      const [dualMatchRes, inSeasonRes, psMatchRes] = await Promise.all([
        dualMeetIds.length > 0
          ? (supabase as any).from(matchTable)
              .select('wrestler_a_id, wrestler_b_id, winner_id, result_type, fall_time_seconds, is_double_forfeit')
              .in('dual_meet_id', dualMeetIds)
          : Promise.resolve({ data: [] as { wrestler_a_id: string | null; wrestler_b_id: string | null; winner_id: string | null; result_type: string | null; fall_time_seconds: number | null; is_double_forfeit: boolean }[] }),
        curInSeasonIds.length > 0
          ? supabase.from(boutTable)
              .select('wrestler1_id, wrestler2_id, winner, result_type, fall_time_seconds')
              .in('in_season_tournament_id', curInSeasonIds)
              .or(`wrestler1_school_id.eq.${schoolIdNum},wrestler2_school_id.eq.${schoolIdNum}`)
          : Promise.resolve({ data: [] as { wrestler1_id: string | null; wrestler2_id: string | null; winner: number | null; result_type: string | null; fall_time_seconds: number | null }[] }),
        entryIds.length > 0
          ? supabase.from('matches')
              .select('winner_entry_id, loser_entry_id, result_type, fall_time_seconds')
              .or(`winner_entry_id.in.(${entryIds.join(',')}),loser_entry_id.in.(${entryIds.join(',')})`)
              .eq('validated', true)
          : Promise.resolve({ data: [] as { winner_entry_id: string | null; loser_entry_id: string | null; result_type: string | null; fall_time_seconds: number | null }[] }),
      ])
      if (cancelled) return

      const stats = new Map<string, SeasonStat>()
      for (const w of wrestlers) {
        stats.set(w.wrestler_id, {
          wrestlerName: w.wrestler_name, weight: w.primary_weight,
          wins: 0, losses: 0, pins: 0, pinTimeSecs: 0,
          techs: 0, techTimeSecs: 0, mds: 0, teamPts: 0,
          hammer: null,
        })
      }

      const domScores = new Map<string, number[]>()
      for (const w of wrestlers) domScores.set(w.wrestler_id, [])

      function domScore(rt: string | null, fallSecs: number | null): number {
        const t = (rt ?? '').toUpperCase()
        if (['FALL', 'TF', 'TF-1', 'TF-1.5'].includes(t)) return Math.max(9 - (fallSecs ?? 0) / 60, 0)
        if (t === 'MD') return 2
        if (['DEC', 'SV-1', '2-OT', 'UTB'].includes(t)) return 1
        return 0
      }

      function applyBout(wid: string, won: boolean, rt: string | null, fallSecs: number | null, pts = 0) {
        const s = stats.get(wid); if (!s) return
        if (won) {
          s.wins++; s.teamPts += pts
          const t = (rt ?? '').toUpperCase()
          if (t === 'FALL') { s.pins++; s.pinTimeSecs += fallSecs ?? 0 }
          else if (t === 'TF') { s.techs++; s.techTimeSecs += fallSecs ?? 0 }
          else if (t === 'MD') { s.mds++ }
        } else { s.losses++ }
        const sc = domScore(rt, fallSecs)
        domScores.get(wid)?.push(won ? sc : -sc)
      }

      function dualPtsFor(rt: string | null): number {
        const t = (rt ?? '').toUpperCase()
        if (t === 'FALL' || t === 'FFT' || t === 'FORFEIT') return 6
        if (t === 'TF') return 5
        if (t === 'MD') return 4
        return 3
      }

      for (const m of (dualMatchRes.data ?? [])) {
        if (m.is_double_forfeit || !m.winner_id) continue
        const pts = dualPtsFor(m.result_type)
        if (m.wrestler_a_id) applyBout(m.wrestler_a_id, m.winner_id === m.wrestler_a_id, m.result_type, m.fall_time_seconds, m.winner_id === m.wrestler_a_id ? pts : 0)
        if (m.wrestler_b_id) applyBout(m.wrestler_b_id, m.winner_id === m.wrestler_b_id, m.result_type, m.fall_time_seconds, m.winner_id === m.wrestler_b_id ? pts : 0)
      }

      for (const b of (inSeasonRes.data ?? [])) {
        if (b.winner === null) continue
        if (b.wrestler1_id) applyBout(b.wrestler1_id, b.winner === 1, b.result_type, b.fall_time_seconds)
        if (b.wrestler2_id) applyBout(b.wrestler2_id, b.winner === 2, b.result_type, b.fall_time_seconds)
      }

      for (const m of (psMatchRes.data ?? [])) {
        const wId = entryToWrestler.get(m.winner_entry_id ?? '')
        const lId = entryToWrestler.get(m.loser_entry_id ?? '')
        if (wId) applyBout(wId, true,  m.result_type, m.fall_time_seconds)
        if (lId) applyBout(lId, false, m.result_type, m.fall_time_seconds)
      }

      for (const [wid, scores] of domScores.entries()) {
        const s = stats.get(wid)
        if (!s || scores.length === 0) continue
        s.hammer = scores.reduce((a, b) => a + b, 0) / scores.length
      }

      if (!cancelled) { setSeasonStatsMap(stats); setSeasonLoading(false); setSeasonLoaded(true) }
    })()
    return () => { cancelled = true }
  }, [seasonLoaded, schoolIdNum, genderCode, activeSeason, wrestlers])

  const seasonTotals = useMemo(() => {
    let wins = 0, losses = 0, pins = 0, techs = 0, mds = 0
    for (const s of seasonStatsMap.values()) {
      wins += s.wins; losses += s.losses
      pins += s.pins; techs += s.techs; mds += s.mds
    }
    const bonusPct = (wins + losses) > 0 ? Math.round((pins + techs + mds) / (wins + losses) * 100) : 0
    return { wins, losses, pins, techs, mds, bonusPct }
  }, [seasonStatsMap])

  return (
    <>
      {/* Stats board */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-px bg-slate-200 border border-slate-200 mb-4 overflow-hidden rounded-lg">
        <StatChip
          label="Record"
          value={dualStats ? `${dualStats.teamWins}-${dualStats.teamLosses}` : null}
        />
        <StatChip
          label="Power Rankings"
          value="—"
        />
        <StatChip
          label="Conf. Rankings"
          value="—"
        />
        <StatChip
          label="Pts / Dual"
          value={dualStats && dualStats.meets > 0 ? (dualStats.totalPts / dualStats.meets).toFixed(1) : null}
          rank={dualStats?.ptsDualRank}
        />
        <StatChip
          label="Pins"
          value={seasonLoaded ? String(seasonTotals.pins) : null}
          rank={dualStats?.pinsRank}
        />
        <StatChip
          label="Tech Falls"
          value={seasonLoaded ? String(seasonTotals.techs) : null}
          rank={dualStats?.techsRank}
        />
        <StatChip
          label="Bonus %"
          value={seasonLoaded ? `${seasonTotals.bonusPct}%` : null}
          rank={dualStats?.bonusPctRank}
        />
      </div>

      {/* Tab nav — sticky, pins below the school logo bar */}
      <div
        className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto sticky z-10 bg-white"
        style={{ top: tabStickyTop }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => router.push(tabUrl(t.id), { scroll: false })}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? 'text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
            style={activeTab === t.id ? { borderBottomColor: primaryColor } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Post Season ── */}
      {activeTab === 'postseason' && (
        <div className="space-y-4">
          {/* Team / Individual toggle */}
          <div className="flex gap-1 border-b border-slate-200">
            {(['individual', 'team'] as const).map(st => (
              <button key={st} onClick={() => setPostseasonSubTab(st)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  postseasonSubTab === st ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}>
                {st === 'individual' ? 'Individual' : 'Team'}
              </button>
            ))}
          </div>

          {/* Team */}
          {postseasonSubTab === 'team' && (
            <p className="text-sm text-slate-400 py-4">Team postseason stats coming soon.</p>
          )}

          {/* Individual */}
          {postseasonSubTab === 'individual' && (
            <div className="space-y-8">
              {/* Quick stats strip */}
              <StatsTable
                columns={[
                  { key: 'wrestlers',    label: 'Wrestlers',       align: 'center' },
                  { key: 'wins',         label: 'PS Wins',         align: 'center' },
                  { key: 'points',       label: 'Points',          align: 'center' },
                  { key: 'distChamps',   label: 'Dist. Champs',    align: 'center' },
                  { key: 'regionChamps', label: 'Region Champs',   align: 'center' },
                  { key: 'stateMeds',    label: 'State Medalists', align: 'center' },
                ]}
                rows={[{
                  wrestlers:    wrestlers.length,
                  wins:         totalWins,
                  points:       Math.round(totalPts * 10) / 10,
                  distChamps:   districtChamps.length,
                  regionChamps: regionChamps.length,
                  stateMeds:    stateMedalists,
                }]}
              />

              {/* Points breakdown */}
              {teamScore && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Points Breakdown</h3>
                  <StatsTable
                    columns={[
                      { key: 'tournament', label: 'Tournament', numeric: false },
                      { key: 'pts',        label: 'Points',     align: 'right' },
                      { key: 'wins',       label: 'Wins',       align: 'right' },
                    ]}
                    rows={[
                      { label: 'Districts', pts: teamScore.district_points, type: gender === 'girls' ? 'girls_districts' : 'boys_districts' },
                      { label: 'Regions',   pts: teamScore.region_points,   type: gender === 'girls' ? 'girls_regions'   : 'regions'        },
                      { label: 'State',     pts: teamScore.state_points,    type: gender === 'girls' ? 'girls_state'     : 'boys_state'     },
                    ].filter(r => r.pts > 0).map(r => ({
                      tournament: r.label,
                      pts:  r.pts,
                      wins: breakdown.find(b => b.tournament_type === r.type)?.win_count ?? '\u2014',
                    }))}
                    footer={{ tournament: 'Total', pts: teamScore.total_points, wins: totalWins }}
                  />
                </section>
              )}

              {/* Champions */}
              {(stateChamps.length > 0 || regionChamps.length > 0 || districtChamps.length > 0) && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Champions</h3>
                  <div className="border border-black overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="px-3 py-1.5 text-right text-xs font-bold uppercase tracking-wide whitespace-nowrap w-12">Wt</th>
                          <th className="px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Wrestler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'State',    list: stateChamps    },
                          { label: 'Region',   list: regionChamps   },
                          { label: 'District', list: districtChamps },
                        ].filter(s => s.list.length > 0).flatMap(sec => [
                          <tr key={`${sec.label}-hdr`}>
                            <td colSpan={2} className="px-3 py-1 bg-amber-50 text-xs font-semibold text-amber-700 uppercase tracking-wide border-t border-amber-100">{sec.label}</td>
                          </tr>,
                          ...sec.list.map((w, i) => (
                            <tr key={w.wrestler_id} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                              <td className="px-3 py-1.5 tabular-nums text-right text-slate-400">{w.primary_weight}</td>
                              <td className="px-3 py-1.5">
                                <Link href={`/${gender}/wrestler/${w.wrestler_id}`} className="font-medium text-slate-800 hover:underline">{w.wrestler_name}</Link>
                              </td>
                            </tr>
                          )),
                        ])}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* State / Regions / Districts placement tables */}
              {wrestlers.filter(w => w.state_placement || w.regions_placement || w.districts_placement).length === 0 ? (
                <p className="text-sm text-slate-500">No postseason results found for the current season.</p>
              ) : (
                ['State', 'Regions', 'Districts'].map(level => {
                  const filtered = wrestlers.filter(w => {
                    if (level === 'State')   return w.state_placement
                    if (level === 'Regions') return w.regions_placement
                    return w.districts_placement
                  }).sort((a, b) => {
                    const place = (w: WrestlerRow) => {
                      const p = level === 'State' ? w.state_placement : level === 'Regions' ? w.regions_placement : w.districts_placement
                      return parseInt(p ?? '99')
                    }
                    return place(a) - place(b) || a.primary_weight - b.primary_weight
                  })
                  if (filtered.length === 0) return null
                  return (
                    <section key={level}>
                      <h3 className="text-sm font-semibold text-slate-800 mb-2">{level}</h3>
                      <div className="border border-black overflow-hidden">
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="bg-slate-900 text-white">
                              <th className="px-3 py-1.5 text-right text-xs font-bold uppercase tracking-wide whitespace-nowrap w-12">Wt</th>
                              <th className="px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Wrestler</th>
                              <th className="px-3 py-1.5 text-right text-xs font-bold uppercase tracking-wide whitespace-nowrap">Place</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((w, i) => (
                              <tr key={`${level}-${w.wrestler_id}`} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                <td className="px-3 py-1.5 tabular-nums text-right text-slate-400">{w.primary_weight}</td>
                                <td className="px-3 py-1.5">
                                  <Link href={`/${gender}/wrestler/${w.wrestler_id}`} className="font-medium text-slate-800 hover:underline">{w.wrestler_name}</Link>
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  <PlaceBadge placement={level === 'State' ? w.state_placement : level === 'Regions' ? w.regions_placement : w.districts_placement} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Roster ── */}
      {activeTab === 'roster' && (
        <div>
          {wrestlers.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No roster data available.</p>
          ) : (
            <div className="border border-black overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-3 py-1.5 text-right text-xs font-bold uppercase tracking-wide whitespace-nowrap w-12">Wt</th>
                    <th className="px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Wrestler</th>
                    <th className="px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap">Record</th>
                    <th className="px-3 py-1.5 text-right text-xs font-bold uppercase tracking-wide whitespace-nowrap">Postseason</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterLoading ? (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">Loading records…</td></tr>
                  ) : (
                    wrestlers
                      .slice()
                      .sort((a, b) => a.primary_weight - b.primary_weight)
                      .map((w, i) => {
                        const rec = rosterRecords.get(w.wrestler_id)
                        return (
                          <tr key={w.wrestler_id} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                            <td className="px-3 py-1.5 text-right text-slate-400 tabular-nums">{w.primary_weight}</td>
                            <td className="px-3 py-1.5">
                              <Link href={`/${gender}/wrestler/${w.wrestler_id}`} className="font-medium text-slate-900 hover:underline">{w.wrestler_name}</Link>
                            </td>
                            <td className="px-3 py-1.5 text-center tabular-nums text-slate-600">
                              {rec ? `${rec.wins}-${rec.losses}` : '—'}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <BestFinish w={w} />
                            </td>
                          </tr>
                        )
                      })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Leaders ── */}
      {activeTab === 'leaders' && (
        <div className="space-y-4">
          {/* Sub-tab switcher */}
          <div className="flex gap-1 border-b border-slate-200">
            {(['season', 'postseason'] as const).map(st => (
              <button key={st} onClick={() => setLeadersSubTab(st)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  leadersSubTab === st ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}>
                {st === 'season' ? 'Season' : 'Post Season'}
              </button>
            ))}
          </div>

          {/* ── Season sub-tab ── */}
          {leadersSubTab === 'season' && (
            seasonLoading ? (
              <div className="bg-white border border-black p-8 text-center">
                <p className="text-sm text-slate-400">Loading season stats...</p>
              </div>
            ) : (() => {
              const rows = wrestlers
                .map(w => ({ w, s: seasonStatsMap.get(w.wrestler_id) }))
                .filter((r): r is { w: WrestlerRow; s: SeasonStat } => r.s !== undefined)

              const sortedRows = [...rows].sort((a, b) => {
                const sa = a.s, sb = b.s
                const dir = seasonSort.dir === 'desc' ? -1 : 1
                switch (seasonSort.key) {
                  case 'wins':    return (sa.wins - sb.wins) * dir
                  case 'winPct': {
                    const va = sa.wins + sa.losses > 0 ? sa.wins / (sa.wins + sa.losses) : -1
                    const vb = sb.wins + sb.losses > 0 ? sb.wins / (sb.wins + sb.losses) : -1
                    return (va - vb) * dir
                  }
                  case 'hammer': {
                    if (sa.hammer === null && sb.hammer === null) return 0
                    if (sa.hammer === null) return 1; if (sb.hammer === null) return -1
                    return (sa.hammer - sb.hammer) * dir
                  }
                  case 'pins':   return (sa.pins - sb.pins) * dir
                  case 'pinTime': {
                    if (!sa.pins && !sb.pins) return 0
                    if (!sa.pins) return 1; if (!sb.pins) return -1
                    return (sa.pinTimeSecs / sa.pins - sb.pinTimeSecs / sb.pins) * dir
                  }
                  case 'techs':  return (sa.techs - sb.techs) * dir
                  case 'techTime': {
                    if (!sa.techs && !sb.techs) return 0
                    if (!sa.techs) return 1; if (!sb.techs) return -1
                    return (sa.techTimeSecs / sa.techs - sb.techTimeSecs / sb.techs) * dir
                  }
                  case 'bonus': {
                    const va = (sa.wins + sa.losses) > 0 ? (sa.pins + sa.techs + sa.mds) / (sa.wins + sa.losses) : -1
                    const vb = (sb.wins + sb.losses) > 0 ? (sb.pins + sb.techs + sb.mds) / (sb.wins + sb.losses) : -1
                    return (va - vb) * dir
                  }
                  case 'teamPts': return (sa.teamPts - sb.teamPts) * dir
                  default: return 0
                }
              })

              function SortTh({ sortKey, label, defaultDir = 'desc' }: { sortKey: string; label: string; defaultDir?: 'asc' | 'desc' }) {
                const active = seasonSort.key === sortKey
                return (
                  <th
                    onClick={() => setSeasonSort(prev => prev.key === sortKey ? { key: sortKey, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key: sortKey, dir: defaultDir })}
                    className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap text-right cursor-pointer select-none hover:opacity-80"
                  >
                    {label}{active ? (seasonSort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </th>
                )
              }

              return (
                <div className="border border-black overflow-x-auto">
                  <table className="min-w-max w-full text-[12px]">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-right">Wt</th>
                        <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-left">Wrestler</th>
                        <SortTh sortKey="wins"     label="W-L"      />
                        <SortTh sortKey="winPct"   label="Win%"     />
                        <SortTh sortKey="hammer"   label="Hammer"   />
                        <SortTh sortKey="pins"     label="Pins"     />
                        <SortTh sortKey="pinTime"  label="Avg Pin" defaultDir="asc" />
                        <SortTh sortKey="techs"    label="TF"       />
                        <SortTh sortKey="techTime" label="Avg TF"   defaultDir="asc" />
                        <SortTh sortKey="bonus"    label="Bonus%"   />
                        <SortTh sortKey="teamPts"  label="Team Pts" />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map(({ w, s }, i) => {
                        const total   = s.wins + s.losses
                        const winPct  = total > 0 ? (s.wins / total * 100).toFixed(1) + '%' : '—'
                        const hammer  = s.hammer !== null ? s.hammer.toFixed(1) : '—'
                        const avgPin  = s.pins  > 0 ? fmtTime(Math.round(s.pinTimeSecs  / s.pins))  : '—'
                        const avgTf   = s.techs > 0 ? fmtTime(Math.round(s.techTimeSecs / s.techs)) : '—'
                        const bonus   = (s.wins + s.losses) > 0 ? Math.round((s.pins + s.techs + s.mds) / (s.wins + s.losses) * 100) + '%' : '—'
                        return (
                          <tr key={w.wrestler_id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="px-2 py-1.5 tabular-nums text-right text-slate-400">{w.primary_weight}</td>
                            <td className="px-2 py-1.5 font-medium text-slate-800">
                              <Link href={`/${gender}/wrestler/${w.wrestler_id}`} className="hover:underline">{w.wrestler_name}</Link>
                            </td>
                            <td className="px-2 py-1.5 tabular-nums text-right text-slate-700">{total > 0 ? `${s.wins}-${s.losses}` : '—'}</td>
                            <td className="px-2 py-1.5 tabular-nums text-right text-slate-700">{winPct}</td>
                            <td className="px-2 py-1.5 tabular-nums text-right text-slate-700">{hammer}</td>
                            <td className="px-2 py-1.5 tabular-nums text-right text-slate-700">{s.pins  || '—'}</td>
                            <td className="px-2 py-1.5 tabular-nums text-right text-slate-700">{avgPin}</td>
                            <td className="px-2 py-1.5 tabular-nums text-right text-slate-700">{s.techs || '—'}</td>
                            <td className="px-2 py-1.5 tabular-nums text-right text-slate-700">{avgTf}</td>
                            <td className="px-2 py-1.5 tabular-nums text-right text-slate-700">{bonus}</td>
                            <td className="px-2 py-1.5 tabular-nums text-right text-slate-700">{s.teamPts || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()
          )}

          {/* ── Post Season sub-tab ── */}
          {leadersSubTab === 'postseason' && (
            <div className="space-y-4">
              {/* Team / Individual toggle */}
              <div className="flex gap-1 border-b border-slate-100">
                {(['individual', 'team'] as const).map(st => (
                  <button key={st} onClick={() => setPsSubTab(st)}
                    className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                      psSubTab === st ? 'border-slate-700 text-slate-700' : 'border-transparent text-slate-400 hover:text-slate-500'
                    }`}>
                    {st === 'individual' ? 'Individual' : 'Team'}
                  </button>
                ))}
              </div>

              {/* Team — placeholder */}
              {psSubTab === 'team' && (
                <p className="text-sm text-slate-400 py-4">Team postseason stats coming soon.</p>
              )}

              {/* Individual — sortable postseason leaders */}
              {psSubTab === 'individual' && (
                leaders.length === 0 ? (
                  <p className="text-sm text-slate-500 p-4">No postseason leaderboard data available.</p>
                ) : (() => {
                  const sortedLeaders = [...leaders].sort((a, b) => {
                    const dir = psSort.dir === 'desc' ? -1 : 1
                    switch (psSort.key) {
                      case 'wins':    return (a.win_count    - b.win_count)    * dir
                      case 'falls':   return (a.fall_count   - b.fall_count)   * dir
                      case 'fastPin': {
                        const av = a.fastest_fall_sec ?? 99999, bv = b.fastest_fall_sec ?? 99999
                        if (av === 99999 && bv === 99999) return 0
                        if (av === 99999) return 1; if (bv === 99999) return -1
                        return (av - bv) * dir
                      }
                      case 'bonus':   return (a.bonus_pct       - b.bonus_pct)       * dir
                      case 'dist':    return (a.district_points  - b.district_points) * dir
                      case 'reg':     return (a.region_points    - b.region_points)   * dir
                      case 'state':   return (a.state_points     - b.state_points)    * dir
                      case 'total':   return (a.total_points     - b.total_points)    * dir
                      default: return 0
                    }
                  })

                  function PsSortTh({ sortKey, label, defaultDir = 'desc' }: { sortKey: string; label: string; defaultDir?: 'asc' | 'desc' }) {
                    const active = psSort.key === sortKey
                    return (
                      <th
                        onClick={() => setPsSort(prev => prev.key === sortKey ? { key: sortKey, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key: sortKey, dir: defaultDir })}
                        className="px-2 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:opacity-80"
                      >
                        {label}{active ? (psSort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
                      </th>
                    )
                  }

                  return (
                    <div className="border border-black overflow-x-auto">
                      <table className="min-w-max w-full text-[12px]">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            <th className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-right">Wt</th>
                            <th className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-left">Wrestler</th>
                            <PsSortTh sortKey="wins"    label="Wins"     />
                            <PsSortTh sortKey="falls"   label="Falls"    />
                            <PsSortTh sortKey="fastPin" label="Fast Pin" defaultDir="asc" />
                            <PsSortTh sortKey="bonus"   label="Bonus%"   />
                            <PsSortTh sortKey="dist"    label="Dist"     />
                            <PsSortTh sortKey="reg"     label="Reg"      />
                            <PsSortTh sortKey="state"   label="State"    />
                            <PsSortTh sortKey="total"   label="Total"    />
                          </tr>
                        </thead>
                        <tbody>
                          {sortedLeaders.map((r, i) => {
                            const fastPin = r.fastest_fall_sec != null
                              ? fmtTime(r.fastest_fall_sec) : '—'
                            return (
                              <tr key={r.wrestler_id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="px-2 py-1 tabular-nums text-right text-slate-400">{r.primary_weight}</td>
                                <td className="px-2 py-1 font-medium text-slate-800">
                                  <Link href={`/${gender}/wrestler/${r.wrestler_id}`} className="hover:underline">{r.wrestler_name}</Link>
                                </td>
                                <td className="px-2 py-1 tabular-nums text-right text-slate-700">{r.win_count    || '—'}</td>
                                <td className="px-2 py-1 tabular-nums text-right text-slate-700">{r.fall_count   || '—'}</td>
                                <td className="px-2 py-1 tabular-nums text-right text-slate-700">{fastPin}</td>
                                <td className="px-2 py-1 tabular-nums text-right text-slate-700">{r.bonus_pct ? `${r.bonus_pct}%` : '—'}</td>
                                <td className="px-2 py-1 tabular-nums text-right text-slate-700">{r.district_points || '—'}</td>
                                <td className="px-2 py-1 tabular-nums text-right text-slate-700">{r.region_points   || '—'}</td>
                                <td className="px-2 py-1 tabular-nums text-right text-slate-700">{r.state_points    || '—'}</td>
                                <td className="px-2 py-1 tabular-nums text-right text-slate-700 font-semibold">{r.total_points || '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold text-slate-700">
                            <td className="px-2 py-1" colSpan={2}></td>
                            <td className="px-2 py-1 tabular-nums text-right"></td>
                            <td className="px-2 py-1 tabular-nums text-right"></td>
                            <td className="px-2 py-1 tabular-nums text-right"></td>
                            <td className="px-2 py-1 tabular-nums text-right"></td>
                            <td className="px-2 py-1 tabular-nums text-right">{leaders.reduce((s, r) => s + Number(r.district_points), 0) || '—'}</td>
                            <td className="px-2 py-1 tabular-nums text-right">{leaders.reduce((s, r) => s + Number(r.region_points),   0) || '—'}</td>
                            <td className="px-2 py-1 tabular-nums text-right">{leaders.reduce((s, r) => s + Number(r.state_points),    0) || '—'}</td>
                            <td className="px-2 py-1 tabular-nums text-right">{leaders.reduce((s, r) => s + Number(r.total_points),    0)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )
                })()
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Team Scores ── */}
      {activeTab === 'scores' && (
        <div>
          {!teamScore && breakdown.length === 0 ? (
            <p className="text-sm text-slate-500">No team score data available.</p>
          ) : (
            <div className="space-y-6">
              {teamScore && (
                <StatsTable
                  columns={[
                    { key: 'tournament', label: 'Tournament', numeric: false },
                    { key: 'pts',        label: 'Points',     align: 'right' },
                  ]}
                  rows={[
                    { tournament: 'Districts', pts: teamScore.district_points },
                    { tournament: 'Regions',   pts: teamScore.region_points   },
                    { tournament: 'State',     pts: teamScore.state_points    },
                  ]}
                  footer={{ tournament: 'Total', pts: teamScore.total_points }}
                />
              )}

              {breakdown.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Win Breakdown</h3>
                  <StatsTable
                    columns={[
                      { key: 'tournament', label: 'Tournament', numeric: false },
                      { key: 'wins',       label: 'Wins',       align: 'right' },
                    ]}
                    rows={breakdown.map(r => ({
                      tournament: tourneyLabel[r.tournament_type] ?? r.tournament_type,
                      wins:       r.win_count,
                    }))}
                    footer={{ tournament: 'Total', wins: totalWins }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Schedule ── */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Schedule</h3>

          {meetsLoading ? (
            <div className="bg-white border border-black p-8 text-center">
              <p className="text-sm text-slate-400">Loading...</p>
            </div>
          ) : meets.length === 0 && tourEvents.length === 0 ? (
            <div className="bg-white border border-black p-8 text-center">
              <p className="text-sm text-slate-500">No schedule results for this season.</p>
            </div>
          ) : (() => {
            type ScheduleItem =
              | { kind: 'meet';       date: string; id: string; meet:  DualMeet       }
              | { kind: 'tournament'; date: string; id: string; event: TournamentEvent }

            const items: ScheduleItem[] = [
              ...meets.map(m      => ({ kind: 'meet'       as const, date: m.meet_date,  id: m.id,      meet:  m })),
              ...tourEvents.map(t => ({ kind: 'tournament' as const, date: t.start_date, id: t.id,      event: t })),
            ].sort((a, b) => a.date.localeCompare(b.date))

            // Pre-compute running W-L record through dual meets in chronological order
            let runW = 0, runL = 0
            const runningRecord = new Map<string, { w: number; l: number } | null>()
            for (const item of items) {
              if (item.kind !== 'meet') continue
              const m = item.meet
              const isHome = m.team1_school_id === schoolIdNum
              const myScore    = isHome ? m.team1_score    : m.team2_score
              const theirScore = isHome ? m.team2_score    : m.team1_score
              if (!countsForRecord(m)) {
                runningRecord.set(item.id, null)
              } else if (myScore !== null && theirScore !== null) {
                if (myScore > theirScore) runW++
                else if (myScore < theirScore) runL++
                runningRecord.set(item.id, { w: runW, l: runL })
              } else {
                runningRecord.set(item.id, null)
              }
            }

            return (
              <div className="border border-black overflow-x-auto">
                <table className="min-w-max w-full text-[13px]">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="text-left px-3 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Date</th>
                      <th className="text-left px-3 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Opponent / Event</th>
                      <th className="text-right px-3 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Score</th>
                      <th className="text-left px-3 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Result</th>
                      <th className="text-right px-3 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      const isExpanded = expandedId === item.id
                      const rowBg = isExpanded ? 'bg-slate-900 text-white' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'

                      if (item.kind === 'tournament') {
                        const place = tourPlaces.get(item.event.id)
                        const placeLabel = place ? (place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`) : null
                        const placeBg = place === 1 ? 'bg-amber-100 text-amber-800'
                          : place === 2 ? 'bg-slate-200 text-slate-700'
                          : place === 3 ? 'bg-orange-100 text-orange-800'
                          : place && place <= 8 ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                        const dateStr = new Date(item.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        const tourBouts = tourBoutCache.get(item.id) ?? []
                        const tourWeights = [...new Set(tourBouts.map(b => b.weight_class))].sort((a, b) => a - b)
                        const selWt = tourWeightSel.get(item.id) ?? tourWeights[0] ?? null
                        const selBouts = tourBouts.filter(b => b.weight_class === selWt)

                        return (
                          <>
                            <tr
                              key={item.id}
                              className={`border-t border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors ${rowBg}`}
                              onClick={() => toggleExpand(item.id, 'tournament')}
                            >
                              <td className={`px-3 py-2 whitespace-nowrap text-xs ${isExpanded ? 'text-slate-300' : 'text-slate-400'}`}>{dateStr}</td>
                              <td className="px-3 py-2 font-medium">
                                <span className={isExpanded ? 'text-white' : 'text-slate-800'}>{item.event.name}</span>
                                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${isExpanded ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>Tournament</span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                {placeLabel ? (
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isExpanded ? 'bg-slate-700 text-white' : placeBg}`}>{placeLabel}</span>
                                ) : <span className={isExpanded ? 'text-slate-500' : 'text-slate-300'}>—</span>}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`text-xs ${isExpanded ? 'text-slate-400' : 'text-slate-400'}`}>{isExpanded ? '▲' : '▼'}</span>
                              </td>
                              <td className="px-3 py-2" />
                            </tr>
                            {isExpanded && (
                              <tr key={`${item.id}-expand`} className="border-t border-slate-700 bg-slate-50">
                                <td colSpan={5} className="px-4 py-3">
                                  {expandLoading ? (
                                    <p className="text-xs text-slate-400 py-2">Loading...</p>
                                  ) : tourWeights.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-2">No bout data available.</p>
                                  ) : (
                                    <>
                                      <div className="flex flex-wrap gap-1 mb-3">
                                        {tourWeights.map(wt => (
                                          <button
                                            key={wt}
                                            onClick={e => { e.stopPropagation(); setTourWeightSel(prev => new Map(prev).set(item.id, wt)) }}
                                            className={`px-2.5 py-0.5 text-xs font-medium border transition-colors ${
                                              selWt === wt ? 'bg-black text-white border-black' : 'bg-white text-slate-600 border-slate-300 hover:border-black'
                                            }`}
                                          >
                                            {wt}
                                          </button>
                                        ))}
                                      </div>
                                      <table className="w-full text-[12px]">
                                        <thead>
                                          <tr className="text-left border-b border-slate-200">
                                            <th className="pb-1 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Round</th>
                                            <th className="pb-1 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Our Wrestler</th>
                                            <th className="pb-1 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Result</th>
                                            <th className="pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">Opponent</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {selBouts.map(b => {
                                            const weAre1 = b.wrestler1_school_id === schoolIdNum
                                            const ourName  = weAre1 ? b.wrestler1_name_raw : b.wrestler2_name_raw
                                            const oppName  = weAre1 ? b.wrestler2_name_raw : b.wrestler1_name_raw
                                            const weWon    = (weAre1 && b.winner === 1) || (!weAre1 && b.winner === 2)
                                            const resultStr = fmtBoutResult(b.result_type, b.fall_time_seconds, b.winner_score, b.loser_score)
                                            const isDff = (b.result_type ?? '').toUpperCase() === 'DFF'
                                            return (
                                              <tr key={b.id} className="border-b border-slate-100 last:border-0">
                                                <td className="py-1.5 pr-4 text-slate-400">{roundLabel(b.round)}</td>
                                                <td className="py-1.5 pr-4 font-medium text-slate-800">{ourName}</td>
                                                <td className="py-1.5 pr-4">
                                                  {isDff ? (
                                                    <span className="text-slate-400">DFF</span>
                                                  ) : (
                                                    <span className={`font-semibold ${weWon ? 'text-emerald-700' : 'text-red-600'}`}>
                                                      {weWon ? 'W' : 'L'} · {resultStr}
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="py-1.5 text-slate-500">{oppName}</td>
                                              </tr>
                                            )
                                          })}
                                        </tbody>
                                      </table>
                                    </>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      }

                      // Dual meet row
                      const meet        = item.meet
                      const isHome      = meet.team1_school_id === schoolIdNum
                      const opponentId  = isHome ? meet.team2_school_id : meet.team1_school_id
                      const opponentTeam = isHome ? meet.team2 : meet.team1
                      const opponentName = opponentTeam?.display_name
                      const opponentIsNJ = opponentTeam?.is_nj ?? true
                      const myScore     = isHome ? meet.team1_score : meet.team2_score
                      const theirScore  = isHome ? meet.team2_score : meet.team1_score
                      const hasScore    = myScore !== null && theirScore !== null
                      const result      = hasScore ? (myScore! > theirScore! ? 'W' : myScore! < theirScore! ? 'L' : 'T') : null
                      const dateStr     = new Date(meet.meet_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      const matches     = meetMatchCache.get(item.id) ?? []

                      return (
                        <>
                          <tr
                            key={item.id}
                            className={`border-t border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors ${rowBg}`}
                            onClick={() => toggleExpand(item.id, 'meet')}
                          >
                            <td className={`px-3 py-2 whitespace-nowrap text-xs ${isExpanded ? 'text-slate-300' : 'text-slate-400'}`}>{dateStr}</td>
                            <td className="px-3 py-2 font-medium">
                              {opponentIsNJ ? (
                                <Link href={`${resolvedBase.replace(/\/schools\/.*$/, '')}/schools/${opponentId}`} onClick={e => e.stopPropagation()} className={`hover:underline ${isExpanded ? 'text-white' : 'text-slate-800'}`}>
                                  {!isHome && <span className="mr-0.5">@</span>}{opponentName ?? '—'}
                                </Link>
                              ) : (
                                <span className={isExpanded ? 'text-white' : 'text-slate-800'}>
                                  {!isHome && <span className="mr-0.5">@</span>}{opponentName ?? '—'}
                                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${isExpanded ? 'bg-blue-800 text-blue-100' : 'bg-blue-900 text-white'}`}>Non-NJSIAA</span>
                                </span>
                              )}
                              {!countsForRecord(item.meet) && (
                                <span
                                  title="Bouts count for wrestlers; not a team dual, so the team record is unchanged"
                                  className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${isExpanded ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}
                                >
                                  {item.meet.meet_kind === 'jamboree' ? 'Jamboree' : 'Bouts only'}
                                </span>
                              )}
                            </td>
                            <td className={`px-3 py-2 text-right tabular-nums ${isExpanded ? 'text-slate-300' : 'text-slate-600'}`}>
                              {hasScore ? `${myScore}–${theirScore}` : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-2">
                              {result ? (
                                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                                  isExpanded ? 'bg-slate-700 text-white'
                                    : result === 'W' ? 'bg-emerald-100 text-emerald-800'
                                    : result === 'L' ? 'bg-red-100 text-red-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>{result}</span>
                              ) : (
                                <span className={`text-xs ${isExpanded ? 'text-slate-400' : 'text-slate-400'}`}>{isExpanded ? '▲' : '▼'}</span>
                              )}
                            </td>
                            <td className={`px-3 py-2 text-right tabular-nums text-xs ${isExpanded ? 'text-slate-300' : 'text-slate-500'}`}>
                              {(() => {
                                const rec = runningRecord.get(item.id)
                                return rec ? `${rec.w}-${rec.l}` : <span className="text-slate-300">—</span>
                              })()}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${item.id}-expand`} className="border-t border-slate-700 bg-slate-50">
                              <td colSpan={5} className="px-4 py-3">
                                {expandLoading ? (
                                  <p className="text-xs text-slate-400 py-2">Loading...</p>
                                ) : matches.length === 0 ? (
                                  <p className="text-xs text-slate-400 py-2">No match data available.</p>
                                ) : (
                                  <table className="w-full text-[12px]">
                                    <thead>
                                      <tr className="text-left border-b border-slate-200">
                                        <th className="pb-1 pr-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-10">Wt</th>
                                        <th className="pb-1 pr-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Our Wrestler</th>
                                        <th className="pb-1 pr-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Result</th>
                                        <th className="pb-1 pr-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Opponent</th>
                                        <th className="pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">Score</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(() => {
                                        let runOur = 0, runTheir = 0
                                        return matches.map(m => {
                                          const weAreA   = m.school_a_id === schoolIdNum
                                          const ourName  = weAreA ? m.wrestler_a_name_raw : m.wrestler_b_name_raw
                                          const oppName  = weAreA ? m.wrestler_b_name_raw : m.wrestler_a_name_raw
                                          const dff      = m.is_double_forfeit
                                          const weWon    = !dff && m.winner_id !== null && (
                                            (weAreA && m.winner_id === m.wrestler_a_id) ||
                                            (!weAreA && m.winner_id === m.wrestler_b_id)
                                          )
                                          const resultStr = dff ? 'DFF'
                                            : m.is_forfeit_win && ourName && !oppName ? 'W FFT'
                                            : m.is_forfeit_win && !ourName ? 'L FFT'
                                            : fmtBoutResult(m.result_type, m.fall_time_seconds, null, null, m.result_detail)
                                          const pts = meetMatchPoints(m, weAreA)
                                          runOur += pts.our
                                          runTheir += pts.their
                                          const scoreColor = runOur > runTheir ? 'text-emerald-700' : runOur < runTheir ? 'text-red-600' : 'text-slate-500'
                                          return (
                                            <tr key={m.id} className="border-b border-slate-100 last:border-0">
                                              <td className="py-1.5 pr-3 text-slate-400 tabular-nums">{m.weight_class}</td>
                                              <td className="py-1.5 pr-3 font-medium text-slate-800">{ourName ?? <span className="text-slate-300">—</span>}</td>
                                              <td className="py-1.5 pr-3">
                                                {dff ? (
                                                  <span className="text-slate-400">DFF</span>
                                                ) : (
                                                  <span className={`font-semibold ${weWon ? 'text-emerald-700' : m.winner_id ? 'text-red-600' : 'text-slate-400'}`}>
                                                    {resultStr}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-1.5 pr-3 text-slate-500">{oppName ?? <span className="text-slate-300">—</span>}</td>
                                              <td className={`py-1.5 text-right tabular-nums font-semibold ${scoreColor}`}>{runOur}–{runTheir}</td>
                                            </tr>
                                          )
                                        })
                                      })()}
                                    </tbody>
                                  </table>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      )}
    </>
  )
}
