'use client'

import { useState } from 'react'
import Link from 'next/link'

type School = { id: number; display_name: string; is_nj: boolean }
type SchoolJoin = School | null

type Bout = {
  id: string
  weight_class: number
  round: string
  winner: 1 | 2 | null
  result_type: string | null
  result_detail: string | null
  fall_time_seconds: number | null
  nj_wrestler1_id: string | null
  wrestler1_name_raw: string
  wrestler1_school_raw: string
  wrestler1_school: SchoolJoin
  nj_wrestler2_id: string | null
  wrestler2_name_raw: string
  wrestler2_school_raw: string
  wrestler2_school: SchoolJoin
}

type RoundEntry = { label: string; bouts: Bout[] }

const ROUND_ORDER: Record<string, number> = {
  PL: -1,
  R1: 0, R2: 1, R3: 2, R4: 3, R5: 4,
  QF: 5, SF: 6, F: 7,
  C1: 10, C2: 11, C3: 12, C4: 13, C5: 14, C6: 15, C7: 16,
  CQF: 17, CSF: 18, CF: 19,
  '3rd_Place': 20, '5th_Place': 21, '7th_Place': 22,
  V: 23, UNK: 99,
}

const ROUND_LABEL: Record<string, string> = {
  PL: 'Prelim',
  R1: 'Round 1', R2: 'Round 2', R3: 'Round 3', R4: 'Round 4', R5: 'Round 5',
  QF: 'Quarterfinal', SF: 'Semifinal', F: 'Final',
  C1: 'Cons. R1', C2: 'Cons. R2', C3: 'Cons. R3', C4: 'Cons. R4',
  C5: 'Cons. R5', C6: 'Cons. R6', C7: 'Cons. R7',
  CQF: 'Cons. Quarters', CSF: 'Cons. Semis', CF: 'Cons. Final',
  '3rd_Place': '3rd Place', '5th_Place': '5th Place', '7th_Place': '7th Place',
  V: 'Varsity', UNK: 'Unknown',
}

function formatResult(type: string | null, detail: string | null, secs: number | null): string {
  if (!type) return '—'
  const up = type.toUpperCase()
  if (up === 'FALL') {
    if (secs) {
      const m = Math.floor(secs / 60)
      const s = String(secs % 60).padStart(2, '0')
      return `Fall ${m}:${s}`
    }
    return detail ? `Fall ${detail}` : 'Fall'
  }
  if (up === 'FOR' || up === 'FORF' || up === 'FORFEIT') return 'Forfeit'
  if (up === 'DFF' || up === 'DOUBLE FORFEIT') return 'Double Forfeit'
  if (detail) return `${type} ${detail}`
  return type
}

function groupByRound(bouts: Bout[]): RoundEntry[] {
  const map = new Map<string, Bout[]>()
  for (const b of bouts) {
    if (!map.has(b.round)) map.set(b.round, [])
    map.get(b.round)!.push(b)
  }
  return [...map.entries()]
    .sort(([a], [b]) => (ROUND_ORDER[a] ?? 99) - (ROUND_ORDER[b] ?? 99))
    .map(([round, bouts]) => ({ label: ROUND_LABEL[round] ?? round, bouts }))
}

export function TournamentBoutList({
  bouts,
  schools,
  tournamentId,
  selectedWeight,
  isAdmin,
}: {
  bouts: Bout[]
  schools: School[]
  tournamentId: string
  selectedWeight: number
  isAdmin: boolean
}) {
  const [teamFilter, setTeamFilter] = useState<number | null>(null)

  const filtered = teamFilter === null
    ? bouts
    : bouts.filter(
        b =>
          b.wrestler1_school?.id === teamFilter ||
          b.wrestler2_school?.id === teamFilter,
      )

  const rounds = groupByRound(filtered)

  return (
    <div>
      {/* Team filter */}
      {schools.length > 1 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500 font-medium">Filter by team:</span>
          <select
            value={teamFilter ?? ''}
            onChange={e => setTeamFilter(e.target.value ? Number(e.target.value) : null)}
            className="text-sm border border-slate-300 rounded-none px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="">All teams</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.display_name}</option>
            ))}
          </select>
          {teamFilter !== null && (
            <button
              onClick={() => setTeamFilter(null)}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* Bouts grouped by round */}
      {rounds.length === 0 ? (
        <p className="text-sm text-slate-400">No bouts match the current filter.</p>
      ) : (
        <div className="space-y-5">
          {rounds.map(({ label, bouts: rb }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                {label}
              </p>
              <div className="border border-black rounded-none overflow-hidden bg-white">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {rb.map(bout => {
                      const s1 = bout.wrestler1_school
                      const s2 = bout.wrestler2_school
                      const school1 = s1?.display_name ?? bout.wrestler1_school_raw
                      const school2 = s2?.display_name ?? bout.wrestler2_school_raw
                      const won1 = bout.winner === 1
                      const won2 = bout.winner === 2
                      const resultStr = formatResult(
                        bout.result_type, bout.result_detail, bout.fall_time_seconds,
                      )
                      const editHref = `/admin/bracket?mode=in-season&tid=${tournamentId}&boutId=${bout.id}&w=${selectedWeight}`

                      return (
                        <tr key={bout.id} className="hover:bg-slate-50 group">
                          <td className="px-4 py-2.5 w-[38%]">
                            <div className={`font-medium ${bout.winner !== null ? won1 ? 'text-slate-900' : 'text-slate-400' : 'text-slate-800'}`}>
                              {bout.nj_wrestler1_id && s1?.is_nj ? (
                                <Link href={`/wrestler/${bout.nj_wrestler1_id}`} className="hover:underline">
                                  {bout.wrestler1_name_raw}
                                </Link>
                              ) : bout.wrestler1_name_raw}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{school1}</div>
                          </td>

                          <td className="px-2 py-2.5 text-center w-[24%]">
                            {bout.winner !== null ? (
                              <span className="text-xs text-slate-500">
                                {won1 ? 'def.' : 'lost to'}{' '}
                                <span className="font-medium">{resultStr}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">vs</span>
                            )}
                          </td>

                          <td className="px-4 py-2.5 w-[38%] text-right">
                            <div className={`font-medium ${bout.winner !== null ? won2 ? 'text-slate-900' : 'text-slate-400' : 'text-slate-800'}`}>
                              {bout.nj_wrestler2_id && s2?.is_nj ? (
                                <Link href={`/wrestler/${bout.nj_wrestler2_id}`} className="hover:underline">
                                  {bout.wrestler2_name_raw}
                                </Link>
                              ) : bout.wrestler2_name_raw}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{school2}</div>
                          </td>

                          {isAdmin && (
                            <td className="pr-3 py-2.5 w-8 text-right">
                              <Link
                                href={editHref}
                                title="Edit"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600 text-xs"
                              >
                                ✎
                              </Link>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
