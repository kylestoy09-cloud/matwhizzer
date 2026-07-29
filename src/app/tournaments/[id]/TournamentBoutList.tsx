'use client'

import Link from 'next/link'

type School = { id: number; display_name: string; is_nj: boolean }

type Bout = {
  id: string
  weight_class: number
  round: string
  winner: 1 | 2 | null
  result_type: string | null
  result_detail: string | null
  fall_time_seconds: number | null
  result_time_estimated: boolean
  winner_score: number | null
  loser_score: number | null
  wrestler1_id: string | null
  wrestler1_name_raw: string
  wrestler1_school_raw: string
  wrestler1_school: School | null
  wrestler2_id: string | null
  wrestler2_name_raw: string
  wrestler2_school_raw: string
  wrestler2_school: School | null
}

const ROUND_ORDER: Record<string, number> = {
  // Championship bracket (early → late)
  'PL': 1, 'R1': 2, 'R2': 3, 'R3': 4, 'R4': 5,
  'QF': 6, 'SF': 7, 'F': 8,
  // Place matches
  '3rd_Place': 9, '5th_Place': 10, '7th_Place': 11,
  // Consolation bracket (latest → earliest)
  'CF': 12, 'CSF': 13, 'CQF': 14,
  'C8': 15, 'C7': 16, 'C6': 17, 'C5': 18,
  'C4': 19, 'C3': 20, 'C2': 21, 'C1': 22,
  'Exhibition': 30,
  'UNK': 98, 'V': 99,
}

const ROUND_LABEL: Record<string, string> = {
  'R1': 'Round 1',     'R2': 'Round 2',     'R3': 'Round 3',     'R4': 'Round 4',
  'C1': 'Cons. R1',   'C2': 'Cons. R2',   'C3': 'Cons. R3',   'C4': 'Cons. R4',
  'C5': 'Cons. R5',   'C6': 'Cons. R6',   'C7': 'Cons. R7',   'C8': 'Cons. R8',
  'QF': 'Quarters',   'CQF': 'Cons. QF',
  'SF': 'Semis',      'CSF': 'Cons. SF',   'CF': 'Cons. Finals',
  '7th_Place': '7th', '5th_Place': '5th',  '3rd_Place': '3rd',
  'F': 'Finals',
  'Exhibition': 'Exhibition',
  'PL': 'Prelim',
  'UNK': '—',         'V': 'Varsity',
}

