'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { RATING_SHORT } from '@/lib/rating'

export type HammerRow = {
  wrestler_id: string
  first_name: string
  last_name: string
  postseason_adjusted: number
  tournament_score: number
  match_score: number
  hammer_score: number
  match_count: number
  last_match_date: string | null
  weight_class: string | null
  conference: string | null
  section: string | null
  classification: string | null
  district: number | null
  region: number | null
  last_calculated_at: string
}

type SortKey = 'hammer_score' | 'postseason_adjusted' | 'tournament_score' | 'match_score' | 'match_count' | 'weight_class'
type SortDir = 'asc' | 'desc'

function fmt(n: number) { return n.toFixed(2) }

function SortHeader({ label, sortKey, current, dir, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <th className="px-3 py-2 text-right cursor-pointer select-none whitespace-nowrap hover:bg-slate-100" onClick={() => onSort(sortKey)}>
      <span className={active ? 'text-slate-900 font-semibold' : 'text-slate-500'}>
        {label} {active ? (dir === 'desc' ? '↓' : '↑') : ''}
      </span>
    </th>
  )
}

function RecalcButton({ gender }: { gender: 'M' | 'F' }) {
  const [phase,   setPhase]   = useState<'idle' | 'scoring' | 'publishing' | 'done' | 'error'>('idle')
  const [scoring, setScoring] = useState<{ wrestlers?: number; matchesScored?: number; elapsedMs?: number } | null>(null)
  const [publish, setPublish] = useState<{ published?: number; conference?: number; district?: number; region?: number } | null>(null)
  const [errMsg,  setErrMsg]  = useState<string | null>(null)

  async function run() {
    setPhase('scoring'); setScoring(null); setPublish(null); setErrMsg(null)
    try {
      // Step 1: recalculate hammer scores
      const res  = await fetch('/api/admin/recalculate-hammer-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Unknown error')
      setScoring(json)

      // Step 2: auto-publish conference/district/region rankings
      setPhase('publishing')
      const pRes  = await fetch('/api/admin/rankings/auto-publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender: gender }) })
      const pJson = await pRes.json()
      if (!pRes.ok) throw new Error(pJson.error ?? 'Auto-publish failed')
      setPublish(pJson)
      setPhase('done')
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }

  const running = phase === 'scoring' || phase === 'publishing'

  return (
    <div className="flex items-start gap-4">
      <button onClick={run} disabled={running} className={`px-4 py-2 text-xs font-semibold border transition-colors ${running ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-wait' : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-700'}`}>
        {phase === 'scoring'    ? 'Recalculating… (~60–90s)' :
         phase === 'publishing' ? 'Auto-publishing rankings…' :
         'Recalculate Scores'}
      </button>
      {(phase === 'done' || phase === 'error' || scoring) && (
        <div className={`text-xs mt-1 ${phase === 'error' ? 'text-red-600' : 'text-slate-600'}`}>
          {phase === 'error' && <p className="font-semibold">Error: {errMsg}</p>}
          {scoring && (
            <p className={phase === 'done' ? 'font-semibold text-slate-800' : ''}>
              {scoring.wrestlers?.toLocaleString()} wrestlers · {scoring.matchesScored?.toLocaleString()} match entries · {((scoring.elapsedMs ?? 0) / 1000).toFixed(1)}s
            </p>
          )}
          {publish && (
            <p className="text-slate-500">
              Rankings published: {publish.published} lists ({publish.conference} conf · {publish.district} district · {publish.region} region)
              {phase === 'done' && ' — refresh to see updated scores'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ChipBar<T extends string | number>({
  label, options, value, onChange, formatLabel,
}: {
  label: string
  options: T[]
  value: T | null
  onChange: (v: T | null) => void
  formatLabel?: (v: T) => string
}) {
  if (!options.length) return null
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-slate-400 shrink-0 w-20 text-right">{label}</span>
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => onChange(null)}
          className={`px-2 py-0.5 text-xs border transition-colors ${value === null ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-600 hover:border-slate-500'}`}
        >All</button>
        {options.map(o => (
          <button
            key={o}
            onClick={() => onChange(value === o ? null : o)}
            className={`px-2 py-0.5 text-xs border transition-colors ${value === o ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-600 hover:border-slate-500'}`}
          >
            {formatLabel ? formatLabel(o) : String(o)}
          </button>
        ))}
      </div>
    </div>
  )
}

export function HammerScoresClient({ rows, calculatedAt, gender }: { rows: HammerRow[]; calculatedAt: string | null; gender: 'M' | 'F' }) {
  const [query, setQuery] = useState('')
  const [weightFilter, setWeightFilter]         = useState<string | null>(null)
  const [sectionFilter, setSectionFilter]       = useState<string | null>(null)
  const [classFilter, setClassFilter]           = useState<string | null>(null)
  const [regionFilter, setRegionFilter]         = useState<number | null>(null)
  const [districtFilter, setDistrictFilter]     = useState<number | null>(null)
  const [conferenceFilter, setConferenceFilter] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('weight_class')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(k); setSortDir(k === 'weight_class' ? 'asc' : 'desc') }
  }

  // Derive sorted unique option lists from all rows (not filtered, so options never disappear)
  const weightClasses = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) if (r.weight_class) s.add(r.weight_class)
    return [...s].sort((a, b) => Number(a) - Number(b))
  }, [rows])

  const sections = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) if (r.section) s.add(r.section)
    const ORDER = ['North I', 'North II', 'Central', 'South', 'Non-Public']
    return [...s].sort((a, b) => {
      const ai = ORDER.indexOf(a); const bi = ORDER.indexOf(b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  }, [rows])

  const classifications = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) if (r.classification) s.add(r.classification)
    const ORDER = ['1','2','3','4','5','A','B']
    return [...s].sort((a, b) => {
      const ai = ORDER.indexOf(a); const bi = ORDER.indexOf(b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  }, [rows])

  const regions = useMemo(() => {
    const s = new Set<number>()
    for (const r of rows) if (r.region != null) s.add(r.region)
    return [...s].sort((a, b) => a - b)
  }, [rows])

  const districts = useMemo(() => {
    const s = new Set<number>()
    for (const r of rows) if (r.district != null) s.add(r.district)
    return [...s].sort((a, b) => a - b)
  }, [rows])

  const conferences = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) if (r.conference) s.add(r.conference)
    return [...s].sort()
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(r =>
      (!weightFilter    || r.weight_class    === weightFilter) &&
      (!sectionFilter   || r.section         === sectionFilter) &&
      (!classFilter     || r.classification  === classFilter) &&
      (!regionFilter    || r.region          === regionFilter) &&
      (!districtFilter  || r.district        === districtFilter) &&
      (!conferenceFilter || r.conference     === conferenceFilter) &&
      (!q || `${r.first_name} ${r.last_name}`.toLowerCase().includes(q))
    )
  }, [rows, query, weightFilter, sectionFilter, classFilter, regionFilter, districtFilter, conferenceFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortKey === 'weight_class') {
        const diff = Number(a.weight_class ?? 9999) - Number(b.weight_class ?? 9999)
        return sortDir === 'desc' ? -diff : diff
      }
      const diff = (a[sortKey] as number) - (b[sortKey] as number)
      return sortDir === 'desc' ? -diff : diff
    })
  }, [filtered, sortKey, sortDir])

  const activeFilterCount = [weightFilter, sectionFilter, classFilter, regionFilter, districtFilter, conferenceFilter].filter(Boolean).length

  return (
    <div>
      {/* Filter panel */}
      <div className="border border-slate-200 rounded p-3 mb-4 space-y-2 bg-slate-50">
        <ChipBar label="Weight" options={weightClasses} value={weightFilter} onChange={setWeightFilter} />
        <ChipBar label="Section" options={sections} value={sectionFilter} onChange={setSectionFilter} />
        <ChipBar label="Group" options={classifications} value={classFilter} onChange={setClassFilter} />
        {regions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 shrink-0 w-20 text-right">Region</span>
            <select
              value={regionFilter ?? ''}
              onChange={e => setRegionFilter(e.target.value ? Number(e.target.value) : null)}
              className="text-xs border border-slate-300 px-2 py-0.5 bg-white text-slate-700 max-w-xs"
            >
              <option value="">All</option>
              {regions.map(r => <option key={r} value={r}>Region {r}</option>)}
            </select>
          </div>
        )}

        {districts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 shrink-0 w-20 text-right">District</span>
            <select
              value={districtFilter ?? ''}
              onChange={e => setDistrictFilter(e.target.value ? Number(e.target.value) : null)}
              className="text-xs border border-slate-300 px-2 py-0.5 bg-white text-slate-700 max-w-xs"
            >
              <option value="">All</option>
              {districts.map(d => <option key={d} value={d}>District {d}</option>)}
            </select>
          </div>
        )}

        {conferences.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 shrink-0 w-20 text-right">Conference</span>
            <select
              value={conferenceFilter ?? ''}
              onChange={e => setConferenceFilter(e.target.value || null)}
              className="text-xs border border-slate-300 px-2 py-0.5 bg-white text-slate-700 max-w-xs"
            >
              <option value="">All</option>
              {conferences.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {activeFilterCount > 0 && (
          <div className="pt-1">
            <button
              onClick={() => { setWeightFilter(null); setSectionFilter(null); setClassFilter(null); setRegionFilter(null); setDistrictFilter(null); setConferenceFilter(null) }}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Clear all filters ({activeFilterCount} active)
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search wrestler…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="border border-slate-300 px-3 py-1.5 text-sm w-56"
          />
          <span className="text-xs text-slate-400">{sorted.length.toLocaleString()} of {rows.length.toLocaleString()}</span>
        </div>
        <RecalcButton gender={gender} />
      </div>

      {calculatedAt && (
        <p className="text-xs text-slate-400 mb-3">Last calculated: {new Date(calculatedAt).toLocaleString()}</p>
      )}

      <div className="overflow-x-auto border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left text-slate-500 font-medium">#</th>
              <th className="px-3 py-2 text-left text-slate-500 font-medium">Wrestler</th>
              <SortHeader label="Wt"     sortKey="weight_class"       current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label={RATING_SHORT} sortKey="hammer_score"       current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="PS"     sortKey="postseason_adjusted" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Tour"   sortKey="tournament_score"    current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Match"  sortKey="match_score"         current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Matches" sortKey="match_count"        current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-3 py-2 text-right text-slate-500 font-medium">Last Match</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.wrestler_id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                <td className="px-3 py-1.5">
                  <Link href={`/wrestler/${r.wrestler_id}`} className="font-medium text-slate-900 hover:underline">
                    {r.last_name}, {r.first_name}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-right text-slate-500">{r.weight_class ?? '—'}</td>
                <td className="px-3 py-1.5 text-right font-semibold text-slate-900">{fmt(r.hammer_score)}</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{fmt(r.postseason_adjusted)}</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{fmt(r.tournament_score)}</td>
                <td className="px-3 py-1.5 text-right text-slate-600">{fmt(r.match_score)}</td>
                <td className="px-3 py-1.5 text-right text-slate-400">{r.match_count}</td>
                <td className="px-3 py-1.5 text-right text-slate-400">{r.last_match_date ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <p className="text-center text-sm text-slate-400 py-8">No results</p>}
      </div>
    </div>
  )
}
