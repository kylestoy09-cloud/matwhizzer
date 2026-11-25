'use client'

// Middle School Hub · Freshman year (Kyle 2026-11-13): how a middle school tournament's placers did in their
// freshman postseason. 8th graders are found by name + class year (src/app/api/admin/hub/freshman); this side's
// kids only. A summary by middle school finish, then every placer — sortable, filterable.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { hubSeasonLabel, ordinal } from '@/lib/hub'

type Row = {
  ms_season: number; division: string | null; weight: string; place: number; name: string; club: string | null
  matched: boolean; wrestler_id: string | null; hs_school: string | null; freshman_season: number | null
  furthest: string | null; district: number | null; region: number | null; state: number | null
}
const th = 'px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap cursor-pointer select-none hover:bg-slate-100'
const td = 'px-3 py-1'
const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
const OUTCOMES = ['State placer', 'State qualifier', 'Region, no state', 'Districts only', 'No postseason'] as const
const BANDS = ['Champion', 'Runner-up', '3rd–4th', '5th–8th'] as const
const band = (p: number) => (p === 1 ? 'Champion' : p === 2 ? 'Runner-up' : p <= 4 ? '3rd–4th' : '5th–8th')
const outcome = (r: Row) => r.furthest === 'State' ? (r.state && r.state <= 8 ? 'State placer' : 'State qualifier')
  : r.furthest === 'Region' ? 'Region, no state' : r.furthest === 'District' ? 'Districts only' : r.furthest === 'None' ? 'No postseason' : null
// a level's result: its place, "entered" (0), or blank
const res = (n: number | null) => (n == null ? '' : n === 0 ? 'entered' : ordinal(n))
const seasonLabel = (s: number | null) => (s ? `${s - 1}-${String(s).slice(2)}` : '')

type SortKey = 'ms_season' | 'division' | 'weight' | 'place' | 'name' | 'hs_school' | 'outcome' | 'district' | 'region' | 'state'

