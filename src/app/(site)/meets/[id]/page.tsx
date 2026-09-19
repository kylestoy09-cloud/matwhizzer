export const revalidate = 300

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSeasonLabel } from '@/lib/seasons-server'
import { logoFlipStyle } from '@/lib/logo-direction'

/* eslint-disable @next/next/no-img-element */
type School = {
  id: number
  display_name: string
  logo_url: string | null
  is_nj: boolean
  primary_color: string | null
  logo_direction: 'left' | 'right' | null
}

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


function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = String(seconds % 60).padStart(2, '0')
  return `${min}:${sec}`
}

function resultType(m: MatchRow): string {
  if (m.is_double_forfeit) return 'Dbl Forf.'
  if (m.is_forfeit_win)    return 'Forfeit'
  if (!m.result_type)      return '—'
  const rt = m.result_type
  if (rt.toLowerCase() === 'fall') return 'Fall'
  if (rt.toUpperCase() === 'TF')   return 'TF'
  return rt
}

function resultScore(m: MatchRow): string {
  if (m.is_double_forfeit || m.is_forfeit_win || !m.result_type) return ''
  const rt = m.result_type
  if (rt.toLowerCase() === 'fall') {
    return m.fall_time_seconds ? formatTime(m.fall_time_seconds) : ''
  }
  if (rt.toUpperCase() === 'TF') {
    const score = m.result_detail ?? ''
    const time  = m.fall_time_seconds ? ` ${formatTime(m.fall_time_seconds)}` : ''
    return `${score}${time}`.trim()
  }
  return m.result_detail ?? ''
}

function matchPoints(m: MatchRow): { a: number; b: number } {
  if (m.is_double_forfeit) return { a: 0, b: 0 }
  const rt = (m.result_type ?? '').toLowerCase()
  const pts = m.is_forfeit_win ? 6
    : rt === 'fall' || rt === 'f' ? 6
    : rt === 'tf' ? 5
    : rt === 'md' || rt.startsWith('major') ? 4
    : 3
  const aWins = m.winner_id === m.wrestler_a_id
  return { a: aWins ? pts : 0, b: aWins ? 0 : pts }
}

function WrestlerName({
  wrestler,
  nameRaw,
}: {
  wrestler: { id: string; first_name: string; last_name: string; is_stub: boolean } | null
  nameRaw: string | null
}) {
  if (!wrestler && !nameRaw) return <span className="text-slate-300">—</span>
  const name = wrestler ? `${wrestler.first_name} ${wrestler.last_name}` : nameRaw!
  if (wrestler && !wrestler.is_stub) {
    return (
      <Link href={`/wrestler/${wrestler.id}`} className="font-medium text-slate-800 hover:underline">
        {name}
      </Link>
    )
  }
  return <span className="font-medium text-slate-800">{name}</span>
}

function SchoolLogo({
  school,
  position,
  size = 'md',
}: {
  school: School | null
  position: 'away' | 'home'
  size?: 'md' | 'sm'
}) {
  if (!school?.logo_url) return null
  const bg = school.primary_color ?? '#1e293b'
  const outer = size === 'md' ? 'w-14 h-14' : 'w-10 h-10'
  const inner = size === 'md' ? 'w-9 h-9'   : 'w-6 h-6'
  return (
    <div
      className={`${outer} rounded-full flex items-center justify-center mx-auto mb-2 shrink-0`}
      style={{ backgroundColor: bg }}
    >
      <img
        src={school.logo_url}
        alt=""
        aria-hidden
        style={logoFlipStyle(school.logo_direction, position)}
        className={`${inner} object-contain`}
      />
    </div>
  )
}

