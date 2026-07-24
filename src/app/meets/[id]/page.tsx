export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SEASONS } from '@/lib/seasons'

/* eslint-disable @next/next/no-img-element */
type School = { id: number; display_name: string; logo_url: string | null; is_nj: boolean }

type DualMeet = {
  id: string
  season_id: number
  meet_date: string
  team1_score: number | null
  team2_score: number | null
  gender: string
  status: string
  team1: School | null
  team2: School | null
  team1_school_name_raw: string | null
  team2_school_name_raw: string | null
}

type MatchRow = {
  id: string
  weight_class: number
  result_type: string | null
  result_detail: string | null
  fall_time_seconds: number | null
  is_double_forfeit: boolean
  is_forfeit_win: boolean
  winner_id: string | null
  wrestler_a_id: string | null
  wrestler_b_id: string | null
  wrestler_a_name_raw: string | null
  wrestler_b_name_raw: string | null
  wrestler_a: { id: string; first_name: string; last_name: string; is_stub: boolean } | null
  wrestler_b: { id: string; first_name: string; last_name: string; is_stub: boolean } | null
}

function resultLabel(m: MatchRow): string {
  if (m.is_double_forfeit) return 'Double Forfeit'
  if (m.is_forfeit_win)    return 'Forfeit'
  if (!m.result_type)      return '—'
  const rt = m.result_type
  if (rt.toLowerCase() === 'fall' && m.fall_time_seconds) {
    const min = Math.floor(m.fall_time_seconds / 60)
    const sec = String(m.fall_time_seconds % 60).padStart(2, '0')
    return `Fall ${min}:${sec}`
  }
  return m.result_detail ? `${rt} ${m.result_detail}` : rt
}

function WrestlerName({
  wrestler,
  nameRaw,
}: {
  wrestler: { id: string; first_name: string; last_name: string; is_stub: boolean } | null
  nameRaw: string | null
}) {
  if (!wrestler && !nameRaw) return <span className="text-slate-400">—</span>
  const name = wrestler
    ? `${wrestler.first_name} ${wrestler.last_name}`
    : nameRaw!
  if (wrestler && !wrestler.is_stub) {
    return (
      <Link href={`/wrestler/${wrestler.id}`} className="font-medium text-slate-800 hover:underline">
        {name}
      </Link>
    )
  }
  return <span className="font-medium text-slate-800">{name}</span>
}

