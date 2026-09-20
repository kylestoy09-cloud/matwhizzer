'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import type { H2HResponse, DirectMatch, OpponentRecord, MatchDetail, PredictionResult } from '@/app/api/h2h/route'

type WrestlerOption = { id: string; first_name: string; last_name: string }

function WrestlerSearch({ label, value, onChange, align = 'left', gender }: {
  label: string
  value: WrestlerOption | null
  onChange: (w: WrestlerOption | null) => void
  align?: 'left' | 'right'
  gender: 'M' | 'F'
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WrestlerOption[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) { setQuery(`${value.first_name} ${value.last_name}`); setOpen(false) }
  }, [value])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); setOpen(false); return }
    if (value && `${value.first_name} ${value.last_name}` === q) return
    const t = setTimeout(async () => {
      const sb = createSupabaseBrowser()
      const parts = q.split(/\s+/)
      let qb = sb.from('wrestlers').select('id, first_name, last_name').eq('gender', gender).eq('is_oos', false).limit(8)
      if (parts.length >= 2) {
        qb = qb.ilike('first_name', `%${parts[0]}%`).ilike('last_name', `%${parts[parts.length - 1]}%`)
      } else {
        qb = qb.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      }
      const { data } = await qb
      setResults((data ?? []) as WrestlerOption[])
      setOpen(true)
    }, 250)
    return () => clearTimeout(t)
  }, [query, value, gender])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function select(w: WrestlerOption) {
    onChange(w)
    setQuery(`${w.first_name} ${w.last_name}`)
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={ref} className={`relative flex flex-col ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
      <div className="flex items-center gap-1">
        {value && align === 'right' && (
          <button onClick={() => { onChange(null); setQuery('') }} className="text-slate-400 hover:text-slate-700 text-lg leading-none px-1">×</button>
        )}
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); if (value) onChange(null) }}
          placeholder="Search wrestler…"
          autoComplete="off"
          className={`border border-slate-300 px-3 py-2 text-sm w-52 focus:outline-none focus:ring-1 focus:ring-slate-500 ${align === 'right' ? 'text-right' : ''}`}
        />
        {value && align === 'left' && (
          <button onClick={() => { onChange(null); setQuery('') }} className="text-slate-400 hover:text-slate-700 text-lg leading-none px-1">×</button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className={`absolute top-full mt-0.5 w-52 bg-white border border-slate-200 shadow-md z-20 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {results.map(w => (
            <button key={w.id} onClick={() => select(w)} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 transition-colors">
              {w.first_name} {w.last_name}
            </button>
          ))}
        </div>
      )}
      {value && (
        <Link href={`/wrestler/${value.id}`} className={`mt-1 text-xs text-slate-400 hover:text-slate-700 hover:underline ${align === 'right' ? 'text-right' : ''}`}>
          View profile →
        </Link>
      )}
    </div>
  )
}

function resultLabel(rt: string | null, detail: string | null): string {
  if (!rt) return '—'
  const map: Record<string, string> = { Fall: 'Fall', TF: 'TF', MD: 'MD', Dec: 'Dec', 'SV-1': 'SV-1', UTB: 'UTB', For: 'For' }
  const label = map[rt] ?? rt
  return detail ? `${label} ${detail}` : label
}

function matchQuality(m: MatchDetail): number {
  const rt = m.resultType
  const absMargin = Math.abs((m.myScore ?? 0) - (m.oppScore ?? 0))
  const secs = m.fallTimeSecs ?? 9999
  const rankFor = (won: boolean, base: number) => won ? base : (33 - base)
  if (rt === 'Fall' || rt === 'TF' || rt === 'TF-1.5' || rt === 'TF-2') {
    const typeBase = rt === 'Fall' ? 1 : 2
    let tier: number
    if (secs < 60) tier = 0
    else if (secs < 120) tier = 2
    else if (secs < 180) tier = 4
    else if (secs < 240) tier = 6
    else if (secs < 300) tier = 8
    else tier = 10
    const rank = rankFor(m.won, typeBase + tier)
    const tiebreak = m.won ? secs / 1e6 : -secs / 1e6
    return rank + tiebreak
  }
  if (rt === 'MD') {
    const rank = rankFor(m.won, 13)
    return rank + (m.won ? -absMargin / 1e6 : absMargin / 1e6)
  }
  if (rt === 'Dec') {
    const winRank = absMargin >= 4 ? 14 : 15
    return rankFor(m.won, winRank) + (m.won ? -absMargin / 1e6 : absMargin / 1e6)
  }
  return rankFor(m.won, 16)
}

function bestQuality(matches: MatchDetail[]): number {
  if (!matches.length) return Infinity
  return Math.min(...matches.map(matchQuality))
}

