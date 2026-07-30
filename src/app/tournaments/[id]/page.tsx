import { supabase } from '@/lib/supabase'
import { createSupabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TournamentPageClient } from './TournamentPageClient'

export const dynamic = 'force-dynamic'

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const authClient = await createSupabaseServer()
  const { data: { user } } = await authClient.auth.getUser()
  const isAdmin = !!user

  const [{ data: tournData }, { data: boutsData }, { data: placementsData }] = await Promise.all([
    supabase
      .from('in_season_tournaments')
      .select('id, name, start_date, end_date, location, source_format, tournament_type')
      .eq('id', id)
      .single(),
    supabase
      .from('tournament_bouts')
      .select(`
        id, weight_class, round, winner,
        result_type, result_detail, fall_time_seconds, result_time_estimated,
        winner_score, loser_score,
        wrestler1_id, wrestler1_name_raw, wrestler1_school_raw,
        wrestler2_id, wrestler2_name_raw, wrestler2_school_raw,
        wrestler1_school:schools!wrestler1_school_id(id, display_name, is_nj),
        wrestler2_school:schools!wrestler2_school_id(id, display_name, is_nj)
      `)
      .eq('in_season_tournament_id', id)
      .order('weight_class')
      .order('round')
      .limit(10000),
    supabase
      .from('tournament_placements')
      .select(`
        weight_class, place, wrestler_name_raw, school_name_raw, school_id, wrestler_id,
        school:schools!school_id(display_name, is_nj)
      `)
      .eq('in_season_tournament_id', id)
      .lte('place', 3)
      .order('weight_class')
      .order('place'),
  ])

  if (!tournData) notFound()

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link
        href="/tournaments"
        className="text-sm text-slate-500 hover:text-slate-700 hover:underline mb-4 inline-block"
      >
        ← All Tournaments
      </Link>
      <TournamentPageClient
        tournament={tournData as any}
        allBouts={(boutsData ?? []) as any}
        placements={(placementsData ?? []) as any}
        isAdmin={isAdmin}
      />
    </div>
  )
}
