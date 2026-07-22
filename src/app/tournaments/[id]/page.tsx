import { supabase, ROUND_LABEL, ROUND_ORDER } from '@/lib/supabase'
import { createSupabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tournament = {
  id: string
  name: string
  start_date: string
  end_date: string | null
  location: string | null
}

type SchoolJoin = { display_name: string; is_nj: boolean } | null

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start + 'T12:00:00')
  const sLong = s.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  if (!end || end === start) return sLong
  const e = new Date(end + 'T12:00:00')
  if (s.getFullYear() === e.getFullYear()) {
    if (s.getMonth() === e.getMonth()) {
      return `${s.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}–${e.getDate()}, ${s.getFullYear()}`
    }
    return `${s.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
  }
  return `${sLong} – ${e.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
}

function formatResult(type: string | null, detail: string | null, fallSecs: number | null): string {
  if (!type) return '—'
  const upper = type.toUpperCase()
  if (upper === 'FALL') {
    if (fallSecs) {
      const m = Math.floor(fallSecs / 60)
      const s = String(fallSecs % 60).padStart(2, '0')
      return `Fall ${m}:${s}`
    }
    return 'Fall'
  }
  if (upper === 'FOR' || upper === 'FORF' || upper === 'FORFEIT') return 'Forfeit'
  if (upper === 'DFF' || upper === 'DOUBLE FORFEIT') return 'Double Forfeit'
  if (detail) return `${type} ${detail}`
  return type
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TournamentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ w?: string }>
}) {
  const { id } = await params
  const { w } = await searchParams

  const authClient = await createSupabaseServer()
  const { data: { user } } = await authClient.auth.getUser()
  const isAdmin = !!user

  const [{ data: tournData }, { data: weightsData }] = await Promise.all([
    supabase
      .from('in_season_tournaments')
      .select('id, name, start_date, end_date, location')
      .eq('id', id)
      .single(),
    supabase
      .from('tournament_bouts')
      .select('weight_class')
      .eq('in_season_tournament_id', id)
      .order('weight_class'),
  ])

  if (!tournData) notFound()
  const tournament = tournData as unknown as Tournament

  const weights = [
    ...new Set((weightsData ?? []).map((r: { weight_class: number }) => r.weight_class)),
  ].sort((a, b) => a - b)

  const selectedWeight = w ? parseInt(w, 10) : (weights[0] ?? null)

  let bouts: Bout[] = []
  if (selectedWeight !== null) {
    const { data: boutData } = await supabase
      .from('tournament_bouts')
      .select(`
        id, weight_class, round, winner,
        result_type, result_detail, fall_time_seconds,
        nj_wrestler1_id, wrestler1_name_raw, wrestler1_school_raw,
        nj_wrestler2_id, wrestler2_name_raw, wrestler2_school_raw,
        wrestler1_school:schools!wrestler1_school_id(display_name, is_nj),
        wrestler2_school:schools!wrestler2_school_id(display_name, is_nj)
      `)
      .eq('in_season_tournament_id', id)
      .eq('weight_class', selectedWeight)
    bouts = (boutData ?? []) as unknown as Bout[]
  }

  // Group bouts by round in ROUND_ORDER order
  const boutsByRound = new Map<string, Bout[]>()
  for (const b of bouts) {
    if (!boutsByRound.has(b.round)) boutsByRound.set(b.round, [])
    boutsByRound.get(b.round)!.push(b)
  }
  const rounds = [...boutsByRound.keys()].sort(
    (a, b) => (ROUND_ORDER[a] ?? 99) - (ROUND_ORDER[b] ?? 99),
  )

  const dateStr = formatDateRange(tournament.start_date, tournament.end_date)
  const subtitle = [dateStr, tournament.location].filter(Boolean).join(' · ')

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/tournaments"
        className="text-sm text-slate-500 hover:text-slate-700 hover:underline mb-4 inline-block"
      >
        ← All Tournaments
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">{tournament.name}</h1>
      {subtitle && <p className="text-sm text-slate-500 mb-6">{subtitle}</p>}

      {weights.length === 0 ? (
        <div className="border border-black rounded-none bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No bouts recorded for this tournament.</p>
        </div>
      ) : (
        <>
          {/* Weight class pills */}
          <div className="flex flex-wrap gap-1.5 mb-6" role="group" aria-label="Weight class">
            {weights.map(wt => (
              <Link
                key={wt}
                href={`/tournaments/${id}?w=${wt}`}
                aria-current={wt === selectedWeight ? 'true' : undefined}
                className={`px-3 py-1 text-sm font-medium border border-black rounded-none transition-colors ${
                  wt === selectedWeight
                    ? 'bg-black text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {wt}
              </Link>
            ))}
          </div>

          {/* Bouts grouped by round */}
          <div className="space-y-5">
            {rounds.map(round => (
              <div key={round}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  {ROUND_LABEL[round] ?? round}
                </p>
                <div className="border border-black rounded-none overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {boutsByRound.get(round)!.map(bout => {
                        const s1 = bout.wrestler1_school
                        const s2 = bout.wrestler2_school
                        const school1 = s1?.display_name ?? bout.wrestler1_school_raw
                        const school2 = s2?.display_name ?? bout.wrestler2_school_raw
                        const w1isNJ = s1?.is_nj ?? false
                        const w2isNJ = s2?.is_nj ?? false
                        const won1 = bout.winner === 1
                        const won2 = bout.winner === 2
                        const resultStr = formatResult(
                          bout.result_type,
                          bout.result_detail,
                          bout.fall_time_seconds,
                        )
                        const editHref = `/admin/bracket?mode=in-season&tid=${id}&boutId=${bout.id}&w=${selectedWeight}`

                        return (
                          <tr key={bout.id} className="hover:bg-slate-50 group">
                            {/* Wrestler 1 */}
                            <td className="px-4 py-2.5 w-[38%]">
                              <div
                                className={`font-medium ${
                                  bout.winner !== null
                                    ? won1 ? 'text-slate-900' : 'text-slate-400'
                                    : 'text-slate-800'
                                }`}
                              >
                                {bout.nj_wrestler1_id && w1isNJ ? (
                                  <Link
                                    href={`/wrestler/${bout.nj_wrestler1_id}`}
                                    className="hover:underline"
                                  >
                                    {bout.wrestler1_name_raw}
                                  </Link>
                                ) : (
                                  bout.wrestler1_name_raw
                                )}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">{school1}</div>
                            </td>

                            {/* Result connector */}
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

                            {/* Wrestler 2 */}
                            <td className="px-4 py-2.5 w-[38%] text-right">
                              <div
                                className={`font-medium ${
                                  bout.winner !== null
                                    ? won2 ? 'text-slate-900' : 'text-slate-400'
                                    : 'text-slate-800'
                                }`}
                              >
                                {bout.nj_wrestler2_id && w2isNJ ? (
                                  <Link
                                    href={`/wrestler/${bout.nj_wrestler2_id}`}
                                    className="hover:underline"
                                  >
                                    {bout.wrestler2_name_raw}
                                  </Link>
                                ) : (
                                  bout.wrestler2_name_raw
                                )}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">{school2}</div>
                            </td>

                            {/* Admin edit link — only visible when logged in */}
                            {isAdmin && (
                              <td className="pr-3 py-2.5 w-8 text-right">
                                <Link
                                  href={editHref}
                                  title="Edit this bout"
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
        </>
      )}
    </div>
  )
}