function compareOpponent(opp: OpponentRecord): 'a' | 'b' | 'tie' {
  const qA = bestQuality(opp.aMatches)
  const qB = bestQuality(opp.bMatches)
  if (qA < qB - 1e-9) return 'a'
  if (qB < qA - 1e-9) return 'b'
  return 'tie'
}

export default function H2HPage({ gender = 'M' }: { gender?: 'M' | 'F' }) {
  const [wrestlerA, setWrestlerA] = useState<WrestlerOption | null>(null)
  const [wrestlerB, setWrestlerB] = useState<WrestlerOption | null>(null)
  const [data, setData] = useState<H2HResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchH2H = useCallback(async (a: WrestlerOption, b: WrestlerOption) => {
    setLoading(true); setError(null); setData(null)
    try {
      const res = await fetch(`/api/h2h?a=${a.id}&b=${b.id}&gender=${gender}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setData(json)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [gender])

  useEffect(() => {
    if (wrestlerA && wrestlerB) fetchH2H(wrestlerA, wrestlerB)
    else setData(null)
  }, [wrestlerA, wrestlerB, fetchH2H])

  const nameA = wrestlerA ? `${wrestlerA.first_name} ${wrestlerA.last_name}` : 'Wrestler A'
  const nameB = wrestlerB ? `${wrestlerB.first_name} ${wrestlerB.last_name}` : 'Wrestler B'

  const renderTable = () => {
    if (!data) return null
    const { prediction, directMatches, commonOpponents } = data
    const aWins = directMatches.filter(m => m.winner === 'a').length
    const bWins = directMatches.filter(m => m.winner === 'b').length
    const edges = commonOpponents.map(o => compareOpponent(o))
    const betterA = edges.filter(e => e === 'a').length
    const betterB = edges.filter(e => e === 'b').length
    const totalAWins   = commonOpponents.reduce((s, o) => s + o.aWins, 0)
    const totalALosses = commonOpponents.reduce((s, o) => s + o.aLosses, 0)
    const totalBWins   = commonOpponents.reduce((s, o) => s + o.bWins, 0)
    const totalBLosses = commonOpponents.reduce((s, o) => s + o.bLosses, 0)

    return (
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide w-1/3">{nameB}</th>
              <th className="px-3 py-1 text-center text-xs font-bold uppercase tracking-wide w-1/3"></th>
              <th className="px-3 py-1 text-right text-xs font-bold uppercase tracking-wide w-1/3">{nameA}</th>
            </tr>
          </thead>
          <tbody>

            {/* ── Prediction ── */}
            <tr className="bg-slate-50 border-b border-slate-200">
              <td colSpan={3} className="px-3 py-1 text-xs font-semibold text-slate-700 uppercase tracking-widest">
                Prediction
              </td>
            </tr>
            <tr className="border-b border-slate-100 bg-white">
              <td className="px-3 py-1">
                {prediction.favoredWrestler === 'b' && (
                  <span className="font-bold text-slate-900">{prediction.outcomeLabel}</span>
                )}
              </td>
              <td className="px-3 py-1 text-center text-slate-400">
                {prediction.favoredWrestler === 'even' && 'Toss-up'}
              </td>
              <td className="px-3 py-1 text-right">
                {prediction.favoredWrestler === 'a' && (
                  <span className="font-bold text-slate-900">{prediction.outcomeLabel}</span>
                )}
              </td>
            </tr>

            {/* ── Head to Head ── */}
            <tr className="bg-slate-50 border-b border-slate-200">
              <td colSpan={3} className="px-3 py-1 text-xs font-semibold text-slate-700 uppercase tracking-widest">
                Head to Head
              </td>
            </tr>
            <tr className="border-b border-slate-100 bg-white">
              <td className="px-3 py-1">
                <span className={`font-bold ${bWins >= aWins ? 'text-slate-900' : 'text-slate-400'}`}>{bWins}</span>
              </td>
              <td className="px-3 py-1 text-center text-slate-400">head-to-head</td>
              <td className="px-3 py-1 text-right">
                <span className={`font-bold ${aWins >= bWins ? 'text-slate-900' : 'text-slate-400'}`}>{aWins}</span>
              </td>
            </tr>
            {directMatches.length === 0 ? (
              <tr className="border-b border-slate-100 bg-slate-50">
                <td colSpan={3} className="px-3 py-4 text-center text-slate-400">No direct matchups found.</td>
              </tr>
            ) : directMatches.map((m, i) => (
              <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="px-3 py-1 text-left">
                  {m.winner === 'b' && <span className="font-semibold text-slate-900">{resultLabel(m.resultType, m.detail)}</span>}
                </td>
                <td className="px-3 py-1 text-center text-slate-500">
                  <span>{m.date}</span>
                  <span className="text-slate-400 ml-1">{m.event}</span>
                  {m.weightClass && <span className="text-slate-300 ml-1">{m.weightClass} lbs</span>}
                </td>
                <td className="px-3 py-1 text-right">
                  {m.winner === 'a' && <span className="font-semibold text-slate-900">{resultLabel(m.resultType, m.detail)}</span>}
                </td>
              </tr>
            ))}

            {/* ── Common Opponents ── */}
            <tr className="bg-slate-50 border-b border-slate-200">
              <td colSpan={3} className="px-3 py-1 text-xs font-semibold text-slate-700 uppercase tracking-widest">
                Common Opponents ({commonOpponents.length})
              </td>
            </tr>
            {commonOpponents.length === 0 ? (
              <tr className="bg-white">
                <td colSpan={3} className="px-3 py-4 text-center text-slate-400">No common opponents found.</td>
              </tr>
            ) : commonOpponents.map((opp, i) => {
              const edge = edges[i]
              return (
                <tr key={i} className={`border-b border-slate-100 hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className={`px-3 py-1 text-left ${edge === 'b' ? 'bg-green-50' : ''}`}>
                    <span className={`font-semibold ${opp.bWins > opp.bLosses ? 'text-green-700' : opp.bWins < opp.bLosses ? 'text-red-600' : 'text-slate-500'}`}>
                      {opp.bWins}–{opp.bLosses}
                    </span>
                    {opp.bMatches.map((m, j) => (
                      <span key={j} className={`ml-1 ${m.won ? 'text-green-700' : 'text-red-600'}`}>
                        {j > 0 && <span className="text-slate-300 mx-0.5">·</span>}
                        {m.won ? 'W' : 'L'} {resultLabel(m.resultType, m.detail)}
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-1 text-center">
                    <Link href={`/wrestler/${opp.opponent.id}`} className="font-medium text-slate-900 hover:underline">
                      {opp.opponent.first_name} {opp.opponent.last_name}
                    </Link>
                  </td>
                  <td className={`px-3 py-1 text-right ${edge === 'a' ? 'bg-green-50' : ''}`}>
                    <span className={`font-semibold ${opp.aWins > opp.aLosses ? 'text-green-700' : opp.aWins < opp.aLosses ? 'text-red-600' : 'text-slate-500'}`}>
                      {opp.aWins}–{opp.aLosses}
                    </span>
                    {opp.aMatches.map((m, j) => (
                      <span key={j} className={`ml-1 ${m.won ? 'text-green-700' : 'text-red-600'}`}>
                        {j > 0 && <span className="text-slate-300 mx-0.5">·</span>}
                        {resultLabel(m.resultType, m.detail)} {m.won ? 'W' : 'L'}
                      </span>
                    ))}
                  </td>
                </tr>
              )
            })}

            {/* Common opp footer */}
            {commonOpponents.length > 0 && (
              <>
                <tr className="bg-slate-50 border-t border-slate-300 border-b border-slate-100">
                  <td className="px-3 py-1 text-left">
                    <span className={`font-bold ${totalBWins >= totalBLosses ? 'text-slate-900' : 'text-slate-500'}`}>{totalBWins}–{totalBLosses}</span>
                  </td>
                  <td className="px-3 py-1 text-center text-slate-400">record vs common opp.</td>
                  <td className="px-3 py-1 text-right">
                    <span className={`font-bold ${totalAWins >= totalALosses ? 'text-slate-900' : 'text-slate-500'}`}>{totalAWins}–{totalALosses}</span>
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-3 py-1 text-left">
                    <span className={`font-bold ${betterB > betterA ? 'text-slate-900' : 'text-slate-400'}`}>{betterB}</span>
                  </td>
                  <td className="px-3 py-1 text-center text-slate-400">better outcomes</td>
                  <td className="px-3 py-1 text-right">
                    <span className={`font-bold ${betterA > betterB ? 'text-slate-900' : 'text-slate-400'}`}>{betterA}</span>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Head-to-Head</h1>
      <p className="text-sm text-slate-500 mb-8">Compare two wrestlers — direct matchups and common opponents.</p>

      {/* Wrestler pickers — B left, A right */}
      <div className="grid grid-cols-3 items-start mb-10">
        <WrestlerSearch label="Wrestler B" value={wrestlerB} onChange={setWrestlerB} align="left" gender={gender} />
        <div className="flex items-center justify-center pt-6 text-slate-300 font-bold text-xl select-none">vs</div>
        <WrestlerSearch label="Wrestler A" value={wrestlerA} onChange={setWrestlerA} align="right" gender={gender} />
      </div>

      {loading && <div className="text-sm text-slate-400 text-center py-10">Loading…</div>}
      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!loading && !error && !data && (
        <p className="text-sm text-slate-400 text-center py-10">
          {wrestlerA && !wrestlerB ? 'Select a second wrestler to compare.' : 'Select two wrestlers to see their head-to-head history and common opponents.'}
        </p>
      )}

      {renderTable()}
    </div>
  )
}
