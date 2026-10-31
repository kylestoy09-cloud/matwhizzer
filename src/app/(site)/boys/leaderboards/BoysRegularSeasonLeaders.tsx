'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { getAllConferences } from '@/lib/conferences'
import { getAllSections, getAllGroups } from '@/lib/sections'
import { fmtTime, SectionHeader } from '@/components/leaderboard-ui'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'
import { RATING_NAME, RATING_SHORT } from '@/lib/rating'

const WEIGHTS        = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]
const N_WEIGHTS      = 14
const WEIGHT_STRINGS = WEIGHTS.map(String)

type WRow = {
  wrestler_id: string
  wrestler_name: string
  school_id: number
  school_name: string
  section: string | null
  classification: string | null
  athletic_conference: string | null
  logo_url: string | null
  color_primary: string | null
  pin_count: number
  fastest_pin: number | null
  fastest_pin_wt: number | null
  pin_total_time: number
  tf_count: number
  fastest_tf: number | null
  fastest_tf_wt: number | null
  tf_total_time: number
  bonus_wins: number
  contested_matches: number
  total_matches: number
  hammer_score: number | null
  weight_class: number | null
  grade: string | null
}

type TRow = {
  school_id: number
  school_name: string
  section: string | null
  classification: string | null
  athletic_conference: string | null
  logo_url: string | null
  color_primary: string | null
  dual_pin_count: number
  tournament_pin_count: number
  pin_count: number
  fastest_pin: number | null
  pin_total_time: number
  dual_tf_count: number
  tournament_tf_count: number
  tf_count: number
  fastest_tf: number | null
  tf_total_time: number
  dual_bonus_wins: number
  tournament_bonus_wins: number
  bonus_wins: number
  contested_matches: number
  total_matches: number
  dual_meet_count: number
  dual_team_points: number
}

const CONFERENCES  = getAllConferences().map(c => c.name)
const SECTIONS     = getAllSections().map(s => s.name)
const GROUPS       = getAllGroups()
const GROUP_VALUES = GROUPS.map(g => g.name)
const MIN_MATCHES  = 5

function passesFilter(
  row: { section: string | null; classification: string | null; athletic_conference: string | null },
  selConfs: Set<string>, selSections: Set<string>, selGroups: Set<string>,
): boolean {
  const allConfs = selConfs.size === 0 || selConfs.size === CONFERENCES.length
  const allSecs  = selSections.size === 0 || selSections.size === SECTIONS.length
  const allGrps  = selGroups.size === 0 || selGroups.size === GROUP_VALUES.length
  if (allConfs && allSecs && allGrps) return true
  const confOk = allConfs || (!!row.athletic_conference && selConfs.has(row.athletic_conference))
  const secOk  = allSecs  || (!!row.section && selSections.has(row.section))
  const grpOk  = allGrps  || (!!row.classification && selGroups.has(row.classification))
  return confOk && secOk && grpOk
}

