'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { getAllConferences } from '@/lib/conferences'
import { getAllSections, getAllGroups } from '@/lib/sections'

// ── Types ─────────────────────────────────────────────────────────────────────

type SchoolRow = { id: number; display_name: string }

type DualMeet = {
  id: string
  meet_date: string
  team1_score: number | null
  team2_score: number | null
  status: string
  team1: { id: number; display_name: string } | null
  team2: { id: number; display_name: string } | null
  team1_school_name_raw: string | null
  team2_school_name_raw: string | null
}

type Tournament = {
  id: string
  name: string
  start_date: string
  end_date: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONFERENCES = getAllConferences().map(c => c.name)
const SECTIONS    = getAllSections().map(s => s.name)
const GROUPS      = getAllGroups().map(g => ({ value: g.name, label: g.label }))

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Filter panel ──────────────────────────────────────────────────────────────

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: Set<string>
  onChange: (v: Set<string>) => void
}) {
  const toggle = (v: string) => {
    const next = new Set(selected)
    next.has(v) ? next.delete(v) : next.add(v)
    onChange(next)
  }

  return (
    <div className="mt-1.5">
      <div className="border border-slate-200 bg-white max-h-44 overflow-y-auto divide-y divide-slate-100">
        {options.map(o => (
          <label key={o.value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.has(o.value)}
              onChange={() => toggle(o.value)}
              className="accent-slate-800"
            />
            <span className="text-xs text-slate-700">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ── Event card: tournament ─────────────────────────────────────────────────────

function TournamentCard({ t }: { t: Tournament }) {
  const dateLabel = t.end_date && t.end_date !== t.start_date
    ? `${fmtDate(t.start_date)}–${fmtDate(t.end_date)}`
    : fmtDate(t.start_date)

  return (
    <Link
      href={`/tournaments/${t.id}`}
      className="flex items-center justify-between px-3 py-2.5 border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition-colors group"
    >
      <div>
        <p className="text-sm font-medium text-slate-800 group-hover:text-slate-900">{t.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{dateLabel}</p>
      </div>
      <span className="text-slate-300 group-hover:text-slate-500 text-sm">→</span>
    </Link>
  )
}

// ── Event card: dual meet ──────────────────────────────────────────────────────

function DualMeetCard({ m }: { m: DualMeet }) {
  const t1Name = m.team1?.display_name ?? m.team1_school_name_raw ?? '?'
  const t2Name = m.team2?.display_name ?? m.team2_school_name_raw ?? '?'
  const hasScore = m.team1_score != null && m.team2_score != null

  return (
    <Link
      href={`/meets/${m.id}`}
      className="flex items-center justify-between px-3 py-2.5 border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition-colors group"
    >
      <div className="flex items-baseline gap-2 flex-wrap min-w-0">
        <span className="text-sm font-medium text-slate-800 truncate">{t1Name}</span>
        <span className="text-xs text-slate-400">vs</span>
        <span className="text-sm font-medium text-slate-800 truncate">{t2Name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        {hasScore && (
          <span className="text-xs font-mono text-slate-500">
            {m.team1_score}–{m.team2_score}
          </span>
        )}
        <span className="text-slate-300 group-hover:text-slate-500 text-sm">→</span>
      </div>
    </Link>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ScheduleClient() {
  const supabase = useMemo(() => createSupabaseBrowser(), [])

  const [date, setDate]           = useState(todayLocal)
  const [loading, setLoading]     = useState(false)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [dualMeets, setDualMeets] = useState<DualMeet[]>([])

  // Filter state
  const [confChecked,    setConfChecked]    = useState(false)
  const [groupChecked,   setGroupChecked]   = useState(false)
  const [sectionChecked, setSectionChecked] = useState(false)
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
        // Fetch names for display
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

    const hasConf    = confChecked    && selConfs.size > 0
    const hasGroup   = groupChecked   && selGroups.size > 0
    const hasSection = sectionChecked && selSections.size > 0

    if (!hasConf && !hasGroup && !hasSection) return null // all NJSIAA

    const parts: string[] = []
    for (const c of selConfs)    parts.push(`athletic_conference.eq.${c}`)
    for (const g of selGroups)   parts.push(`classification.eq.${g}`)
    for (const s of selSections) parts.push(`section.eq.${s}`)

    const { data } = await supabase
      .from('schools')
      .select('id')
      .eq('is_nj', true)
      .or(parts.join(','))

    return (data ?? []).map((r: { id: number }) => r.id)
  }, [useMySchools, mySchoolIds, confChecked, selConfs, groupChecked, selGroups, sectionChecked, selSections, supabase])

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const schoolIds = await resolveSchoolIds()

      // Tournaments spanning the selected date:
      //   multi-day: start_date <= date <= end_date
      //   single-day (no end_date): start_date = date
      let tourQuery = supabase
        .from('in_season_tournaments')
        .select('id, name, start_date, end_date')
        .or(`and(end_date.gte.${date},start_date.lte.${date}),and(end_date.is.null,start_date.eq.${date})`)
        .order('name')

      // Dual meets: on the exact date
      let meetQuery = supabase
        .from('dual_meets')
        .select(`
          id, meet_date, team1_score, team2_score, status,
          team1:schools!team1_school_id(id, display_name),
          team2:schools!team2_school_id(id, display_name),
          team1_school_name_raw, team2_school_name_raw
        `)
        .eq('meet_date', date)
        .order('meet_date')

      if (schoolIds !== null) {
        // For dual meets: filter to school set
        meetQuery = meetQuery.or(
          schoolIds.map(id => `team1_school_id.eq.${id},team2_school_id.eq.${id}`).join(',')
        )

        // For tournaments: find ones with participants in the school set
        const { data: boutSchools } = await supabase
          .from('tournament_bouts')
          .select('in_season_tournament_id')
          .or(schoolIds.map(id => `wrestler1_school_id.eq.${id},wrestler2_school_id.eq.${id}`).join(','))

        const tidSet = [...new Set((boutSchools ?? []).map((b: { in_season_tournament_id: string }) => b.in_season_tournament_id))]
        if (tidSet.length > 0) {
          tourQuery = tourQuery.in('id', tidSet)
        } else {
          setTournaments([])
          const { data: meets } = await meetQuery
          setDualMeets((meets ?? []) as unknown as DualMeet[])
          return
        }
      }

      const [tourRes, meetRes] = await Promise.all([tourQuery, meetQuery])
      setTournaments((tourRes.data ?? []) as Tournament[])
      setDualMeets((meetRes.data ?? []) as unknown as DualMeet[])
    } finally {
      setLoading(false)
    }
  }, [date, resolveSchoolIds, supabase])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // When checkboxes are unchecked, clear their selections
  useEffect(() => { if (!confChecked)    setSelConfs(new Set())    }, [confChecked])
  useEffect(() => { if (!groupChecked)   setSelGroups(new Set())   }, [groupChecked])
  useEffect(() => { if (!sectionChecked) setSelSections(new Set()) }, [sectionChecked])

  const activeFilterCount = (confChecked ? selConfs.size : 0) + (groupChecked ? selGroups.size : 0) + (sectionChecked ? selSections.size : 0)
  const isFiltered = useMySchools || activeFilterCount > 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Schedule</h1>
      <p className="text-slate-500 text-sm mb-6">Dual meets and tournaments by date.</p>

      {/* Date + filter row */}
      <div className="flex flex-wrap gap-3 items-start mb-6">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 rounded-none"
        />
      </div>

      {/* Filter panel */}
      <div className="border border-slate-200 bg-slate-50 p-4 mb-6 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filter schools</p>
          {isFiltered && (
            <button
              onClick={() => {
                setUseMySchools(false)
                setConfChecked(false)
                setGroupChecked(false)
                setSectionChecked(false)
              }}
              className="text-xs text-slate-400 hover:text-slate-700 underline"
            >
              Clear — show all NJSIAA
            </button>
          )}
        </div>

        {/* My Schools preset */}
        {mySchoolIds && (
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useMySchools}
                onChange={e => {
                  setUseMySchools(e.target.checked)
                  if (e.target.checked) {
                    setConfChecked(false)
                    setGroupChecked(false)
                    setSectionChecked(false)
                  }
                }}
                className="accent-slate-800"
              />
              <span className="text-sm font-medium text-slate-700">My Schools</span>
              <span className="text-xs text-slate-400">
                ({mySchools.map(s => s.display_name).join(', ')})
              </span>
            </label>
          </div>
        )}

        {!useMySchools && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Conference */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confChecked}
                  onChange={e => setConfChecked(e.target.checked)}
                  className="accent-slate-800"
                />
                <span className="text-sm font-medium text-slate-700">Conference</span>
                {selConfs.size > 0 && (
                  <span className="text-xs text-slate-400">({selConfs.size})</span>
                )}
              </label>
              {confChecked && (
                <MultiSelect
                  label="Conference"
                  options={CONFERENCES.map(c => ({ value: c, label: c }))}
                  selected={selConfs}
                  onChange={setSelConfs}
                />
              )}
            </div>

            {/* Group */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupChecked}
                  onChange={e => setGroupChecked(e.target.checked)}
                  className="accent-slate-800"
                />
                <span className="text-sm font-medium text-slate-700">Group</span>
                {selGroups.size > 0 && (
                  <span className="text-xs text-slate-400">({selGroups.size})</span>
                )}
              </label>
              {groupChecked && (
                <MultiSelect
                  label="Group"
                  options={GROUPS.map(g => ({ value: g.value, label: g.label }))}
                  selected={selGroups}
                  onChange={setSelGroups}
                />
              )}
            </div>

            {/* Section */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sectionChecked}
                  onChange={e => setSectionChecked(e.target.checked)}
                  className="accent-slate-800"
                />
                <span className="text-sm font-medium text-slate-700">Section</span>
                {selSections.size > 0 && (
                  <span className="text-xs text-slate-400">({selSections.size})</span>
                )}
              </label>
              {sectionChecked && (
                <MultiSelect
                  label="Section"
                  options={SECTIONS.map(s => ({ value: s, label: s }))}
                  selected={selSections}
                  onChange={setSelSections}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading…</div>
      ) : (
        <div className="space-y-8">
          {/* Tournaments */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              Tournaments{tournaments.length > 0 ? ` — ${tournaments.length}` : ''}
            </h2>
            {tournaments.length > 0 ? (
              <div className="space-y-1.5">
                {tournaments.map(t => <TournamentCard key={t.id} t={t} />)}
              </div>
            ) : (
              <p className="text-sm text-slate-400 border border-slate-200 px-4 py-6 text-center bg-white">
                No tournaments on this date.
              </p>
            )}
          </section>

          {/* Dual meets */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
              Dual Meets{dualMeets.length > 0 ? ` — ${dualMeets.length}` : ''}
            </h2>
            {dualMeets.length > 0 ? (
              <div className="space-y-1.5">
                {dualMeets.map(m => <DualMeetCard key={m.id} m={m} />)}
              </div>
            ) : (
              <p className="text-sm text-slate-400 border border-slate-200 px-4 py-6 text-center bg-white">
                No dual meets on this date.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
