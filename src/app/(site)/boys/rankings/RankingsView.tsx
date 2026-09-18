'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type Week     = { id: number; week_number: number; week_date: string }
type District = { id: number; name: string }
type Region   = { id: number; name: string }
type Stage    = 'district' | 'region' | 'section' | 'state'

type RankedWrestler = {
  rank: number
  wrestler_id: string
  name: string
  school: string
  grade: string | null
  hammer_score_snapshot: number
}

type PrevRank = { wrestler_id: string; rank: number }

type UpsetRow = {
  id: number
  winner_id: string
  winner_name: string
  winner_school: string
  winner_grade: string | null
  loser_id: string
  loser_name: string
  loser_school: string
  loser_grade: string | null
  winner_pre_hammer: number
  loser_pre_hammer: number
  differential: number
  win_type: string | null
  match_date: string
  same_district: boolean
  same_region: boolean
  same_section: boolean
}

type RankingsData = {
  rankings:      RankedWrestler[]
  prev_rankings: PrevRank[]
  upsets:        UpsetRow[]
  is_published:  boolean
  week:          { id: number; week_number: number; week_date: string }
}

type Props = {
  gender:          'M' | 'F'
  weeks:           Week[]
  districts:       District[]
  regions:         Region[]
  wrestlerBasePath?: string  // e.g. '/boys/wrestler' or '/girls/wrestler'
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BOYS_WEIGHTS  = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]
const GIRLS_WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]
const NJ_SECTIONS   = ['North 1', 'North 2', 'Central Jersey', 'South']

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function fmtWinType(win_type: string | null): string {
  if (!win_type) return ''
  const map: Record<string, string> = {
    Fall: 'Fall', FALL: 'Fall',
    MD: 'MD', TF: 'TF', 'TF-1.5': 'TF', 'TF-2': 'TF',
    Dec: 'Dec', DEC: 'Dec', 'SV-1': 'SV', UTB: 'UTB',
  }
  return map[win_type] ?? win_type
}

const SUFFIX: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
function ordinal(n: number) { return `${n}${SUFFIX[n] ?? 'th'}` }

// Build rank change descriptor from prev → current
type Change = {
  wrestler_id: string
  name: string
  school: string
  kind: 'up' | 'down' | 'new' | 'out' | 'same'
  delta: number        // positive = moved up, negative = moved down
  prevRank: number | null
  currRank: number | null
  cause: UpsetRow | null  // upset that caused this change (if any)
}

function computeChanges(
  current: RankedWrestler[],
  prev: PrevRank[],
  upsets: UpsetRow[],
): Change[] {
  if (!prev.length) return []

  const prevMap  = new Map(prev.map(p  => [p.wrestler_id, p.rank]))
  const currMap  = new Map(current.map(r => [r.wrestler_id, r.rank]))

  const changes: Change[] = []

  // Wrestlers in current ranking
  for (const w of current) {
    const prevRank = prevMap.get(w.wrestler_id) ?? null
    const currRank = w.rank

    if (prevRank === null) {
      changes.push({ wrestler_id: w.wrestler_id, name: w.name, school: w.school, kind: 'new', delta: 0, prevRank: null, currRank, cause: null })
    } else if (prevRank !== currRank) {
      const delta = prevRank - currRank  // positive = moved up in rank (smaller number)
      const kind  = delta > 0 ? 'up' : 'down'
      // Find a published upset that explains a drop (loser is this wrestler)
      const cause = kind === 'down'
        ? upsets.find(u => u.loser_id === w.wrestler_id) ?? null
        : null
      changes.push({ wrestler_id: w.wrestler_id, name: w.name, school: w.school, kind, delta: Math.abs(delta), prevRank, currRank, cause })
    }
  }

  // Wrestlers who fell out of rankings
  for (const p of prev) {
    if (!currMap.has(p.wrestler_id)) {
      // Lookup name from current (might not be there) — skip name since we don't have it
      const cause = upsets.find(u => u.loser_id === p.wrestler_id) ?? null
      changes.push({ wrestler_id: p.wrestler_id, name: '—', school: '', kind: 'out', delta: 0, prevRank: p.rank, currRank: null, cause })
    }
  }

  // Sort: ups first (by rank), then new, then drops (by how much), then outs
  const order = { up: 0, new: 1, down: 2, out: 3, same: 4 }
  changes.sort((a, b) => {
    if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind]
    if (a.kind === 'up') return (a.currRank ?? 99) - (b.currRank ?? 99)
    if (a.kind === 'down') return b.delta - a.delta
    return 0
  })

  return changes
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WeekButton({ week, active, onClick }: { week: Week; active: boolean; onClick: () => void }) {
  const label = fmtDate(week.week_date)
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-600 border-slate-300 hover:border-slate-900'
      }`}
    >
      {label}
    </button>
  )
}

function WeightButton({ w, active, onClick }: { w: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-600 border-slate-300 hover:border-slate-900'
      }`}
    >
      {w}
    </button>
  )
}