export function FreshmanTab() {
  const { gender, side } = useAdminGender()
  const [tournament, setTournament] = useState('')
  const [data, setData] = useState<{ tournaments: { id: number; name: string }[]; tournament_id: number; postseasons: number[]; rows: Row[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [year, setYear] = useState('')
  const [division, setDivision] = useState('')
  const [onlyMatched, setOnlyMatched] = useState(true)
  const [pick, setPick] = useState<string | null>(null)   // a summary cell: `${band}|${outcome}`
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'place', desc: false })

  useEffect(() => {
    fetch(`/api/admin/hub/freshman?gender=${gender === 'F' ? 'F' : 'M'}${tournament ? `&tournament=${tournament}` : ''}`).then(r => r.json())
      .then(d => (d.error ? setError(d.error) : setData(d))).catch(() => setError('Could not load'))
  }, [gender, tournament])

  const rows = useMemo(() => (data?.rows ?? []).filter(r =>
    (!year || String(r.ms_season) === year) && (!division || r.division === division) && (!onlyMatched || r.matched) &&
    (!pick || (r.matched && `${band(r.place)}|${outcome(r)}` === pick)),
  ), [data, year, division, onlyMatched, pick])

  const sorted = useMemo(() => {
    const v = (r: Row): string | number => {
      switch (sort.key) {
        case 'outcome': return OUTCOMES.indexOf((outcome(r) ?? 'zz') as typeof OUTCOMES[number]) + (r.state ? r.state / 100 : 0)
        case 'district': case 'region': case 'state': { const n = r[sort.key]; return n == null ? 999 : n === 0 ? 99 : n }
        case 'weight': return Number.parseInt(r.weight) || 0
        default: return (r[sort.key] ?? '') as string | number
      }
    }
    return [...rows].sort((a, b) => { const x = v(a), y = v(b); const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)); return (sort.desc ? -c : c) || a.place - b.place })
  }, [rows, sort])

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return <p className="text-sm text-slate-400">Loading…</p>

  // the summary: placers matched to a freshman whose postseason is on file
  const base = (data.rows ?? []).filter(r => r.matched && outcome(r) && (!year || String(r.ms_season) === year) && (!division || r.division === division))
  const count = (b: string, o?: string) => base.filter(r => band(r.place) === b && (!o || outcome(r) === o)).length
  const years = [...new Set(data.rows.map(r => r.ms_season))].sort()
  const divisions = [...new Set(data.rows.map(r => r.division).filter(Boolean))].sort() as string[]
  const head = (key: SortKey, label: string) => (
    <th className={th} onClick={() => setSort(s => ({ key, desc: s.key === key ? !s.desc : false }))}>{label}{sort.key === key ? (sort.desc ? ' ▾' : ' ▴') : ''}</th>
  )

  return (
    <div>
      <p className="text-sm text-slate-500 mb-3">
        Placers (1st–8th) matched to one of our {gender === 'F' ? 'girls' : 'boys'} by name and the class year an 8th grader would have, with their freshman postseason. Freshman postseasons on file: {data.postseasons.map(s => seasonLabel(s)).join(', ') || 'none'}.
      </p>
      <div className="flex items-center gap-3 mb-3 text-sm flex-wrap">
        <select value={String(data.tournament_id)} onChange={e => { setTournament(e.target.value); setPick(null) }} className={input}>
          {data.tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={year} onChange={e => { setYear(e.target.value); setPick(null) }} className={input}>
          <option value="">All years</option>
          {years.map(y => <option key={y} value={y}>{hubSeasonLabel('ms', y)}</option>)}
        </select>
        <select value={division} onChange={e => { setDivision(e.target.value); setPick(null) }} className={input}>
          <option value="">All divisions</option>
          {divisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <label className="flex items-center gap-1 text-slate-600"><input type="checkbox" checked={onlyMatched} onChange={e => setOnlyMatched(e.target.checked)} /> Matched to a high schooler only</label>
      </div>

      <table className="text-sm border border-slate-200 mb-4">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr><th className={th}>Middle school finish</th>{OUTCOMES.map(o => <th key={o} className={th}>{o}</th>)}<th className={th}>Matched</th></tr>
        </thead>
        <tbody>
          {BANDS.map(b => (
            <tr key={b} className="border-b border-slate-100">
              <td className={`${td} font-medium`}>{b}</td>
              {OUTCOMES.map(o => {
                const n = count(b, o), on = pick === `${b}|${o}`
                return <td key={o} className={`${td} text-center ${n ? 'cursor-pointer hover:bg-slate-100' : 'text-slate-300'} ${on ? 'bg-black text-white hover:bg-black' : ''}`} onClick={() => n && setPick(on ? null : `${b}|${o}`)}>{n}</td>
              })}
              <td className={`${td} text-center text-slate-500`}>{count(b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pick && <p className="text-xs text-slate-500 mb-2">Showing {pick.replace('|', ' → ')}. <button onClick={() => setPick(null)} className="underline hover:text-black">Show all</button></p>}

      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {head('ms_season', 'MS year')}{head('division', 'Division')}{head('weight', 'Wt')}{head('place', 'Place')}{head('name', 'Wrestler')}
            {head('hs_school', 'High school')}{head('outcome', 'Freshman postseason')}{head('district', 'District')}{head('region', 'Region')}{head('state', 'State')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className={td}>{hubSeasonLabel('ms', r.ms_season)}</td>
              <td className={`${td} text-slate-600`}>{r.division}</td>
              <td className={td}>{r.weight}</td>
              <td className={`${td} font-semibold`}>{ordinal(r.place)}</td>
              <td className={`${td} font-medium`}>{r.wrestler_id ? <Link href={`/admin/${side}/wrestlers/${r.wrestler_id}`} className="hover:underline">{r.name}</Link> : r.name}<div className="text-[11px] text-slate-400 font-normal">{r.club}</div></td>
              <td className={td}>{r.hs_school ?? (r.matched ? '' : <span className="text-slate-400">not found</span>)}</td>
              <td className={td}>{r.furthest === 'Not yet' ? <span className="text-slate-400">{seasonLabel(r.freshman_season)} postseason not on file</span> : outcome(r) ?? ''}</td>
              <td className={td}>{res(r.district)}</td>
              <td className={td}>{res(r.region)}</td>
              <td className={`${td} font-semibold`}>{res(r.state)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!sorted.length && <p className="text-sm text-slate-400 mt-2">No placers match.</p>}
    </div>
  )
}
