'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { SchoolTagView, badgeOfSchool } from '@/components/SchoolTagView'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { getAllConferences } from '@/lib/conferences'
import { getAllSections, getAllGroups } from '@/lib/sections'
import { StdHeader } from '@/components/site/StdPage'
import { FilterDrop } from '@/components/site/FilterDrop'

// ── Types ─────────────────────────────────────────────────────────────────────

type SchoolRow = { id: number; display_name: string }

type DualMeet = {
  id: string
  meet_date: string
  team1_score: number | null
  team2_score: number | null
  status: string
  is_playoff: boolean
  team1: { id: number; display_name: string; logo_url: string | null; header_background: string | null } | null
  team2: { id: number; display_name: string; logo_url: string | null; header_background: string | null } | null
}

type Tournament = {
  id: string
  name: string
  start_date: string
  end_date: string | null
}

type TournamentWinner = {
  tournament_id: string
  school: { id: number; display_name: string; logo_url: string | null; header_background: string | null } | null
}

type CalendarEvent = {
  id: number
  label: string
  event_category: string
  event_type: string | null
}

type PostseasonTourney = {
  id: number
  name: string
  tournament_type: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONFERENCES = getAllConferences().map(c => c.name)
const SECTIONS    = getAllSections().map(s => s.name)
const GROUPS      = getAllGroups().map(g => ({ value: g.name, label: g.label }))

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Section header row ────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <tr className="border-t border-slate-200 bg-slate-100">
      <td colSpan={3} className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">
        {label}{count > 0 ? ` — ${count}` : ''}
      </td>
    </tr>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ScheduleClient({ gender = 'M' }: { gender?: 'M' | 'F' }) {
  const supabase = useMemo(() => createSupabaseBrowser(), [])

  const [date, setDate]           = useState(todayLocal)
  const [loading, setLoading]     = useState(false)

  // In-season tournaments
  const [tournaments, setTournaments]     = useState<Tournament[]>([])
  const [tournWinners, setTournWinners]   = useState<Map<string, TournamentWinner['school']>>(new Map())

  // Dual meets (non-playoff)
  const [dualMeets, setDualMeets]         = useState<DualMeet[]>([])

  // New sections
  const [calendarEvents,     setCalendarEvents]     = useState<CalendarEvent[]>([])
  const [playoffMeets,       setPlayoffMeets]       = useState<DualMeet[]>([])
  const [postseasonTourneys, setPostseasonTourneys] = useState<PostseasonTourney[]>([])

  // Filter state
  const [openDrop, setOpenDrop] = useState<string | null>(null)
  const [selConfs,    setSelConfs]    = useState<Set<string>>(new Set())
  const [selGroups,   setSelGroups]   = useState<Set<string>>(new Set())
  const [selSections, setSelSections] = useState<Set<string>>(new Set())

  // User profile
  const [mySchoolIds, setMySchoolIds]   = useState<number[] | null>(null)
  const [mySchools,   setMySchools]     = useState<SchoolRow[]>([])
  const [useMySchools, setUseMySchools] = useState(false)

  // Load user profile on mount
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: prof } = await supabase
        .from('users')
        .select('primary_school_id, followed_school_ids')
        .eq('id', data.user.id)
        .maybeSingle()
      if (!prof) return
      const ids = [
        ...(prof.primary_school_id ? [prof.primary_school_id] : []),
        ...(prof.followed_school_ids ?? []),
      ]
      const unique = [...new Set(ids)] as number[]
      if (unique.length > 0) {
        setMySchoolIds(unique)
        const { data: schools } = await supabase
          .from('schools')
          .select('id, display_name')
          .in('id', unique)
          .order('display_name')
        setMySchools((schools ?? []) as SchoolRow[])
        setUseMySchools(true)
      }
    })
  }, [supabase])

  // Resolve school IDs from active filters
  const resolveSchoolIds = useCallback(async (): Promise<number[] | null> => {
    if (useMySchools && mySchoolIds) return mySchoolIds

    // Conference on its own; Group and Section narrow together (Group 3 + North II = North II's Group 3)
    if (!selConfs.size && !selGroups.size && !selSections.size) return null

    let q = supabase.from('schools').select('id').eq('is_nj', true)
    if (selConfs.size) q = q.in('athletic_conference', [...selConfs])
    else {
      if (selGroups.size)   q = q.in('classification', [...selGroups])
      if (selSections.size) q = q.in('section', [...selSections])
    }
    const { data } = await q

    return (data ?? []).map((r: { id: number }) => r.id)
  }, [useMySchools, mySchoolIds, selConfs, selGroups, selSections, supabase])

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const schoolIds = await resolveSchoolIds()

      const tournTable = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
      const boutTable  = gender === 'F' ? 'tournament_bouts_girls'     : 'tournament_bouts'
      const dualTable  = gender === 'F' ? 'dual_meets_girls'            : 'dual_meets'

      // In-season tournament queries (may be filtered by school later)
      let multiDayQuery = supabase
        .from(tournTable)
        .select('id, name, start_date, end_date')
        .lte('start_date', date)
        .gte('end_date', date)
        .order('name')

      let singleDayQuery = supabase
        .from(tournTable)
        .select('id, name, start_date, end_date')
        .eq('start_date', date)
        .is('end_date', null)
        .order('name')

      // Dual meets: all for this date (split into playoff / non-playoff after fetch)
      let meetQuery = (supabase as any)
        .from(dualTable)
        .select(`
          id, meet_date, team1_score, team2_score, status, is_playoff,
          team1:schools!team1_school_id(id, display_name, logo_url, header_background),
          team2:schools!team2_school_id(id, display_name, logo_url, header_background)
        `)
        .eq('meet_date', date)
        .order('meet_date')

      // NJSIAA calendar events — exact date (no end_date)
      const calExactQuery = supabase
        .from('season_calendar')
        .select('id, label, event_category, event_type')
        .eq('event_date', date)
        .is('event_date_end', null)

      // NJSIAA calendar events — range covering this date
      const calRangeQuery = supabase
        .from('season_calendar')
        .select('id, label, event_category, event_type')
        .lte('event_date', date)
        .gte('event_date_end', date)

      // Postseason tournaments — gender-specific, multi-day
      const psMultiQuery = supabase
        .from('tournaments')
        .select('id, name, tournament_type')
        .eq('gender', gender)
        .lte('start_date', date)
        .gte('end_date', date)

      // Postseason tournaments — gender-specific, single-day
      const psSingleQuery = supabase
        .from('tournaments')
        .select('id, name, tournament_type')
        .eq('gender', gender)
        .eq('start_date', date)
        .is('end_date', null)

      // If school filter active, filter dual meets and look up matching tournament IDs
      let skipInSeasonTournaments = false

      if (schoolIds !== null) {
        meetQuery = meetQuery.or(
          schoolIds.map(id => `team1_school_id.eq.${id},team2_school_id.eq.${id}`).join(',')
        )

        const { data: boutSchools } = await supabase
          .from(boutTable)
          .select('in_season_tournament_id')
          .or(schoolIds.map(id => `wrestler1_school_id.eq.${id},wrestler2_school_id.eq.${id}`).join(','))

        const tidSet = [...new Set((boutSchools ?? []).map((b: { in_season_tournament_id: string }) => b.in_season_tournament_id))]

        if (tidSet.length === 0) {
          skipInSeasonTournaments = true
        } else {
          multiDayQuery  = multiDayQuery.in('id', tidSet)
          singleDayQuery = singleDayQuery.in('id', tidSet)
        }
      }

      // Run all queries in parallel (calendar + postseason always; in-season only if needed)
      const [meetRes, calExactRes, calRangeRes, psMultiRes, psSingleRes] = await Promise.all([
        meetQuery,
        calExactQuery,
        calRangeQuery,
        psMultiQuery,
        psSingleQuery,
      ])

      // Calendar banners — deduplicate by id
      const seenCal = new Set<number>()
      const mergedCal: CalendarEvent[] = []
      for (const e of [...(calExactRes.data ?? []), ...(calRangeRes.data ?? [])]) {
        if (!seenCal.has(e.id)) { seenCal.add(e.id); mergedCal.push(e as CalendarEvent) }
      }
      setCalendarEvents(mergedCal)

      // Postseason tournaments — deduplicate
      const seenPs = new Set<number>()
      const mergedPs: PostseasonTourney[] = []
      for (const t of [...(psMultiRes.data ?? []), ...(psSingleRes.data ?? [])]) {
        const row = t as PostseasonTourney
        if (!seenPs.has(row.id)) { seenPs.add(row.id); mergedPs.push(row) }
      }
      mergedPs.sort((a, b) => a.name.localeCompare(b.name))
      setPostseasonTourneys(mergedPs)

      // Dual meets — split into playoff vs regular
      const allMeets = (meetRes.data ?? []) as unknown as DualMeet[]
      setDualMeets(allMeets.filter(m => !m.is_playoff))
      setPlayoffMeets(allMeets.filter(m => m.is_playoff))

      // In-season tournaments
      if (skipInSeasonTournaments) {
        setTournaments([])
        setTournWinners(new Map())
        return
      }

      const [multiDayRes, singleDayRes] = await Promise.all([multiDayQuery, singleDayQuery])

      const seen = new Set<string>()
      const merged: Tournament[] = []
      for (const t of [...(multiDayRes.data ?? []), ...(singleDayRes.data ?? [])]) {
        const row = t as Tournament
        if (!seen.has(row.id)) { seen.add(row.id); merged.push(row) }
      }
      merged.sort((a, b) => a.name.localeCompare(b.name))
      setTournaments(merged)

      if (merged.length > 0) {
        const { data: wData } = await supabase
          .from('in_season_tournament_team_scores')
          .select('tournament_id, school:schools!school_id(id, display_name, logo_url, header_background)')
          .in('tournament_id', merged.map(t => t.id))
          .eq('place', 1)
        const wMap = new Map<string, TournamentWinner['school']>()
        for (const w of (wData ?? []) as unknown as TournamentWinner[]) {
          wMap.set(w.tournament_id, w.school)
        }
        setTournWinners(wMap)
      } else {
        setTournWinners(new Map())
      }
    } finally {
      setLoading(false)
    }
  }, [date, resolveSchoolIds, supabase, gender])

  useEffect(() => { fetchEvents() }, [fetchEvents])


  const activeFilterCount = selConfs.size + selGroups.size + selSections.size
  const clearFilters = () => { setSelConfs(new Set()); setSelGroups(new Set()); setSelSections(new Set()); setOpenDrop(null) }
  const isFiltered = useMySchools || activeFilterCount > 0

  const router = useRouter()

  const hasAnyContent = postseasonTourneys.length > 0 || playoffMeets.length > 0 || tournaments.length > 0 || dualMeets.length > 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <StdHeader title={`${gender === 'F' ? 'Girls' : 'Boys'} Scores`} summaryKey="schedule" />

      {/* Controls box */}
      <div className="border border-slate-200 bg-slate-50 p-4 mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* Date picker */}
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 rounded-none shrink-0"
          />

          {/* Conference, Group, Section: three dropdowns (Kyle, 2026-11-06). Conference alone; Group and
              Section together */}
          {!useMySchools && (
            <>
              <FilterDrop label="Conference" options={CONFERENCES.map(c => ({ value: c, label: c }))} picked={selConfs}
                onChange={v => { setSelConfs(v); setSelGroups(new Set()); setSelSections(new Set()) }}
                disabled={selGroups.size + selSections.size > 0} open={openDrop === 'c'} setOpen={v => setOpenDrop(v ? 'c' : null)} />
              <FilterDrop label="Group" options={GROUPS} picked={selGroups} onChange={setSelGroups}
                disabled={selConfs.size > 0} open={openDrop === 'g'} setOpen={v => setOpenDrop(v ? 'g' : null)} />
              <FilterDrop label="Section" options={SECTIONS.map(x => ({ value: x, label: x }))} picked={selSections} onChange={setSelSections}
                disabled={selConfs.size > 0} open={openDrop === 's'} setOpen={v => setOpenDrop(v ? 's' : null)} />
            </>
          )}
        </div>

        {/* My Schools + Clear */}
        {(mySchoolIds || isFiltered) && (
          <div className="flex items-center justify-between">
            {mySchoolIds && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useMySchools}
                  onChange={e => {
                    setUseMySchools(e.target.checked)
                    if (e.target.checked) clearFilters()
                  }}
                  className="accent-slate-800"
                />
                <span className="text-sm font-medium text-slate-700">My Schools</span>
                <span className="text-xs text-slate-400">
                  ({mySchools.map(s => s.display_name).join(', ')})
                </span>
              </label>
            )}
            {isFiltered && (
              <button
                onClick={() => {
                  setUseMySchools(false)
                  clearFilters()
                }}
                className="text-xs text-slate-400 hover:text-slate-700 underline ml-auto"
              >
                Clear — show all NJSIAA
              </button>
            )}
          </div>
        )}
      </div>

      {/* NJSIAA Calendar Banners */}
      {calendarEvents.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {calendarEvents.map(ev => (
            <div
              key={ev.id}
              className={`flex items-center gap-2 px-3 py-2 text-sm border-l-4 ${
                /^(team_|individual_|state_)/.test(ev.event_category)
                  ? 'border-amber-500 bg-amber-50 text-amber-900'
                  : 'border-blue-400 bg-blue-50 text-blue-900'
              }`}
            >
              <span className="font-semibold">NJSIAA</span>
              <span className="text-slate-500">·</span>
              <span>{ev.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
      ) : !hasAnyContent ? (
        <div className="border border-slate-200 px-4 py-8 text-center text-slate-400 text-sm">
          No events on this date.
        </div>
      ) : (
        <div className="border border-black rounded-none overflow-x-auto">
          <table className="min-w-max w-full text-[13px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Event / Match</th>
                <th className="px-3 py-1 text-right text-xs font-bold uppercase tracking-wide whitespace-nowrap">Score</th>
                <th className="px-3 py-1 w-6"></th>
              </tr>
            </thead>
            <tbody>

              {/* ── Post Season Tournaments ── */}
              {postseasonTourneys.length > 0 && (
                <>
                  <SectionHeader label="Post Season Tournaments" count={postseasonTourneys.length} />
                  {postseasonTourneys.map((t, i) => (
                    <tr
                      key={t.id}
                      className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                    >
                      <td className="px-3 py-1 font-medium text-slate-800 whitespace-nowrap">
                        {t.name}
                      </td>
                      <td className="px-3 py-1 text-right text-slate-300">—</td>
                      <td className="px-3 py-1"></td>
                    </tr>
                  ))}
                </>
              )}

              {/* ── Team Playoffs ── */}
              {playoffMeets.length > 0 && (
                <>
                  <SectionHeader label="Team Playoffs" count={playoffMeets.length} />
                  {playoffMeets.map((m, i) => {
                    const t1 = m.team1?.display_name ?? 'TBD'
                    const t2 = m.team2?.display_name ?? 'TBD'
                    const hasScore = m.team1_score != null && m.team2_score != null
                    return (
                      <tr
                        key={m.id}
                        onClick={() => router.push(`/meets/${m.id}`)}
                        className={`border-t border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                      >
                        <td className="px-3 py-1 whitespace-nowrap">
                          <Link href={`/meets/${m.id}`} className="font-medium text-slate-800 hover:underline" onClick={e => e.stopPropagation()}>
                            <SchoolTagView id={m.team1?.id} name={t1} badge={badgeOfSchool(m.team1)} className="" />
                          </Link>
                          <span className="text-slate-400 mx-1.5 text-xs">vs</span>
                          <Link href={`/meets/${m.id}`} className="font-medium text-slate-800 hover:underline" onClick={e => e.stopPropagation()}>
                            <SchoolTagView id={m.team2?.id} name={t2} badge={badgeOfSchool(m.team2)} className="" />
                          </Link>
                        </td>
                        <td className="px-3 py-1 text-right font-mono text-slate-500 whitespace-nowrap tabular-nums">
                          {hasScore ? `${m.team1_score}–${m.team2_score}` : '—'}
                        </td>
                        <td className="px-3 py-1 text-right text-slate-300 text-xs">→</td>
                      </tr>
                    )
                  })}
                </>
              )}

              {/* ── Tournaments (in-season) ── */}
              {tournaments.length > 0 && (
                <>
                  <SectionHeader label="Tournaments" count={tournaments.length} />
                  {tournaments.map((t, i) => (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/tournaments/${t.id}`)}
                      className={`border-t border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                    >
                      <td className="px-3 py-1 font-medium text-slate-800 whitespace-nowrap">
                        <Link href={`/tournaments/${t.id}`} className="hover:underline" onClick={e => e.stopPropagation()}>
                          {t.name}
                        </Link>
                      </td>
                      <td className="px-3 py-1 text-right text-slate-600 whitespace-nowrap">
                        {tournWinners.get(t.id)
                          ? <SchoolTagView id={tournWinners.get(t.id)!.id} name={tournWinners.get(t.id)!.display_name} badge={badgeOfSchool(tournWinners.get(t.id))} className="" />
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-1 text-right text-slate-300 text-xs">→</td>
                    </tr>
                  ))}
                </>
              )}

              {/* ── Dual Meets ── */}
              {dualMeets.length > 0 && (
                <>
                  <SectionHeader label="Dual Meets" count={dualMeets.length} />
                  {dualMeets.map((m, i) => {
                    const t1 = m.team1?.display_name ?? 'TBD'
                    const t2 = m.team2?.display_name ?? 'TBD'
                    const hasScore = m.team1_score != null && m.team2_score != null
                    return (
                      <tr
                        key={m.id}
                        onClick={() => router.push(`/meets/${m.id}`)}
                        className={`border-t border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                      >
                        <td className="px-3 py-1 whitespace-nowrap">
                          <Link href={`/meets/${m.id}`} className="font-medium text-slate-800 hover:underline" onClick={e => e.stopPropagation()}>
                            <SchoolTagView id={m.team1?.id} name={t1} badge={badgeOfSchool(m.team1)} className="" />
                          </Link>
                          <span className="text-slate-400 mx-1.5 text-xs">vs</span>
                          <Link href={`/meets/${m.id}`} className="font-medium text-slate-800 hover:underline" onClick={e => e.stopPropagation()}>
                            <SchoolTagView id={m.team2?.id} name={t2} badge={badgeOfSchool(m.team2)} className="" />
                          </Link>
                        </td>
                        <td className="px-3 py-1 text-right font-mono text-slate-500 whitespace-nowrap tabular-nums">
                          {hasScore ? `${m.team1_score}–${m.team2_score}` : '—'}
                        </td>
                        <td className="px-3 py-1 text-right text-slate-300 text-xs">→</td>
                      </tr>
                    )
                  })}
                </>
              )}

            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