export default async function DualMeetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [{ data, error }, { data: matchData }] = await Promise.all([
    supabase
      .from('dual_meets')
      .select(`
        id, season_id, meet_date, team1_score, team2_score, gender, status,
        team1_school_name_raw, team2_school_name_raw,
        team1:schools!team1_school_id(id, display_name, logo_url, is_nj),
        team2:schools!team2_school_id(id, display_name, logo_url, is_nj)
      `)
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('dual_meet_matches')
      .select(`
        id, weight_class, result_type, result_detail, fall_time_seconds,
        is_double_forfeit, is_forfeit_win, winner_id,
        wrestler_a_id, wrestler_b_id, wrestler_a_name_raw, wrestler_b_name_raw,
        wrestler_a:wrestlers!wrestler_a_id(id, first_name, last_name, is_stub),
        wrestler_b:wrestlers!wrestler_b_id(id, first_name, last_name, is_stub)
      `)
      .eq('dual_meet_id', id)
      .order('weight_class', { ascending: true }),
  ])

  if (error || !data) notFound()

  const meet    = data as unknown as DualMeet
  const matches = (matchData ?? []) as unknown as MatchRow[]

  // Resolve display name: prefer joined school record, fall back to raw name stored at import time
  const team1Name = meet.team1?.display_name ?? meet.team1_school_name_raw ?? '—'
  const team2Name = meet.team2?.display_name ?? meet.team2_school_name_raw ?? '—'
  const team1IsNJ = meet.team1?.is_nj ?? false
  const team2IsNJ = meet.team2?.is_nj ?? false

  const dateStr = new Date(meet.meet_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const seasonLabel = SEASONS[meet.season_id]?.label ?? String(meet.season_id)
  const genderLabel = meet.gender === 'F' ? 'Girls' : 'Boys'

  const winner =
    meet.team1_score !== null && meet.team2_score !== null
      ? meet.team1_score > meet.team2_score ? 'team1'
        : meet.team2_score > meet.team1_score ? 'team2'
        : null
      : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-400 mb-6 flex items-center gap-1.5">
        <Link href="/" className="hover:text-slate-600">Home</Link>
        <span>/</span>
        <span>Dual Meet</span>
      </nav>

      {/* Meta */}
      <p className="text-sm text-slate-500 mb-1">{dateStr} · {genderLabel} · {seasonLabel}</p>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        {team1Name} vs. {team2Name}
      </h1>

      {/* Score card */}
      <div className="border border-black bg-white rounded-none p-6 mb-8">
        <div className="grid grid-cols-3 items-center gap-4">
          {/* Team 1 */}
          <div className="text-center">
            {meet.team1?.logo_url && (
              <img src={meet.team1.logo_url} alt="" aria-hidden className="w-12 h-12 object-contain mx-auto mb-2" />
            )}
            {team1IsNJ && meet.team1 ? (
              <Link href={`/schools/${meet.team1.id}`} className="text-base font-semibold text-slate-800 hover:underline leading-tight block">
                {team1Name}
              </Link>
            ) : (
              <span className="text-base font-semibold text-slate-800 leading-tight block">{team1Name}</span>
            )}
            <p className="text-5xl font-bold tabular-nums mt-3 text-slate-900">
              {meet.team1_score ?? '—'}
            </p>
            {winner === 'team1' && (
              <span className="mt-2 inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Winner
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="text-center">
            <span className="text-2xl font-light text-slate-300">vs</span>
            {meet.status !== 'final' && (
              <p className="text-xs text-slate-400 mt-1 capitalize">{meet.status}</p>
            )}
          </div>

          {/* Team 2 */}
          <div className="text-center">
            {meet.team2?.logo_url && (
              <img src={meet.team2.logo_url} alt="" aria-hidden className="w-12 h-12 object-contain mx-auto mb-2" />
            )}
            {team2IsNJ && meet.team2 ? (
              <Link href={`/schools/${meet.team2.id}`} className="text-base font-semibold text-slate-800 hover:underline leading-tight block">
                {team2Name}
              </Link>
            ) : (
              <span className="text-base font-semibold text-slate-800 leading-tight block">{team2Name}</span>
            )}
            <p className="text-5xl font-bold tabular-nums mt-3 text-slate-900">
              {meet.team2_score ?? '—'}
            </p>
            {winner === 'team2' && (
              <span className="mt-2 inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Winner
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Weight-by-weight results */}
      <section>
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Weight-by-Weight Results</h2>
        {matches.length === 0 ? (
          <div className="border border-black bg-white rounded-none p-8 text-center">
            <p className="text-sm font-medium text-slate-600">No individual results recorded</p>
          </div>
        ) : (
          <div className="border border-black bg-white rounded-none overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 w-16">Wt</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">{team1Name}</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 w-28">Result</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">{team2Name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matches.map(m => {
                  const team1Won = !m.is_double_forfeit && m.winner_id !== null &&
                    (m.winner_id === m.wrestler_a_id)
                  const team2Won = !m.is_double_forfeit && m.winner_id !== null &&
                    (m.winner_id === m.wrestler_b_id)
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400 tabular-nums">
                        {m.weight_class}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {team1Won && (
                            <span className="text-xs font-bold text-emerald-700 shrink-0">W</span>
                          )}
                          <WrestlerName wrestler={m.wrestler_a as MatchRow['wrestler_a']} nameRaw={m.wrestler_a_name_raw} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs text-slate-500">
                        {resultLabel(m)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {team2Won && (
                            <span className="text-xs font-bold text-emerald-700 shrink-0">W</span>
                          )}
                          <WrestlerName wrestler={m.wrestler_b as MatchRow['wrestler_b']} nameRaw={m.wrestler_b_name_raw} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