export default async function DualMeetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const MEET_SELECT = `
    id, season_id, meet_date, team1_score, team2_score, status,
    team1:schools!team1_school_id(id, display_name, logo_url, is_nj, primary_color, logo_direction),
    team2:schools!team2_school_id(id, display_name, logo_url, is_nj, primary_color, logo_direction)
  `
  const MATCH_SELECT = `
    id, weight_class, result_type, result_detail, fall_time_seconds,
    is_double_forfeit, is_forfeit_win, winner_id,
    wrestler_a_id, wrestler_b_id, wrestler_a_name_raw, wrestler_b_name_raw,
    wrestler_a:wrestlers!wrestler_a_id(id, first_name, last_name, is_stub),
    wrestler_b:wrestlers!wrestler_b_id(id, first_name, last_name, is_stub)
  `

  // Try boys table first; fall back to girls table (IDs are stable UUIDs across tables)
  let data: any = null
  let matchData: any[] | null = null
  let meetGender: 'M' | 'F' = 'M'

  const { data: boysData } = await supabase
    .from('dual_meets')
    .select(MEET_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (boysData) {
    data = boysData
    const { data: md } = await supabase.from('dual_meet_matches').select(MATCH_SELECT).eq('dual_meet_id', id).order('order_index', { ascending: true })
    matchData = md
  } else {
    const { data: girlsData } = await supabase.from('dual_meets_girls').select(MEET_SELECT).eq('id', id).maybeSingle()
    if (girlsData) {
      data = girlsData
      meetGender = 'F'
      const { data: md } = await supabase.from('dual_meet_matches_girls').select(MATCH_SELECT).eq('dual_meet_id', id).order('order_index', { ascending: true })
      matchData = md
    }
  }

  if (!data) notFound()

  const meet    = { ...(data as unknown as DualMeet), gender: meetGender }
  const matches = (matchData ?? []) as unknown as MatchRow[]

  const team1Name = meet.team1?.display_name ?? 'TBD'
  const team2Name = meet.team2?.display_name ?? 'TBD'
  const team1IsNJ = meet.team1?.is_nj ?? false
  const team2IsNJ = meet.team2?.is_nj ?? false

  const dateStr = new Date(meet.meet_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const seasonLabel = (await getSeasonLabel(meet.season_id)) ?? String(meet.season_id)
  const genderLabel = meet.gender === 'F' ? 'Girls' : 'Boys'

  const winner =
    meet.team1_score !== null && meet.team2_score !== null
      ? meet.team1_score > meet.team2_score ? 'team1'
        : meet.team2_score > meet.team1_score ? 'team2'
        : null
      : null

  // Running team scores per match
  let runA = 0, runB = 0
  const matchRows = matches.map(m => {
    const pts = matchPoints(m)
    runA += pts.a
    runB += pts.b
    return { match: m, scoreA: runA, scoreB: runB }
  })

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
      <div className="border border-black bg-slate-100 rounded-none py-4 px-6 mb-8">
        <div className="grid grid-cols-3 items-center gap-4">
          {/* Team 1 — away, left, faces right */}
          <div className="text-center">
            <SchoolLogo school={meet.team1} position="away" />
            {team1IsNJ && meet.team1 ? (
              <Link href={`/${meet.gender === 'F' ? 'girls' : 'boys'}/schools/${meet.team1.id}`} className="text-sm font-semibold text-slate-800 hover:underline leading-tight block">
                {team1Name}
              </Link>
            ) : (
              <>
                <span className="text-sm font-semibold text-slate-800 leading-tight block">{team1Name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900 text-white inline-block mt-1">Non-NJSIAA</span>
              </>
            )}
            <p className="text-4xl font-bold tabular-nums mt-2 text-slate-900">
              {meet.team1_score ?? '—'}
            </p>
            {winner === 'team1' && (
              <span className="mt-1.5 inline-block text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800">
                Winner
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="text-center">
            <span className="text-xl font-light text-slate-400">vs</span>
            {meet.status !== 'final' && (
              <p className="text-xs text-slate-400 mt-1 capitalize">{meet.status}</p>
            )}
          </div>

          {/* Team 2 — home, right, faces left */}
          <div className="text-center">
            <SchoolLogo school={meet.team2} position="home" />
            {team2IsNJ && meet.team2 ? (
              <Link href={`/${meet.gender === 'F' ? 'girls' : 'boys'}/schools/${meet.team2.id}`} className="text-sm font-semibold text-slate-800 hover:underline leading-tight block">
                {team2Name}
              </Link>
            ) : (
              <>
                <span className="text-sm font-semibold text-slate-800 leading-tight block">{team2Name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900 text-white inline-block mt-1">Non-NJSIAA</span>
              </>
            )}
            <p className="text-4xl font-bold tabular-nums mt-2 text-slate-900">
              {meet.team2_score ?? '—'}
            </p>
            {winner === 'team2' && (
              <span className="mt-1.5 inline-block text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800">
                Winner
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Weight-by-weight results */}
      <section>
        {matches.length === 0 ? (
          <div className="border border-black bg-white rounded-none p-8 text-center">
            <p className="text-sm font-medium text-slate-600">No individual results recorded</p>
          </div>
        ) : (
          <div className="border border-black rounded-none overflow-x-auto">
            <table className="min-w-max w-full text-[13px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  {/* Away side */}
                  <th className="px-3 py-1 text-right text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                    Score
                  </th>
                  <th className="px-3 py-1 text-right text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                    {team1Name}
                  </th>
                  <th className="px-3 py-1 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                    Wt
                  </th>
                  {/* Center */}
                  <th className="px-3 py-1 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                    Result
                  </th>
                  <th className="px-3 py-1 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                    Score
                  </th>
                  {/* Home side */}
                  <th className="px-3 py-1 text-center text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                    Wt
                  </th>
                  <th className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                    {team2Name}
                  </th>
                  <th className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {matchRows.map(({ match: m, scoreA, scoreB }, ri) => {
                  const aWon = !m.is_double_forfeit && m.winner_id === m.wrestler_a_id
                  const bWon = !m.is_double_forfeit && m.winner_id === m.wrestler_b_id
                  const rowBg = ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  return (
                    <tr key={m.id} className={`border-t border-slate-100 ${rowBg}`}>
                      {/* Away running score */}
                      <td className={`px-3 py-1 text-right font-bold tabular-nums whitespace-nowrap ${aWon ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {scoreA}
                      </td>
                      {/* Away wrestler */}
                      <td className="px-3 py-1 text-right whitespace-nowrap">
                        <WrestlerName wrestler={m.wrestler_a as MatchRow['wrestler_a']} nameRaw={m.wrestler_a_name_raw} />
                      </td>
                      {/* Wt (away side) */}
                      <td className="px-3 py-1 text-center font-mono text-xs text-slate-400 tabular-nums whitespace-nowrap">
                        {m.weight_class}
                      </td>
                      {/* Result type */}
                      <td className="px-3 py-1 text-center text-slate-600 whitespace-nowrap">
                        {resultType(m)}
                      </td>
                      {/* Match score detail */}
                      <td className="px-3 py-1 text-center font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {resultScore(m) || '—'}
                      </td>
                      {/* Wt (home side) */}
                      <td className="px-3 py-1 text-center font-mono text-xs text-slate-400 tabular-nums whitespace-nowrap">
                        {m.weight_class}
                      </td>
                      {/* Home wrestler */}
                      <td className="px-3 py-1 text-left whitespace-nowrap">
                        <WrestlerName wrestler={m.wrestler_b as MatchRow['wrestler_b']} nameRaw={m.wrestler_b_name_raw} />
                      </td>
                      {/* Home running score */}
                      <td className={`px-3 py-1 text-left font-bold tabular-nums whitespace-nowrap ${bWon ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {scoreB}
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
