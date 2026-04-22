'use client'

import { useState } from 'react'
import type { ParsedMeet, ParsedMatch } from '@/lib/parseDualMeet'
import type { SchoolMatch } from '@/lib/matchSchools'
import type { WrestlerMatch } from '@/lib/matchWrestlers'
import {
  type SchoolOverride,
  type WrestlerOverride,
  makeWrestlerKey,
  resolveSchool,
  resolveWrestler,
} from './types'

// ── Confidence dot ─────────────────────────────────────────────────────────────

const DOT_COLOR: Record<string, string> = {
  exact: 'bg-green-500',
  high:  'bg-yellow-400',
  low:   'bg-orange-400',
  none:  'bg-red-500',
}

function ConfidenceDot({ confidence, title }: { confidence: string; title?: string }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${DOT_COLOR[confidence] ?? 'bg-slate-400'}`}
      title={title ?? confidence}
    />
  )
}

// ── Wrestler cell ──────────────────────────────────────────────────────────────

function WrestlerCell({
  name,
  schoolRaw,
  wKey,
  resolutions,
  overrides,
}: {
  name:        string | null
  schoolRaw:   string | null
  wKey:        string
  resolutions: Record<string, WrestlerMatch>
  overrides:   Record<string, WrestlerOverride>
}) {
  if (!name) return <span className="text-slate-400 text-xs">—</span>

  const resolved = resolveWrestler(wKey, resolutions, overrides)

  return (
    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
      <ConfidenceDot confidence={resolved.confidence} title={`Wrestler: ${resolved.confidence}`} />
      <span className="text-xs text-slate-800 truncate">{name}</span>
      {schoolRaw && (
        <span className="text-[11px] text-slate-400 shrink-0">({schoolRaw})</span>
      )}
      {resolved.isNew && (
        <span className="text-[10px] font-bold px-1 py-0.5 bg-red-100 text-red-700 border border-red-300 shrink-0">
          NEW
        </span>
      )}
    </div>
  )
}

// ── Result cell ────────────────────────────────────────────────────────────────

function ResultCell({ m }: { m: ParsedMatch }) {
  if (m.isDoubleForfeit) return <span className="text-xs text-slate-400 italic">Double Forfeit</span>
  if (m.isForfeitWin)    return <span className="text-xs text-slate-500">Forfeit</span>
  const detail = m.resultDetail ? ` ${m.resultDetail}` : ''
  return <span className="text-xs text-slate-700">{m.resultType}{detail}</span>
}

// ── Props ──────────────────────────────────────────────────────────────────────

type Props = {
  meet:                 ParsedMeet
  schoolResolutions:    Record<string, SchoolMatch>
  schoolOverrides:      Record<string, SchoolOverride>
  wrestlerResolutions:  Record<string, WrestlerMatch>
  wrestlerOverrides:    Record<string, WrestlerOverride>
  skip:                 boolean
  onSkipChange:         (skip: boolean) => void
}

// ── MeetCard ───────────────────────────────────────────────────────────────────

export function MeetCard({
  meet,
  schoolResolutions,
  schoolOverrides,
  wrestlerResolutions,
  wrestlerOverrides,
  skip,
  onSkipChange,
}: Props) {
  const [expanded, setExpanded] = useState(!meet.isDuplicate)

  // DEBUG — remove before ship
  console.log('[MeetCard] meet prop:', {
    team1Name:   meet.team1Name,
    team2Name:   meet.team2Name,
    date:        meet.date,
    matchCount:  meet.matches?.length,
    matches:     meet.matches,
    isDuplicate: meet.isDuplicate,
    rawTextSnip: meet.rawText?.slice(0, 120),
  })

  const s1 = resolveSchool(meet.team1Name, schoolResolutions, schoolOverrides)
  const s2 = resolveSchool(meet.team2Name, schoolResolutions, schoolOverrides)

  // Per-match stats
  const matchRows = meet.matches.filter(m => !m.isDoubleForfeit)
  let exact = 0, newW = 0, review = 0
  for (const m of matchRows) {
    for (const [name, schoolRaw] of [
      [m.winnerName, m.winnerSchoolRaw] as const,
      ...(!m.isForfeitWin ? [[m.loserName, m.loserSchoolRaw] as const] : []),
    ]) {
      if (!name) continue
      const schoolId = resolveSchool(schoolRaw ?? '', schoolResolutions, schoolOverrides).schoolId
      const key = makeWrestlerKey(name, schoolId, m.weightClass)
      const resolved = resolveWrestler(key, wrestlerResolutions, wrestlerOverrides)
      if (resolved.isNew)                    newW++
      else if (resolved.confidence === 'exact') exact++
      else if (resolved.confidence === 'low')   review++
    }
  }

  return (
    <div className={`border border-black bg-white ${skip ? 'opacity-50' : ''}`}>

      {/* ── Duplicate banner ──────────────────────────────────────────────────── */}
      {meet.isDuplicate && (
        <div className="bg-red-600 text-white text-xs font-semibold px-3 py-1.5 flex items-center justify-between">
          <span>DUPLICATE — already imported</span>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-white/80 hover:text-white ml-4"
          >
            {expanded ? 'Collapse ▲' : 'Expand ▼'}
          </button>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-black/10">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* School 1 */}
          <div className="flex items-center gap-1.5">
            <ConfidenceDot confidence={s1.confidence} title={`School: ${s1.confidence}`} />
            <span className="font-semibold text-sm text-slate-900">
              {s1.displayName ?? meet.team1Name}
            </span>
          </div>
          <span className="text-slate-400 text-sm shrink-0">vs.</span>
          {/* School 2 */}
          <div className="flex items-center gap-1.5">
            <ConfidenceDot confidence={s2.confidence} title={`School: ${s2.confidence}`} />
            <span className="font-semibold text-sm text-slate-900">
              {s2.displayName ?? meet.team2Name}
            </span>
          </div>
          <span className="text-slate-400 text-sm shrink-0 ml-1">({meet.date})</span>
          <span className="text-slate-500 text-sm ml-2 shrink-0">
            {meet.team1Score}–{meet.team2Score}
          </span>
        </div>

        {/* Skip + expand controls */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {!meet.isDuplicate && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              {expanded ? 'Collapse ▲' : 'Expand ▼'}
            </button>
          )}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={skip}
              onChange={e => onSkipChange(e.target.checked)}
              className="accent-black w-3.5 h-3.5"
            />
            <span className="text-xs text-slate-600">Skip</span>
          </label>
        </div>
      </div>

      {/* ── Match table ───────────────────────────────────────────────────────── */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-black/10">
                <th className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 w-12">Wt</th>
                <th className="px-3 py-1.5 text-[11px] font-semibold text-slate-500">Winner</th>
                <th className="px-3 py-1.5 text-[11px] font-semibold text-slate-500">Loser</th>
                <th className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 w-28">Result</th>
                <th className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 w-16 text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {meet.matches.map((m, i) => {
                const winnerSchoolId = resolveSchool(
                  m.winnerSchoolRaw ?? '', schoolResolutions, schoolOverrides
                ).schoolId
                const loserSchoolId = resolveSchool(
                  m.loserSchoolRaw ?? '', schoolResolutions, schoolOverrides
                ).schoolId
                const wKey = m.winnerName
                  ? makeWrestlerKey(m.winnerName, winnerSchoolId, m.weightClass)
                  : ''
                const lKey = m.loserName && !m.isForfeitWin && !m.isDoubleForfeit
                  ? makeWrestlerKey(m.loserName, loserSchoolId, m.weightClass)
                  : ''

                return (
                  <tr
                    key={i}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="px-3 py-2 text-xs font-mono text-slate-600">{m.weightClass}</td>

                    <td className="px-3 py-2">
                      {m.isDoubleForfeit
                        ? <span className="text-xs text-slate-400 italic col-span-2">Double Forfeit</span>
                        : <WrestlerCell
                            name={m.winnerName}
                            schoolRaw={m.winnerSchoolRaw}
                            wKey={wKey}
                            resolutions={wrestlerResolutions}
                            overrides={wrestlerOverrides}
                          />
                      }
                    </td>

                    <td className="px-3 py-2">
                      {!m.isDoubleForfeit && (
                        m.isForfeitWin
                          ? <span className="text-xs text-slate-400 italic">Forfeit</span>
                          : <WrestlerCell
                              name={m.loserName}
                              schoolRaw={m.loserSchoolRaw}
                              wKey={lKey}
                              resolutions={wrestlerResolutions}
                              overrides={wrestlerOverrides}
                            />
                      )}
                    </td>

                    <td className="px-3 py-2">
                      <ResultCell m={m} />
                    </td>

                    <td className="px-3 py-2 text-xs text-center text-slate-500 font-mono">
                      {m.team1Points}–{m.team2Points}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Summary line ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 bg-slate-50 border-t border-black/10 flex flex-wrap gap-x-4 gap-y-1">
        <span className="text-[11px] text-slate-500">{meet.matches.length} matches</span>
        <span className="text-[11px] text-green-700">{exact} exact</span>
        {newW > 0  && <span className="text-[11px] text-red-600">{newW} new wrestlers</span>}
        {review > 0 && <span className="text-[11px] text-orange-600">{review} need review</span>}
        {meet.isDuplicate && <span className="text-[11px] font-semibold text-red-600">DUPLICATE</span>}
      </div>
    </div>
  )
}
