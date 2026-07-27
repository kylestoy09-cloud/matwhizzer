import { supabase } from '@/lib/supabase'
import { createSupabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TournamentBoutList } from './TournamentBoutList'

export const dynamic = 'force-dynamic'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tournament = {
  id: string
  name: string
  start_date: string
  end_date: string | null
  location: string | null
  source_format: 'full_bracket' | 'school_tracking' | null
}

type Placement = {
  weight_class: number
  place: number
  wrestler_name_raw: string
  school_name_raw: string
  school_id: number | null
  nj_wrestler_id: string | null
  school: { display_name: string; is_nj: boolean } | null
  nj_wrestler: { id: string } | null
}

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

const PLACE_LABEL: Record<number, string> = {
  1: '1st', 2: '2nd', 3: '3rd', 4: '4th',
  5: '5th', 6: '6th', 7: '7th', 8: '8th',
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

  // Fetch tournament metadata + weights in parallel
  const [{ data: tournData }, { data: weightsData }, { data: placementsData }] = await Promise.all([
    supabase
      .from('in_season_tournaments')
      .select('id, name, start_date, end_date, location, source_format')
      .eq('id', id)
      .single(),
    supabase
      .from('tournament_bouts')
      .select('weight_class')
      .eq('in_season_tournament_id', id)
      .order('weight_class'),
    supabase
      .from('tournament_placements')
      .select(`
        weight_class, place, wrestler_name_raw, school_name_raw, school_id, nj_wrestler_id,
        school:schools!school_id(display_name, is_nj)
      `)
      .eq('in_season_tournament_id', id)
      .order('weight_class')
      .order('place'),
  ])

  if (!tournData) notFound()
  const tournament = tournData as unknown as Tournament
  const placements = (placementsData ?? []) as unknown as Placement[]

  const weights = [
    ...new Set((weightsData ?? []).map((r: { weight_class: number }) => r.weight_class)),
  ].sort((a, b) => a - b)

  const selectedWeight = w ? parseInt(w, 10) : (weights[0] ?? null)

  // Fetch bouts for selected weight + all schools for team filter
  let bouts: Bout[] = []
  let allSchools: School[] = []

  if (selectedWeight !== null) {
    const [{ data: boutData }, { data: schoolData1 }, { data: schoolData2 }] = await Promise.all([
      supabase
        .from('tournament_bouts')
        .select(`
          id, weight_class, round, winner,
          result_type, result_detail, fall_time_seconds,
          nj_wrestler1_id, wrestler1_name_raw, wrestler1_school_raw,
          nj_wrestler2_id, wrestler2_name_raw, wrestler2_school_raw,
          wrestler1_school:schools!wrestler1_school_id(id, display_name, is_nj),
          wrestler2_school:schools!wrestler2_school_id(id, display_name, is_nj)
        `)
        .eq('in_season_tournament_id', id)
        .eq('weight_class', selectedWeight),
      // Get distinct schools from wrestler1 side
      supabase
        .from('tournament_bouts')
        .select('wrestler1_school:schools!wrestler1_school_id(id, display_name, is_nj)')
        .eq('in_season_tournament_id', id)
        .not('wrestler1_school_id', 'is', null)
        .limit(500),
      // Get distinct schools from wrestler2 side
      supabase
        .from('tournament_bouts')
        .select('wrestler2_school:schools!wrestler2_school_id(id, display_name, is_nj)')
        .eq('in_season_tournament_id', id)
        .not('wrestler2_school_id', 'is', null)
        .limit(500),
    ])

    bouts = (boutData ?? []) as unknown as Bout[]

    // Merge and deduplicate schools
    const schoolMap = new Map<number, School>()
    for (const row of [...(schoolData1 ?? []), ...(schoolData2 ?? [])]) {
      const s = (row as any).wrestler1_school ?? (row as any).wrestler2_school
      if (s && s.id) schoolMap.set(s.id, s as School)
    }
    allSchools = [...schoolMap.values()].sort((a, b) =>
      a.display_name.localeCompare(b.display_name),
    )
  }

  const njSchools = allSchools.filter(s => s.is_nj)

  // Group placements by weight for the champions grid
  const placementsByWeight = new Map<number, Placement[]>()
  for (const p of placements) {
    if (!placementsByWeight.has(p.weight_class)) placementsByWeight.set(p.weight_class, [])
    placementsByWeight.get(p.weight_class)!.push(p)
  }

  const isFullBracket = tournament.source_format === 'full_bracket' || tournament.source_format === null
  const hasPlacementData = placements.length > 0

  // For full_bracket: first-place finishers only (champions row)
  const champions = isFullBracket
    ? weights
        .map(wt => ({
          weight: wt,
          placement: placementsByWeight.get(wt)?.find(p => p.place === 1) ?? null,
        }))
        .filter(c => c.placement !== null)
    : []

  // For school_tracking: NJ podium entries (any place)
  const njPodium = !isFullBracket
    ? placements.filter(p => p.school?.is_nj)
    : []

  const dateStr = formatDateRange(tournament.start_date, tournament.end_date)
  const subtitle = [dateStr, tournament.location].filter(Boolean).join(' · ')

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link
        href="/tournaments"
        className="text-sm text-slate-500 hover:text-slate-700 hover:underline mb-4 inline-block"
      >
        ← All Tournaments
      </Link>

      {/* Title */}
      <h1 className="text-2xl font-bold text-slate-900 mb-1">{tournament.name}</h1>
      {subtitle && <p className="text-sm text-slate-500 mb-6">{subtitle}</p>}

      {/* NJ Schools */}
      {njSchools.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            NJ Schools
          </p>
          <div className="flex flex-wrap gap-1.5">
            {njSchools.map(s => (
              <span
                key={s.id}
                className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
              >
                {s.display_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Champions / NJ Podium */}
      {hasPlacementData && (
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            {isFullBracket ? 'Champions' : 'NJ on the Podium'}
          </p>

          {isFullBracket && champions.length > 0 && (
            <div className="border border-black bg-white overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {champions.map(({ weight, placement }) => {
                    const p = placement!
                    const name = p.wrestler_name_raw
                    const school = p.school?.display_name ?? p.school_name_raw
                    return (
                      <tr key={weight} className="hover:bg-slate-50">
                        <td className="px-4 py-2 w-16 text-xs font-semibold text-slate-400">
                          {weight}
                        </td>
                        <td className="px-4 py-2">
                          {p.nj_wrestler_id ? (
                            <Link
                              href={`/wrestler/${p.nj_wrestler_id}`}
                              className="font-medium text-slate-900 hover:underline"
                            >
                              {name}
                            </Link>
                          ) : (
                            <span className="font-medium text-slate-900">{name}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-500 text-right">{school}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isFullBracket && njPodium.length > 0 && (
            <div className="border border-black bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-slate-500 w-16">Wt</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-500">Wrestler</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-500">School</th>
                    <th className="text-left px-4 py-2 font-medium text-slate-500 w-16">Place</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {njPodium.map((p, i) => {
                    const school = p.school?.display_name ?? p.school_name_raw
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-xs font-semibold text-slate-400">
                          {p.weight_class}
                        </td>
                        <td className="px-4 py-2">
                          {p.nj_wrestler_id ? (
                            <Link
                              href={`/wrestler/${p.nj_wrestler_id}`}
                              className="font-medium text-slate-900 hover:underline"
                            >
                              {p.wrestler_name_raw}
                            </Link>
                          ) : (
                            <span className="font-medium text-slate-900">{p.wrestler_name_raw}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-500">{school}</td>
                        <td className="px-4 py-2 text-slate-500 font-medium">
                          {PLACE_LABEL[p.place] ?? `${p.place}th`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Weight tabs + bout list */}
      {weights.length === 0 ? (
        <div className="border border-black bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No bouts recorded for this tournament.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 mb-5" role="group" aria-label="Weight class">
            {weights.map(wt => (
              <Link
                key={wt}
                href={`/tournaments/${id}?w=${wt}`}
                aria-current={wt === selectedWeight ? 'true' : undefined}
                className={`px-3 py-1 text-sm font-medium border border-black transition-colors ${
                  wt === selectedWeight
                    ? 'bg-black text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {wt}
              </Link>
            ))}
          </div>

          {selectedWeight !== null && (
            <TournamentBoutList
              bouts={bouts}
              schools={allSchools}
              tournamentId={id}
              selectedWeight={selectedWeight}
              isAdmin={isAdmin}
            />
          )}
        </>
      )}
    </div>
  )
}