function RankBadge({ rank }: { rank: number }) {
  const color = rank === 1 ? 'text-amber-600 font-bold' : rank <= 3 ? 'text-slate-700 font-semibold' : 'text-slate-400'
  return <span className={`tabular-nums font-mono text-sm ${color}`}>{rank}</span>
}

function UpsetBlurb({ u, weekNumber }: { u: UpsetRow; weekNumber: number }) {
  const win = fmtWinType(u.win_type)
  return (
    <div className="py-2.5 px-0 border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-3">
        {/* Diff badge */}
        <div className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-xs font-bold tabular-nums ${
          u.differential >= 25 ? 'bg-red-600 text-white'
          : u.differential >= 15 ? 'bg-orange-500 text-white'
          : u.differential >= 8  ? 'bg-amber-500 text-white'
          : 'bg-slate-200 text-slate-700'
        }`}>
          +{u.differential.toFixed(1)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800 leading-snug">
            <span className="font-semibold">{u.winner_name}</span>
            <span className="text-slate-400 text-xs mx-1">({u.winner_school})</span>
            <span className="text-slate-500 text-xs">def.</span>
            <span className="font-semibold ml-1">{u.loser_name}</span>
            <span className="text-slate-400 text-xs mx-1">({u.loser_school})</span>
            {win && <span className="ml-1 text-xs font-semibold text-slate-600">{win}</span>}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {fmtDate(u.match_date)}
            {!u.same_district && !u.same_region && !u.same_section && (
              <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">cross-district</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

function ChangeLine({ c, upsets }: { c: Change; upsets: UpsetRow[] }) {
  const arrow =
    c.kind === 'up'   ? <span className="text-emerald-500 font-bold text-sm">↑{c.delta}</span>
    : c.kind === 'down' ? <span className="text-red-500 font-bold text-sm">↓{c.delta}</span>
    : c.kind === 'new'  ? <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded">NEW</span>
    : c.kind === 'out'  ? <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded">OUT</span>
    : null

  return (
    <div className="py-1.5 border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-2.5">
        <div className="w-8 shrink-0 flex justify-end mt-0.5">{arrow}</div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-slate-800">{c.name}</span>
          {c.school && <span className="text-xs text-slate-400 ml-1.5">{c.school}</span>}
          <span className="text-xs text-slate-400 ml-1.5">
            {c.kind === 'up'   && `${ordinal(c.prevRank!)} → ${ordinal(c.currRank!)}`}
            {c.kind === 'down' && `${ordinal(c.prevRank!)} → ${ordinal(c.currRank!)}`}
            {c.kind === 'new'  && `enters at ${ordinal(c.currRank!)}`}
            {c.kind === 'out'  && `was ${ordinal(c.prevRank!)}`}
          </span>
          {c.cause && (
            <p className="text-xs text-slate-400 mt-0.5 leading-snug">
              lost to <span className="font-medium text-slate-600">{c.cause.winner_name}</span>
              {c.cause.winner_school && <span className="ml-1">({c.cause.winner_school})</span>}
              {c.cause.win_type && <span className="ml-1">{fmtWinType(c.cause.win_type)}</span>}
              <span className="ml-1">{fmtDate(c.cause.match_date)}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RankingsView({ gender, weeks, districts, regions, wrestlerBasePath = '/boys/wrestler' }: Props) {
  const weights = gender === 'F' ? GIRLS_WEIGHTS : BOYS_WEIGHTS

  // Default to most recent week
  const latestWeek = weeks[weeks.length - 1] ?? null

  const [selectedWeekId,  setSelectedWeekId]  = useState<number | null>(latestWeek?.id ?? null)
  const [selectedWeight,  setSelectedWeight]  = useState<number | null>(null)
  const [selectedStage,   setSelectedStage]   = useState<Stage | null>(null)
  const [selectedEntity,  setSelectedEntity]  = useState<string>('')
  const [data,            setData]            = useState<RankingsData | null>(null)
  const [loading,         setLoading]         = useState(false)

  const selectedWeek = weeks.find(w => w.id === selectedWeekId) ?? null

  // Reset downstream state on upstream change
  function pickWeek(id: number) {
    setSelectedWeekId(id)
    setSelectedWeight(null)
    setSelectedStage(null)
    setSelectedEntity('')
    setData(null)
  }

  function pickWeight(w: number) {
    setSelectedWeight(prev => {
      if (prev === w) {
        setSelectedStage(null)
        setSelectedEntity('')
        setData(null)
        return null
      }
      setSelectedStage(null)
      setSelectedEntity('')
      setData(null)
      return w
    })
  }

  function pickEntity(stage: Stage, entity: string) {
    setSelectedStage(stage)
    setSelectedEntity(entity)
    setData(null)
  }

  // Fetch rankings when entity is fully selected
  useEffect(() => {
    if (!selectedWeekId || !selectedWeight || !selectedStage || !selectedEntity) return
    setLoading(true)
    setData(null)
    fetch(`/api/rankings/individual?gender=${gender}&week_id=${selectedWeekId}&weight_class=${selectedWeight}&stage=${selectedStage}&stage_entity=${encodeURIComponent(selectedEntity)}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [gender, selectedWeekId, selectedWeight, selectedStage, selectedEntity])

  const entityLabel =
    selectedStage === 'district' ? (districts.find(d => String(d.id) === selectedEntity)?.name ?? `District ${selectedEntity}`)
    : selectedStage === 'region'  ? (regions.find(r => String(r.id) === selectedEntity)?.name  ?? `Region ${selectedEntity}`)
    : selectedStage === 'section' ? selectedEntity
    : 'State'

  const changes = data ? computeChanges(data.rankings, data.prev_rankings, data.upsets) : []
  const hasChanges = changes.some(c => c.kind !== 'same')

  return (
    <div className="space-y-8 max-w-2xl mx-auto">

      {/* ── Week selector ──────────────────────────────────────────────── */}
      {weeks.length > 0 ? (
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Week</p>
          <div className="flex flex-wrap gap-1.5">
            {weeks.map(w => (
              <WeekButton
                key={w.id}
                week={w}
                active={selectedWeekId === w.id}
                onClick={() => pickWeek(w.id)}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="border border-amber-200 bg-amber-50 rounded p-4 text-sm text-amber-700">
          No ranking weeks found — run the Season 3 seed migration to enable rankings.
        </div>
      )}

      {/* ── Weight class ───────────────────────────────────────────────── */}
      {selectedWeekId && (
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Weight Class</p>
          <div className="flex flex-wrap gap-1.5">
            {weights.map(w => (
              <WeightButton key={w} w={w} active={selectedWeight === w} onClick={() => pickWeight(w)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Stage / entity selector ────────────────────────────────────── */}
      {selectedWeight && (
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">View</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* District */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">District</label>
              <select
                value={selectedStage === 'district' ? selectedEntity : ''}
                onChange={e => e.target.value && pickEntity('district', e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">— select district —</option>
                {districts.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Region */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Region</label>
              <select
                value={selectedStage === 'region' ? selectedEntity : ''}
                onChange={e => e.target.value && pickEntity('region', e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">— select region —</option>
                {regions.map(r => (
                  <option key={r.id} value={String(r.id)}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Section</label>
              <select
                value={selectedStage === 'section' ? selectedEntity : ''}
                onChange={e => e.target.value && pickEntity('section', e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="">— select section —</option>
                {NJ_SECTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* State */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">State</label>
              <button
                onClick={() => pickEntity('state', 'state')}
                className={`w-full px-2 py-1.5 text-xs border transition-colors ${
                  selectedStage === 'state'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-900'
                }`}
              >
                NJ State Rankings
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Rankings display ───────────────────────────────────────────── */}
      {loading && (
        <div className="text-center py-8 text-sm text-slate-400">Loading rankings…</div>
      )}

      {!loading && data && selectedStage && selectedEntity && (
        <section className="space-y-6">

          {/* Header */}
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900">
              {entityLabel} · {selectedWeight} lb
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Week {selectedWeek?.week_number} · {selectedWeek ? fmtDate(selectedWeek.week_date) : ''}
              {' · '}
              {gender === 'M' ? 'Boys' : 'Girls'} Individual Rankings
            </p>
          </div>

          {/* Not yet published */}
          {!data.is_published && (
            <div className="border border-slate-200 bg-slate-50 rounded p-6 text-center">
              <p className="text-sm text-slate-500">Rankings not yet published for this week.</p>
              <p className="text-xs text-slate-400 mt-1">Check back after Sunday.</p>
            </div>
          )}

          {/* Rankings table */}
          {data.is_published && data.rankings.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Rankings</h3>
              <div className="border border-black overflow-hidden">
                <table className="min-w-full">
                  <tbody className="divide-y divide-slate-100">
                    {data.rankings.map(w => (
                      <tr key={w.wrestler_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3 py-2 w-8 text-center">
                          <RankBadge rank={w.rank} />
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={`${wrestlerBasePath}/${w.wrestler_id}`}
                            className="text-sm font-semibold text-slate-800 hover:text-blue-600 hover:underline"
                          >
                            {w.name}
                          </Link>
                          {w.grade && <span className="text-xs text-slate-400 ml-1.5">{w.grade}</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">{w.school}</td>
                        <td className="px-3 py-2 text-right">
                          <span className="text-xs text-slate-400 tabular-nums font-mono">{w.hammer_score_snapshot.toFixed(1)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.is_published && data.rankings.length === 0 && (
            <p className="text-sm text-slate-400">No wrestlers ranked for this selection.</p>
          )}

          {/* Changes section (week 2+) */}
          {data.is_published && hasChanges && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                Changes from Week {(selectedWeek?.week_number ?? 2) - 1}
              </h3>
              <div className="border border-slate-200 px-3">
                {changes.filter(c => c.kind !== 'same').map(c => (
                  <ChangeLine key={c.wrestler_id} c={c} upsets={data.upsets} />
                ))}
              </div>
            </div>
          )}

          {/* Upsets section */}
          {data.is_published && data.upsets.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                {selectedStage === 'district' || selectedStage === 'section'
                  ? `Upsets — ${entityLabel}`
                  : selectedStage === 'region'
                    ? `Upsets Involving ${entityLabel} Wrestlers`
                    : 'Notable Upsets'}
              </h3>
              <div className="border border-black px-4">
                {data.upsets.map(u => (
                  <UpsetBlurb key={u.id} u={u} weekNumber={selectedWeek?.week_number ?? 1} />
                ))}
              </div>
            </div>
          )}

        </section>
      )}

      {/* ── Prompt to select ──────────────────────────────────────────── */}
      {!loading && !data && selectedWeight && selectedStage && selectedEntity && !loading && (
        <div className="text-center py-8 text-sm text-slate-400">Loading…</div>
      )}

      {!selectedWeight && weeks.length > 0 && (
        <p className="text-sm text-slate-400 text-center py-4">
          Select a weight class to see rankings.
        </p>
      )}

    </div>
  )
}
