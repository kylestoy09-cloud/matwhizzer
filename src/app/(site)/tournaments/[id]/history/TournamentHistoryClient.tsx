'use client'
// A tournament's history page: one year's podium at a time, then the records — multi-time champions, multi-time
// placers, most consolation wins (career at the tournament, and in one year)
import { useState } from 'react'
import Link from 'next/link'
import type { SeriesHistory, Tally } from '@/lib/tournamentSeriesHistory'
import { ord } from '@/lib/tournamentSeriesHistory'
import { NjIcon } from '@/components/site/NjIcon'

const th = 'px-3 py-1 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap'
const td = 'px-3 py-1 text-[13px]'

function Records({ title, rows: all, unit, withSeason, njOnly }: { title: string; rows: (Tally & { season?: string })[]; unit: string; withSeason?: boolean; njOnly: boolean }) {
  const rows = all.filter(r => !njOnly || r.nj).slice(0, 25)
  if (!rows.length) return null
  return (
    <section>
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{title}</h2>
      <div className="border border-black overflow-x-auto">
        <table className="min-w-max w-full">
          <thead><tr className="bg-slate-900 text-white"><th className={th}>#</th><th className={th}>Wrestler</th><th className={th}>School</th><th className={`${th} text-right`}>{unit}</th>{withSeason ? <th className={th}>Year</th> : <th className={th}>Years</th>}</tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={`${r.wrestlerId}-${r.season ?? ''}`} className={`border-t border-slate-100 ${i % 2 ? 'bg-slate-50' : 'bg-white'}`}>
              <td className={`${td} text-slate-400 tabular-nums`}>{i + 1}</td>
              <td className={td}><Link href={`/wrestler/${r.wrestlerId}`} className="font-medium text-slate-800 hover:underline">{r.name}</Link></td>
              <td className={`${td} text-slate-600`}>{r.school ?? ''}</td>
              <td className={`${td} text-right tabular-nums font-semibold`}>{r.count}</td>
              <td className={`${td} text-slate-500`}>{r.detail}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  )
}

export function TournamentHistoryClient({ history }: { history: SeriesHistory }) {
  const withPodium = history.years.filter(y => history.placers.some(p => p.season === y.season))
  const [season, setSeason] = useState(withPodium[0]?.season ?? history.years[0]?.season ?? '')
  // NJSIAA schools' wrestlers first (the default), or everyone (Kyle 2026-11-21)
  const [njOnly, setNjOnly] = useState(true)
  const year = history.years.find(y => y.season === season)
  const podium = history.placers.filter(p => p.season === season && (!njOnly || p.nj))
  const fullDepth = Math.max(0, ...history.placers.filter(p => p.season === season).map(p => p.place))
  const weights = [...new Set(podium.map(p => p.weight))].sort((a, b) => a - b)
  const depth = fullDepth
  return (
    <div className="space-y-10">
      <section>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Podium</h2>
          <select value={season} onChange={e => setSeason(e.target.value)} className="border border-slate-300 px-2 py-0.5 text-sm">
            {history.years.map(y => <option key={y.id} value={y.season}>{y.season}{history.placers.some(p => p.season === y.season) ? '' : ' — no podium on file'}</option>)}
          </select>
          {year && <Link href={`/tournaments/${year.id}`} className="text-xs text-blue-700 hover:underline">{season} results</Link>}
          {year?.hasBracket && <Link href={`/tournaments/${year.id}/bracket`} className="text-xs text-blue-700 hover:underline">Bracket</Link>}
          <div className="ml-auto flex border border-slate-300 text-xs">
            {([[true, 'NJSIAA'], [false, 'All']] as const).map(([v, label]) => (
              <button key={label} onClick={() => setNjOnly(v)} className={`px-2.5 py-0.5 ${njOnly === v ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>{label}</button>
            ))}
          </div>
        </div>
        {weights.length ? (
          <div className="border border-black overflow-x-auto">
            <table className="min-w-max w-full">
              <thead><tr className="bg-slate-900 text-white"><th className={th}>Weight</th>{Array.from({ length: depth }, (_, i) => <th key={i} className={th}>{ord(i + 1)}</th>)}</tr></thead>
              <tbody>{weights.map((w, i) => (
                <tr key={w} className={`border-t border-slate-100 ${i % 2 ? 'bg-slate-50' : 'bg-white'}`}>
                  <td className={`${td} font-semibold tabular-nums`}>{w}</td>
                  {Array.from({ length: depth }, (_, k) => {
                    const p = podium.find(x => x.weight === w && x.place === k + 1)
                    return <td key={k} className={td}>{p ? <><span className="flex items-center gap-1 whitespace-nowrap">{p.nj && !njOnly && <NjIcon />}{p.wrestlerId ? <Link href={`/wrestler/${p.wrestlerId}`} className={`hover:underline ${k === 0 ? 'font-semibold' : ''}`}>{p.name}</Link> : p.name}</span><span className="block text-[11px] text-slate-400">{p.school ?? ''}</span></> : ''}</td>
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="text-sm text-slate-500">{njOnly ? `No NJSIAA placers on file for ${season}.` : `No podium on file for ${season}.`}</p>}
      </section>
      <Records title="Multi-time champions" rows={history.multiChamps} unit="Titles" njOnly={njOnly} />
      <Records title="Multi-time placers" rows={history.multiPlacers} unit="Podiums" njOnly={njOnly} />
      <Records title="Most consolation wins — career" rows={history.consCareer} unit="Wins" njOnly={njOnly} />
      <Records title="Most consolation wins — one year" rows={history.consSeason} unit="Wins" withSeason njOnly={njOnly} />
    </div>
  )
}
