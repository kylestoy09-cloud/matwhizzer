export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SEASONS } from '@/lib/seasons'

type School = { id: number; display_name: string }

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

export default async function DualMeetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await supabase
    .from('dual_meets')
    .select(`
      id, season_id, meet_date, team1_score, team2_score, gender, status,
      team1:schools!team1_school_id(id, display_name),
      team2:schools!team2_school_id(id, display_name)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) notFound()

  const meet = data as unknown as DualMeet
  const team1 = meet.team1
  const team2 = meet.team2

  const dateStr = new Date(meet.meet_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const seasonLabel = SEASONS[meet.season_id]?.label ?? String(meet.season_id)
  const genderLabel = meet.gender === 'F' ? "Girls" : "Boys"

  const winner =
    meet.team1_score !== null && meet.team2_score !== null
      ? meet.team1_score > meet.team2_score ? team1
        : meet.team2_score > meet.team1_score ? team2
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
        {team1?.display_name ?? '—'} vs. {team2?.display_name ?? '—'}
      </h1>

      {/* Score card */}
      <div className="border border-black bg-white rounded-none p-6 mb-8">
        <div className="grid grid-cols-3 items-center gap-4">
          {/* Team 1 */}
          <div className="text-center">
            {team1 ? (
              <Link
                href={`/schools/${team1.id}`}
                className="text-base font-semibold text-slate-800 hover:underline leading-tight block"
              >
                {team1.display_name}
              </Link>
            ) : (
              <span className="text-base font-semibold text-slate-800">—</span>
            )}
            <p className="text-5xl font-bold tabular-nums mt-3 text-slate-900">
              {meet.team1_score ?? '—'}
            </p>
            {winner?.id === team1?.id && (
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
            {team2 ? (
              <Link
                href={`/schools/${team2.id}`}
                className="text-base font-semibold text-slate-800 hover:underline leading-tight block"
              >
                {team2.display_name}
              </Link>
            ) : (
              <span className="text-base font-semibold text-slate-800">—</span>
            )}
            <p className="text-5xl font-bold tabular-nums mt-3 text-slate-900">
              {meet.team2_score ?? '—'}
            </p>
            {winner?.id === team2?.id && (
              <span className="mt-2 inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Winner
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Weight-by-weight placeholder */}
      <section>
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Weight-by-Weight Results</h2>
        <div className="border border-black bg-white rounded-none p-8 text-center">
          <p className="text-sm font-medium text-slate-600">Individual bout breakdown coming soon</p>
          <p className="text-xs text-slate-400 mt-1">Weight-class results will appear here once imported</p>
        </div>
      </section>
    </div>
  )
}
