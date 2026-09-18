import { createSupabaseAdmin } from '@/lib/supabase/service'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TournamentBracketClient } from './TournamentBracketClient'
import type { PublicBracketSlot } from '@/components/bracket/BracketTree'

export const dynamic = 'force-dynamic'

export default async function BracketPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = createSupabaseAdmin()

  // Determine gender by trying boys table first, then girls
  const [{ data: boysTourn }, { data: girlsTourn }] = await Promise.all([
    supabase.from('in_season_tournaments').select('id, name, start_date').eq('id', id).maybeSingle(),
    supabase.from('in_season_tournaments_girls').select('id, name, start_date').eq('id', id).maybeSingle(),
  ])
  const tournament = boysTourn ?? girlsTourn

  const [{ data: fullSlots }] = await Promise.all([
    db
      .from('tournament_bracket_slots')
      .select('weight_class, slot_number, round_name, bracket_size, top_name_raw, top_seed, top_wrestler_id, bottom_name_raw, bottom_seed, bottom_wrestler_id, winner_position, result_type, result_detail')
      .eq('in_season_tournament_id', id)
      .order('weight_class')
      .order('slot_number'),
  ])

  if (!tournament) notFound()

  const slots = (fullSlots ?? []) as (PublicBracketSlot & { weight_class: number })[]

  // Group by weight class
  const byWeight: Record<number, PublicBracketSlot[]> = {}
  for (const slot of slots) {
    const wc = slot.weight_class
    if (!byWeight[wc]) byWeight[wc] = []
    byWeight[wc].push(slot)
  }
  const weights = Object.keys(byWeight).map(Number).sort((a, b) => a - b)

  const backHref = `/tournaments/${id}`

  if (weights.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href={backHref} className="text-sm text-slate-500 hover:text-slate-700 hover:underline mb-6 inline-block">
          ← {tournament.name}
        </Link>
        <div className="border border-dashed border-slate-300 py-16 text-center">
          <p className="text-sm text-slate-400">No bracket has been set up for this tournament yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href={backHref} className="text-sm text-slate-500 hover:text-slate-700 hover:underline mb-6 inline-block">
        ← {tournament.name}
      </Link>
      <TournamentBracketClient
        tournamentName={tournament.name}
        weights={weights}
        byWeight={byWeight}
      />
    </div>
  )
}