function fmtTime(secs: number): string {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

function getResultLabel(rt: string | null): string {
  if (!rt) return '—'
  const up = rt.toUpperCase()
  if (up === 'FALL') return 'Fall'
  if (up === 'TF')   return 'TF'
  if (up === 'MD')   return 'MD'
  if (up === 'DFF')  return 'DFF'
  if (up === 'FOR' || up === 'FORF' || up === 'FORFEIT') return 'For.'
  if (up === 'BYE')  return 'Bye'
  return rt
}

function getScore(rt: string | null, detail: string | null): string {
  if (!rt) return ''
  const up = rt.toUpperCase()
  if (up === 'FALL' || up === 'DFF' || up === 'BYE') return ''
  if (up === 'FOR' || up === 'FORF' || up === 'FORFEIT') return ''
  return detail ?? ''
}

function getTime(rt: string | null, secs: number | null, estimated: boolean): string {
  if (!rt || estimated || !secs) return ''
  const up = rt.toUpperCase()
  if (up === 'FALL' || up === 'TF') return fmtTime(secs)
  return ''
}

function resultColor(rt: string | null): string {
  const up = (rt ?? '').toUpperCase()
  if (up === 'FALL')  return 'text-purple-700'
  if (up === 'TF')    return 'text-blue-700'
  if (up === 'MD')    return 'text-teal-700'
  return 'text-slate-600'
}

export function TournamentBoutList({
  bouts,
  tournamentId,
  selectedWeight,
  isAdmin,
}: {
  bouts: Bout[]
  tournamentId: string
  selectedWeight: number
  isAdmin: boolean
}) {
  const sorted = [...bouts].sort((a, b) => {
    const ao = ROUND_ORDER[a.round] ?? 50
    const bo = ROUND_ORDER[b.round] ?? 50
    return ao - bo
  })

  if (sorted.length === 0) {
    return (
      <div className="border border-black bg-white p-6 text-center text-sm text-slate-400">
        No bouts recorded for this weight.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[640px] w-full text-[13px]">
        <thead>
          <tr className="bg-slate-900 text-white">
            <th className="text-left px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap w-20">Round</th>
            <th className="text-left px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Winner</th>
            <th className="text-left px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">School</th>
            <th className="text-left px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap w-14">Result</th>
            <th className="text-right px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap w-16">Score</th>
            <th className="text-right px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap w-14">Time</th>
            <th className="text-left px-2 py-1.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Loser</th>
            {isAdmin && <th className="w-6" />}
          </tr>
        </thead>
        <tbody>
          {sorted.map((b, i) => {
            const isBye = (b.result_type ?? '').toUpperCase() === 'BYE'
            const isDff = (b.result_type ?? '').toUpperCase() === 'DFF'

            const winnerName   = b.winner === 1 ? b.wrestler1_name_raw : b.winner === 2 ? b.wrestler2_name_raw : null
            const winnerId     = b.winner === 1 ? b.wrestler1_id        : b.winner === 2 ? b.wrestler2_id        : null
            const winnerSchool = b.winner === 1
              ? (b.wrestler1_school?.display_name ?? b.wrestler1_school_raw)
              : b.winner === 2
              ? (b.wrestler2_school?.display_name ?? b.wrestler2_school_raw)
              : null
            const loserName    = b.winner === 1 ? b.wrestler2_name_raw : b.winner === 2 ? b.wrestler1_name_raw : null
            const loserId      = b.winner === 1 ? b.wrestler2_id        : b.winner === 2 ? b.wrestler1_id        : null
            const loserSchool  = b.winner === 1
              ? (b.wrestler2_school?.display_name ?? b.wrestler2_school_raw)
              : b.winner === 2
              ? (b.wrestler1_school?.display_name ?? b.wrestler1_school_raw)
              : null

            return (
              <tr key={b.id} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                {/* Round */}
                <td className="px-2 py-1.5 text-slate-500 text-xs whitespace-nowrap">
                  {ROUND_LABEL[b.round] ?? b.round}
                </td>

                {/* Winner */}
                <td className="px-2 py-1.5 text-xs font-medium">
                  {isBye ? (
                    b.wrestler1_id
                      ? <Link href={`/wrestler/${b.wrestler1_id}`} className="text-slate-800 hover:underline">{b.wrestler1_name_raw}</Link>
                      : <span className="text-slate-800">{b.wrestler1_name_raw}</span>
                  ) : isDff || !winnerName ? (
                    <span className="text-slate-300">—</span>
                  ) : winnerId ? (
                    <Link href={`/wrestler/${winnerId}`} className="text-slate-800 hover:underline">{winnerName}</Link>
                  ) : (
                    <span className="text-slate-800">{winnerName}</span>
                  )}
                </td>

                {/* Winner school */}
                <td className="px-2 py-1.5 text-slate-400 text-xs">
                  {isBye
                    ? (b.wrestler1_school?.display_name ?? b.wrestler1_school_raw)
                    : isDff ? '—' : (winnerSchool ?? '—')}
                </td>

                {/* Result */}
                <td className="px-2 py-1.5 text-xs">
                  <span className={`font-medium ${resultColor(b.result_type)}`}>
                    {getResultLabel(b.result_type)}
                  </span>
                </td>

                {/* Score */}
                <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-slate-500">
                  {getScore(b.result_type, b.result_detail) || <span className="text-slate-300">—</span>}
                </td>

                {/* Time */}
                <td className="px-2 py-1.5 text-right font-mono text-xs tabular-nums text-slate-500">
                  {getTime(b.result_type, b.fall_time_seconds, b.result_time_estimated) || <span className="text-slate-300">—</span>}
                </td>

                {/* Loser */}
                <td className="px-2 py-1.5 text-xs">
                  {isBye ? (
                    <span className="text-slate-300 italic">bye</span>
                  ) : isDff ? (
                    <span className="text-slate-400 text-xs">
                      {b.wrestler1_name_raw}
                      {b.wrestler1_school && <span className="ml-1 text-slate-300">{b.wrestler1_school.display_name}</span>}
                      <span className="mx-1 text-slate-300">/</span>
                      {b.wrestler2_name_raw}
                      {b.wrestler2_school && <span className="ml-1 text-slate-300">{b.wrestler2_school.display_name}</span>}
                    </span>
                  ) : loserName ? (
                    <span>
                      {loserId
                        ? <Link href={`/wrestler/${loserId}`} className="text-slate-700 hover:underline">{loserName}</Link>
                        : <span className="text-slate-700">{loserName}</span>}
                      {loserSchool && <span className="ml-1.5 text-slate-400">{loserSchool}</span>}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>

                {/* Admin edit */}
                {isAdmin && (
                  <td className="px-1 py-1.5 text-right">
                    <Link
                      href={`/admin/bracket?mode=in-season&tid=${tournamentId}&boutId=${b.id}&w=${selectedWeight}`}
                      className="text-slate-300 hover:text-slate-600 text-xs"
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
  )
}
