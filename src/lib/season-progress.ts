import { createSupabaseAdmin } from '@/lib/supabase/service'

export type SeasonProgress = {
  seasonId: number
  yearLabel: string
  duals: { total: number; withResults: number; pct: number }
  tournaments: { total: number; withResults: number; pct: number }
}

/**
 * Computes live season progress for the given season (or is_public_default
 * for the given gender if no seasonId is passed), filtered by gender.
 * Gender defaults to 'M' when omitted.
 */
export async function getSeasonProgress(
  seasonId?: number,
  gender: 'M' | 'F' = 'M',
): Promise<SeasonProgress | null> {
  const db = createSupabaseAdmin()

  let season: { id: number; year_label: string } | null = null

  if (seasonId !== undefined) {
    const { data } = await db
      .from('seasons')
      .select('id, year_label')
      .eq('id', seasonId)
      .single()
    season = data
  } else {
    // Find the public-default season for the given gender via season_gender_state
    const { data: sgs } = await db
      .from('season_gender_state')
      .select('season_id')
      .eq('gender', gender)
      .eq('is_public_default', true)
      .single()

    if (sgs) {
      const { data } = await db
        .from('seasons')
        .select('id, year_label')
        .eq('id', sgs.season_id)
        .single()
      season = data
    }
  }

  if (!season || !season.year_label) return null

  // Dual meets: boys from dual_meets, girls from dual_meets_girls (separate tables)
  const { data: dualRows, error: dualErr } = await (gender === 'F'
    ? db.from('dual_meets_girls').select('team1_score').eq('season_id', season.id)
    : db.from('dual_meets').select('team1_score').eq('season_id', season.id).eq('gender', 'M')
  )

  if (dualErr) throw new Error(`dual_meets query failed: ${dualErr.message}`)

  const dualTotal = dualRows?.length ?? 0
  const dualWithResults = dualRows?.filter(r => r.team1_score !== null).length ?? 0

  // Tournaments: gender-specific table (no gender column needed after split)
  const istTable = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
  const { data: tournRows, error: tournErr } = await db
    .from(istTable)
    .select('id')
    .eq('season', season.year_label)

  if (tournErr) throw new Error(`${istTable} query failed: ${tournErr.message}`)

  const tournTotal = tournRows?.length ?? 0
  let tournWithResults = 0

  if (tournTotal > 0) {
    const ids = tournRows!.map(r => r.id)
    // Use RPC to count bouts per tournament server-side — avoids the 1000-row Supabase cap
    const { data: countsData, error: countsErr } = await db.rpc('tournament_hub_counts', {
      p_tournament_ids: ids,
      p_gender: gender,
    })
    if (countsErr) throw new Error(`tournament_hub_counts RPC failed: ${countsErr.message}`)
    tournWithResults = ((countsData ?? []) as { tournament_id: string; bout_count: number }[])
      .filter(r => r.bout_count > 0).length
  }

  const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100))

  return {
    seasonId: season.id,
    yearLabel: season.year_label,
    duals: { total: dualTotal, withResults: dualWithResults, pct: pct(dualWithResults, dualTotal) },
    tournaments: { total: tournTotal, withResults: tournWithResults, pct: pct(tournWithResults, tournTotal) },
  }
}