function MultiSelect({
  label, options, selected, onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: Set<string>
  onChange: (v: Set<string>) => void
}) {
  const allSelected = selected.size === options.length
  function toggle(v: string) {
    const next = new Set(selected)
    next.has(v) ? next.delete(v) : next.add(v)
    onChange(next)
  }
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <button
          onClick={() => onChange(allSelected ? new Set() : new Set(options.map(o => o.value)))}
          className="text-[11px] text-slate-400 hover:text-slate-700 underline"
        >
          {allSelected ? 'Clear' : 'All'}
        </button>
      </div>
      <div className="border border-slate-200 bg-white max-h-40 overflow-y-auto divide-y divide-slate-100">
        {options.map(o => (
          <label key={o.value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" checked={selected.has(o.value)} onChange={() => toggle(o.value)} className="accent-slate-800 shrink-0" />
            <span className="text-xs text-slate-700">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

type Col<T> = {
  label: string
  align: 'left' | 'right'
  render: (r: T) => React.ReactNode
  sortKey?: (r: T) => number | string
}

function RSTable<T extends object>({
  title, description, rows, cols,
}: {
  title: string
  description?: string
  rows: T[]
  cols: Col<T>[]
}) {
  const [sortIdx, setSortIdx] = useState<number | null>(null)
  const [sortDesc, setSortDesc] = useState(true)

  const displayed = useMemo(() => {
    if (sortIdx === null || !cols[sortIdx]?.sortKey) return rows.slice(0, 25)
    const key = cols[sortIdx].sortKey!
    return [...rows].sort((a, b) => {
      const av = key(a), bv = key(b)
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sortDesc ? -cmp : cmp
    }).slice(0, 25)
  }, [rows, sortIdx, sortDesc, cols])

  function handleSort(idx: number) {
    if (!cols[idx]?.sortKey) return
    if (sortIdx === idx) setSortDesc(d => !d)
    else { setSortIdx(idx); setSortDesc(true) }
  }

  return (
    <section>
      <SectionHeader title={title} description={description} />
      <div className="border border-black overflow-x-auto bg-white">
        <table className="w-full text-sm min-w-[380px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-3 py-1 font-medium text-slate-500 w-8">#</th>
              {cols.map((c, i) => (
                <th
                  key={c.label}
                  onClick={() => handleSort(i)}
                  className={`px-3 py-1 font-medium text-slate-500 select-none ${c.align === 'right' ? 'text-right' : 'text-left'} ${c.sortKey ? 'cursor-pointer hover:text-slate-800' : ''}`}
                >
                  {c.label}
                  {c.sortKey && (
                    <span className="ml-1 text-[10px] opacity-60">
                      {sortIdx === i ? (sortDesc ? '▼' : '▲') : '⇅'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayed.length === 0 ? (
              <tr><td colSpan={cols.length + 1} className="px-3 py-4 text-center text-slate-400 text-xs">No data</td></tr>
            ) : displayed.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-1 text-slate-400 text-xs tabular-nums">{i + 1}</td>
                {cols.map(c => (
                  <td key={c.label} className={`px-3 py-1 ${c.align === 'right' ? 'text-right' : ''}`}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function WCell({ id, name, school, logoUrl, bgColor }: {
  id: string; name: string; school: string; logoUrl?: string | null; bgColor?: string | null
}) {
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <SchoolLogoBadge logoUrl={logoUrl} bgColor={bgColor} />
      <Link href={`/boys/wrestler/${id}`} className="font-medium text-slate-800 hover:text-slate-600 truncate">{name}</Link>
      <span className="text-slate-400 text-xs shrink-0">{school}</span>
    </span>
  )
}

function SCell({ id, name, logoUrl, bgColor }: {
  id: number; name: string; logoUrl?: string | null; bgColor?: string | null
}) {
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <SchoolLogoBadge logoUrl={logoUrl} bgColor={bgColor} />
      <Link href={`/boys/schools/${id}`} className="font-medium text-slate-800 hover:text-slate-600 truncate">{name}</Link>
    </span>
  )
}

const GRADE_ORDER = ['Fr', 'So', 'Jr', 'Sr']
const GRADE_LABELS: Record<string, string> = { Fr: 'Freshman', So: 'Sophomore', Jr: 'Junior', Sr: 'Senior' }

function IndividualTab({ rows, blurb }: { rows: WRow[]; blurb: string }) {
  const [wt, setWt]       = useState<number | 'all'>('all')
  const [gr, setGr]       = useState<string | 'all'>('all')
  const weightSet = useMemo(() => new Set(WEIGHTS), [])

  const availWeights = useMemo(() => {
    const s = new Set<number>()
    for (const r of rows) {
      if (r.weight_class != null && weightSet.has(r.weight_class)) s.add(r.weight_class)
    }
    return WEIGHTS.filter(w => s.has(w))
  }, [rows, weightSet])

  const availGrades = useMemo(() =>
    GRADE_ORDER.filter(g => rows.some(r => r.grade === g)), [rows])

  const filtered = useMemo(() => {
    let out = rows
    if (wt !== 'all') out = out.filter(r => r.weight_class === wt)
    if (gr !== 'all') out = out.filter(r => r.grade === gr)
    return out
  }, [rows, wt, gr])

  const quickDeck = useMemo(() =>
    [...filtered].filter(r => r.fastest_pin !== null)
      .sort((a, b) => a.fastest_pin! - b.fastest_pin!), [filtered])

  const quickTech = useMemo(() =>
    [...filtered].filter(r => r.fastest_tf !== null)
      .sort((a, b) => a.fastest_tf! - b.fastest_tf!), [filtered])

  const mostPins = useMemo(() =>
    [...filtered].filter(r => r.pin_count > 0)
      .sort((a, b) =>
        b.pin_count - a.pin_count ||
        (a.pin_count > 0 && b.pin_count > 0
          ? a.pin_total_time / a.pin_count - b.pin_total_time / b.pin_count
          : 0)), [filtered])

  const mostTf = useMemo(() =>
    [...filtered].filter(r => r.tf_count > 0)
      .sort((a, b) =>
        b.tf_count - a.tf_count ||
        (a.tf_count > 0 && b.tf_count > 0
          ? a.tf_total_time / a.tf_count - b.tf_total_time / b.tf_count
          : 0)), [filtered])

  const bonusPct = useMemo(() =>
    [...filtered].filter(r => r.total_matches >= MIN_MATCHES)
      .sort((a, b) => b.bonus_wins / b.total_matches - a.bonus_wins / a.total_matches), [filtered])

  const hammer = useMemo(() =>
    [...filtered].filter(r => (r.hammer_score ?? 0) > 0)
      .sort((a, b) => (b.hammer_score ?? 0) - (a.hammer_score ?? 0)), [filtered])

  return (
    <div className="space-y-10">
      {availWeights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...availWeights] as const).map(w => (
            <button
              key={w}
              onClick={() => setWt(w as number | 'all')}
              className={`px-3 py-1 text-xs font-semibold border transition-colors ${
                wt === w
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-900'
              }`}
            >
              {w === 'all' ? 'All Weights' : w}
            </button>
          ))}
        </div>
      )}

      {availGrades.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...availGrades] as const).map(g => (
            <button
              key={g}
              onClick={() => setGr(g as string | 'all')}
              className={`px-3 py-1 text-xs font-semibold border transition-colors ${
                gr === g
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-900'
              }`}
            >
              {g === 'all' ? 'All Classes' : GRADE_LABELS[g] ?? g}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RSTable<WRow>
          title="Quickest Deck"
          description="Fastest single fall this regular season"
          rows={quickDeck}
          cols={[
            { label: 'Wrestler', align: 'left', render: r => <WCell id={r.wrestler_id} name={r.wrestler_name} school={r.school_name} logoUrl={r.logo_url} bgColor={r.color_primary} /> },
            { label: 'Wt', align: 'right', render: r => <span className="text-slate-500 tabular-nums">{r.fastest_pin_wt}</span> },
            { label: 'Time', align: 'right', sortKey: r => r.fastest_pin ?? 999999, render: r => <span className="font-bold text-slate-800 tabular-nums font-mono">{fmtTime(r.fastest_pin!)}</span> },
          ]}
        />
        <RSTable<WRow>
          title="Quickest Tech"
          description="Fastest single tech fall this regular season"
          rows={quickTech}
          cols={[
            { label: 'Wrestler', align: 'left', render: r => <WCell id={r.wrestler_id} name={r.wrestler_name} school={r.school_name} logoUrl={r.logo_url} bgColor={r.color_primary} /> },
            { label: 'Wt', align: 'right', render: r => <span className="text-slate-500 tabular-nums">{r.fastest_tf_wt}</span> },
            { label: 'Time', align: 'right', sortKey: r => r.fastest_tf ?? 999999, render: r => <span className="font-bold text-slate-800 tabular-nums font-mono">{fmtTime(r.fastest_tf!)}</span> },
          ]}
        />
        <RSTable<WRow>
          title="Most Pins"
          description="Total falls — avg time as tiebreaker"
          rows={mostPins}
          cols={[
            { label: 'Wrestler', align: 'left', render: r => <WCell id={r.wrestler_id} name={r.wrestler_name} school={r.school_name} logoUrl={r.logo_url} bgColor={r.color_primary} /> },
            { label: 'Pins', align: 'right', sortKey: r => r.pin_count, render: r => <span className="font-bold text-slate-800 tabular-nums">{r.pin_count}</span> },
            { label: 'Avg', align: 'right', sortKey: r => r.pin_count > 0 ? r.pin_total_time / r.pin_count : 999999, render: r => <span className="text-slate-500 tabular-nums text-xs">{r.pin_count > 0 ? fmtTime(Math.round(r.pin_total_time / r.pin_count)) : '—'}</span> },
          ]}
        />
        <RSTable<WRow>
          title="Most Techs"
          description="Total tech falls — avg time as tiebreaker"
          rows={mostTf}
          cols={[
            { label: 'Wrestler', align: 'left', render: r => <WCell id={r.wrestler_id} name={r.wrestler_name} school={r.school_name} logoUrl={r.logo_url} bgColor={r.color_primary} /> },
            { label: 'TFs', align: 'right', sortKey: r => r.tf_count, render: r => <span className="font-bold text-slate-800 tabular-nums">{r.tf_count}</span> },
            { label: 'Avg', align: 'right', sortKey: r => r.tf_count > 0 ? r.tf_total_time / r.tf_count : 999999, render: r => <span className="text-slate-500 tabular-nums text-xs">{r.tf_count > 0 ? fmtTime(Math.round(r.tf_total_time / r.tf_count)) : '—'}</span> },
          ]}
        />
        <RSTable<WRow>
          title="Bonus Point %"
          description={`Bonus wins (Fall + TF + MD) ÷ total matches — min ${MIN_MATCHES} matches`}
          rows={bonusPct}
          cols={[
            { label: 'Wrestler', align: 'left', render: r => <WCell id={r.wrestler_id} name={r.wrestler_name} school={r.school_name} logoUrl={r.logo_url} bgColor={r.color_primary} /> },
            { label: 'Pct', align: 'right', sortKey: r => r.total_matches > 0 ? r.bonus_wins / r.total_matches : 0, render: r => <span className="font-bold text-slate-800 tabular-nums">{r.total_matches > 0 ? (r.bonus_wins / r.total_matches * 100).toFixed(1) : '0.0'}%</span> },
          ]}
        />
        <RSTable<WRow>
          title={RATING_NAME}
          description={blurb}
          rows={hammer}
          cols={[
            { label: 'Wrestler', align: 'left', render: r => <WCell id={r.wrestler_id} name={r.wrestler_name} school={r.school_name} logoUrl={r.logo_url} bgColor={r.color_primary} /> },
            { label: RATING_SHORT, align: 'right', sortKey: r => r.hammer_score ?? 0, render: r => <span className="font-bold text-slate-800 tabular-nums">{r.hammer_score?.toFixed(1) ?? '—'}</span> },
          ]}
        />
      </div>
    </div>
  )
}

const MIN_TEAM_MATCHES = 30

function TeamTab({ rows, teamHammerScores }: { rows: TRow[]; teamHammerScores: Map<number, number> }) {
  const mostPins = useMemo(() =>
    [...rows].filter(r => r.pin_count > 0 && r.contested_matches >= MIN_TEAM_MATCHES)
      .sort((a, b) =>
        b.pin_count - a.pin_count ||
        (a.pin_count > 0 && b.pin_count > 0
          ? a.pin_total_time / a.pin_count - b.pin_total_time / b.pin_count
          : 0)), [rows])

  const mostTf = useMemo(() =>
    [...rows].filter(r => r.tf_count > 0 && r.contested_matches >= MIN_TEAM_MATCHES)
      .sort((a, b) =>
        b.tf_count - a.tf_count ||
        (a.tf_count > 0 && b.tf_count > 0
          ? a.tf_total_time / a.tf_count - b.tf_total_time / b.tf_count
          : 0)), [rows])

  const bonusPct = useMemo(() =>
    [...rows].filter(r => (r.contested_matches ?? 0) >= MIN_TEAM_MATCHES)
      .sort((a, b) => b.bonus_wins / b.total_matches - a.bonus_wins / a.total_matches), [rows])

  const hammer = useMemo(() =>
    [...rows]
      .filter(r => (teamHammerScores.get(r.school_id) ?? 0) > 0)
      .sort((a, b) => (teamHammerScores.get(b.school_id) ?? 0) - (teamHammerScores.get(a.school_id) ?? 0)), [rows, teamHammerScores])

  const MIN_DUALS = 5
  const ppd = useMemo(() =>
    [...rows].filter(r => (r.dual_meet_count ?? 0) >= MIN_DUALS)
      .sort((a, b) => b.dual_team_points / b.dual_meet_count - a.dual_team_points / a.dual_meet_count), [rows])

  function pct(num: number, den: number) {
    if (!den || !isFinite(num / den)) return '—'
    return (num / den * 100).toFixed(1) + '%'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <RSTable<TRow>
        title="Most Pins"
        description={`Team total falls — sorted by total, avg time as tiebreaker — min ${MIN_TEAM_MATCHES} contested matches`}
        rows={mostPins}
        cols={[
          { label: 'School', align: 'left', render: r => <SCell id={r.school_id} name={r.school_name} logoUrl={r.logo_url} bgColor={r.color_primary} /> },
          { label: 'Dual', align: 'right', sortKey: r => r.dual_pin_count, render: r => <span className="text-slate-500 tabular-nums">{r.dual_pin_count}</span> },
          { label: 'Tourn', align: 'right', sortKey: r => r.tournament_pin_count, render: r => <span className="text-slate-500 tabular-nums">{r.tournament_pin_count}</span> },
          { label: 'Total', align: 'right', sortKey: r => r.pin_count, render: r => <span className="font-bold text-slate-800 tabular-nums">{r.pin_count}</span> },
          { label: 'Pin%', align: 'right', sortKey: r => r.contested_matches > 0 ? r.pin_count / r.contested_matches : 0, render: r => <span className="text-slate-500 tabular-nums text-xs">{pct(r.pin_count, r.contested_matches)}</span> },
        ]}
      />
      <RSTable<TRow>
        title="Most Techs"
        description={`Team total tech falls — sorted by total, avg time as tiebreaker — min ${MIN_TEAM_MATCHES} contested matches`}
        rows={mostTf}
        cols={[
          { label: 'School', align: 'left', render: r => <SCell id={r.school_id} name={r.school_name} logoUrl={r.logo_url} bgColor={r.color_primary} /> },
          { label: 'Dual', align: 'right', sortKey: r => r.dual_tf_count, render: r => <span className="text-slate-500 tabular-nums">{r.dual_tf_count}</span> },
          { label: 'Tourn', align: 'right', sortKey: r => r.tournament_tf_count, render: r => <span className="text-slate-500 tabular-nums">{r.tournament_tf_count}</span> },
          { label: 'Total', align: 'right', sortKey: r => r.tf_count, render: r => <span className="font-bold text-slate-800 tabular-nums">{r.tf_count}</span> },
          { label: 'TF%', align: 'right', sortKey: r => r.contested_matches > 0 ? r.tf_count / r.contested_matches : 0, render: r => <span className="text-slate-500 tabular-nums text-xs">{pct(r.tf_count, r.contested_matches)}</span> },
        ]}
      />
      <RSTable<TRow>
        title="Bonus Point %"
        description={`Pins + TFs + MDs ÷ total matches — min ${MIN_MATCHES}`}
        rows={bonusPct}
        cols={[
          { label: 'School', align: 'left', render: r => <SCell id={r.school_id} name={r.school_name} logoUrl={r.logo_url} bgColor={r.color_primary} /> },
          { label: 'Bonus%', align: 'right', sortKey: r => r.total_matches > 0 ? r.bonus_wins / r.total_matches : 0, render: r => <span className="font-bold text-blue-700 tabular-nums">{pct(r.bonus_wins, r.total_matches)}</span> },
        ]}
      />
      <RSTable<TRow>
        title={`Team ${RATING_NAME}`}
        description={`Best ${RATING_SHORT} at each weight class, summed across all ${N_WEIGHTS} weights ÷ ${N_WEIGHTS}`}
        rows={hammer}
        cols={[
          { label: 'School', align: 'left', render: r => <SCell id={r.school_id} name={r.school_name} logoUrl={r.logo_url} bgColor={r.color_primary} /> },
          {
            label: RATING_SHORT, align: 'right',
            sortKey: r => teamHammerScores.get(r.school_id) ?? 0,
            render: r => <span className="font-bold text-slate-800 tabular-nums">{(teamHammerScores.get(r.school_id) ?? 0).toFixed(2)}</span>,
          },
        ]}
      />
      <RSTable<TRow>
        title="Points Per Dual"
        description={`Avg team score per dual meet (F=6, TF=5, MD=4, Dec=3, For=6) — min ${MIN_DUALS} duals`}
        rows={ppd}
        cols={[
          { label: 'School', align: 'left', render: r => <SCell id={r.school_id} name={r.school_name} logoUrl={r.logo_url} bgColor={r.color_primary} /> },
          { label: 'Duals', align: 'right', sortKey: r => r.dual_meet_count, render: r => <span className="text-slate-500 tabular-nums">{r.dual_meet_count}</span> },
          { label: 'Total Pts', align: 'right', sortKey: r => r.dual_team_points, render: r => <span className="text-slate-500 tabular-nums">{r.dual_team_points}</span> },
          { label: 'Pts/Dual', align: 'right', sortKey: r => r.dual_meet_count > 0 ? r.dual_team_points / r.dual_meet_count : 0, render: r => <span className="font-bold text-slate-800 tabular-nums">{(r.dual_team_points / r.dual_meet_count).toFixed(1)}</span> },
        ]}
      />
    </div>
  )
}

// blurb: the rating's bio, edited on the admin rating page
export function BoysRegularSeasonLeaders({ seasonId, blurb }: { seasonId: number; blurb: string }) {

  const [wrestlers,        setWrestlers]        = useState<WRow[]>([])
  const [teams,            setTeams]            = useState<TRow[]>([])
  const [teamHammerScores, setTeamHammerScores] = useState<Map<number, number>>(new Map())
  const [loading,          setLoading]          = useState(true)
  const [sub,              setSub]              = useState<'team' | 'individual'>('team')

  const [stagedConfs,    setStagedConfs]    = useState<Set<string>>(() => new Set(CONFERENCES))
  const [stagedSections, setStagedSections] = useState<Set<string>>(() => new Set(SECTIONS))
  const [stagedGroups,   setStagedGroups]   = useState<Set<string>>(() => new Set(GROUP_VALUES))

  const [appliedConfs,    setAppliedConfs]    = useState<Set<string>>(() => new Set(CONFERENCES))
  const [appliedSections, setAppliedSections] = useState<Set<string>>(() => new Set(SECTIONS))
  const [appliedGroups,   setAppliedGroups]   = useState<Set<string>>(() => new Set(GROUP_VALUES))

  const hasPendingChanges =
    [...stagedConfs].sort().join() !== [...appliedConfs].sort().join() ||
    [...stagedSections].sort().join() !== [...appliedSections].sort().join() ||
    [...stagedGroups].sort().join() !== [...appliedGroups].sort().join()

  function applyFilters() {
    setAppliedConfs(new Set(stagedConfs))
    setAppliedSections(new Set(stagedSections))
    setAppliedGroups(new Set(stagedGroups))
  }

  function resetFilters() {
    setStagedConfs(new Set(CONFERENCES))
    setStagedSections(new Set(SECTIONS))
    setStagedGroups(new Set(GROUP_VALUES))
    setAppliedConfs(new Set(CONFERENCES))
    setAppliedSections(new Set(SECTIONS))
    setAppliedGroups(new Set(GROUP_VALUES))
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const leadersJson = await fetch(`/api/rs-leaders?season_id=${seasonId}&gender=M`).then(r => r.json())
      if (cancelled) return

      const hammerMax = (leadersJson.hammerMax ?? []) as { school_id: number; weight_class: string; hammer_score: number }[]
      if (hammerMax.length > 0) {
        const schoolWeightMax = new Map<number, Map<string, number>>()
        for (const row of hammerMax) {
          if (!schoolWeightMax.has(row.school_id)) schoolWeightMax.set(row.school_id, new Map())
          schoolWeightMax.get(row.school_id)!.set(row.weight_class, row.hammer_score)
        }
        const thm = new Map<number, number>()
        for (const [schoolId, wm] of schoolWeightMax) {
          const sum = WEIGHT_STRINGS.reduce((acc, w) => acc + (wm.get(w) ?? 0), 0)
          thm.set(schoolId, Math.round(sum / N_WEIGHTS * 100) / 100)
        }
        setTeamHammerScores(thm)
      }

      setWrestlers((leadersJson.wrestlers ?? []) as WRow[])
      setTeams((leadersJson.teams ?? []) as TRow[])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [seasonId])

  const visibleWrestlers = useMemo(
    () => wrestlers.filter(r => passesFilter(r, appliedConfs, appliedSections, appliedGroups)),
    [wrestlers, appliedConfs, appliedSections, appliedGroups],
  )

  const visibleTeams = useMemo(
    () => teams.filter(r => passesFilter(r, appliedConfs, appliedSections, appliedGroups)),
    [teams, appliedConfs, appliedSections, appliedGroups],
  )

  const isFiltered = appliedConfs.size < CONFERENCES.length || appliedSections.size < SECTIONS.length || appliedGroups.size < GROUP_VALUES.length

  return (
    <div className="space-y-6">
      <div className="border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter by</span>
          <div className="flex items-center gap-3">
            {isFiltered && (
              <button onClick={resetFilters} className="text-xs text-slate-400 hover:text-slate-700 underline">
                Reset — show all
              </button>
            )}
            {hasPendingChanges && (
              <button onClick={applyFilters} className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Apply
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <MultiSelect label="Conference" options={CONFERENCES.map(c => ({ value: c, label: c }))} selected={stagedConfs} onChange={setStagedConfs} />
          <MultiSelect label="Section" options={SECTIONS.map(s => ({ value: s, label: s }))} selected={stagedSections} onChange={setStagedSections} />
          <MultiSelect label="Group" options={GROUPS.map(g => ({ value: g.name, label: g.label }))} selected={stagedGroups} onChange={setStagedGroups} />
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(['team', 'individual'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              sub === s
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {s === 'team' ? 'Team' : 'Individual'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading regular season data…</div>
      ) : sub === 'team' ? (
        <TeamTab rows={visibleTeams} teamHammerScores={teamHammerScores} />
      ) : (
        <IndividualTab rows={visibleWrestlers} blurb={blurb} />
      )}
    </div>
  )
}
