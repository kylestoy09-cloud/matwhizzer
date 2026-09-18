import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { PostseasonDashboard } from './PostseasonDashboard'

export const dynamic = 'force-dynamic'

type DB = ReturnType<typeof createSupabaseAdmin>

function pct(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

// All postseason bracket results live in matches table; winner is tracked by winner_entry_id
async function countMatches(db: DB, ids: number[], withWinner: boolean): Promise<number> {
  if (!ids.length) return 0
  let q = db.from('matches').select('*', { count: 'exact', head: true }).in('tournament_id', ids)
  if (withWinner) q = q.not('winner_entry_id', 'is', null)
  const { count } = await q
  return count ?? 0
}

async function countEntries(db: DB, ids: number[], seededOnly: boolean): Promise<number> {
  if (!ids.length) return 0
  let q = db.from('tournament_entries').select('*', { count: 'exact', head: true }).in('tournament_id', ids)
  if (seededOnly) q = q.not('seed', 'is', null)
  const { count } = await q
  return count ?? 0
}

async function countWrestlersWithMatches(db: DB, ids: number[]): Promise<number> {
  if (!ids.length) return 0

  const PAGE = 1000

  async function pageAll<T>(
    builder: (from: number, to: number) => Promise<{ data: T[] | null }>
  ): Promise<T[]> {
    const out: T[] = []
    let offset = 0
    while (true) {
      const { data } = await builder(offset, offset + PAGE - 1)
      if (!data?.length) break
      out.push(...data)
      if (data.length < PAGE) break
      offset += PAGE
    }
    return out
  }

  type EntryRow = { id: string; wrestler_id: string }
  type MatchRow = { winner_entry_id: string | null; loser_entry_id: string | null }

  const [allEntries, allMatches] = await Promise.all([
    pageAll<EntryRow>(
      (from, to) => (db.from('tournament_entries')
        .select('id, wrestler_id')
        .in('tournament_id', ids)
        .not('wrestler_id', 'is', null)
        .range(from, to) as unknown) as Promise<{ data: EntryRow[] | null }>
    ),
    pageAll<MatchRow>(
      (from, to) => (db.from('matches')
        .select('winner_entry_id, loser_entry_id')
        .in('tournament_id', ids)
        .not('winner_entry_id', 'is', null)
        .range(from, to) as unknown) as Promise<{ data: MatchRow[] | null }>
    ),
  ])

  if (!allEntries.length || !allMatches.length) return 0

  const matchedEntryIds = new Set<string>()
  for (const m of allMatches) {
    if (m.winner_entry_id != null) matchedEntryIds.add(String(m.winner_entry_id))
    if (m.loser_entry_id  != null) matchedEntryIds.add(String(m.loser_entry_id))
  }

  const wrestlerIds = new Set<string>()
  for (const e of allEntries) {
    if (matchedEntryIds.has(String(e.id))) wrestlerIds.add(String(e.wrestler_id))
  }

  return wrestlerIds.size
}

export default async function PostseasonPage() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()

  // Round 1: live season IDs from season_gender_state
  const { data: sgsRows } = await db
    .from('season_gender_state')
    .select('season_id, gender')
    .eq('is_public_default', true)
    .in('gender', ['M', 'F'])

  const seasonIdM = sgsRows?.find(r => r.gender === 'M')?.season_id ?? null
  const seasonIdF = sgsRows?.find(r => r.gender === 'F')?.season_id ?? null

  // Round 2: season labels
  const seasonIds = [...new Set([seasonIdM, seasonIdF].filter(Boolean) as number[])]
  const { data: seasonRows } = seasonIds.length
    ? await db.from('seasons').select('id, year_label').in('id', seasonIds)
    : { data: [] as { id: number; year_label: string }[] }

  const labelM      = (seasonRows ?? []).find(s => s.id === seasonIdM)?.year_label ?? ''
  const labelF      = (seasonRows ?? []).find(s => s.id === seasonIdF)?.year_label ?? ''
  const seasonLabel = labelM || labelF || 'Current Season'

  const Z = Promise.resolve({ count: 0 as number | null, data: null, error: null })

  // Round 3: playoff dual counts + postseason tournament IDs (filtered by live season_id)
  const [
    r0, r1, r2, r3,
    distM, regM, stM,
    distF, regF, stF,
  ] = await Promise.all([
    // Boys playoff duals: total
    seasonIdM
      ? db.from('dual_meets').select('*', { count: 'exact', head: true }).eq('gender', 'M').eq('season_id', seasonIdM).eq('is_playoff', true)
      : Z,
    // Boys playoff duals: done (team score set)
    seasonIdM
      ? db.from('dual_meets').select('*', { count: 'exact', head: true }).eq('gender', 'M').eq('season_id', seasonIdM).eq('is_playoff', true).not('team1_score', 'is', null)
      : Z,
    // Girls playoff duals: total
    seasonIdF
      ? db.from('dual_meets_girls').select('*', { count: 'exact', head: true }).eq('season_id', seasonIdF).eq('is_playoff', true)
      : Z,
    // Girls playoff duals: done (is_complete)
    seasonIdF
      ? db.from('dual_meets_girls').select('*', { count: 'exact', head: true }).eq('season_id', seasonIdF).eq('is_playoff', true).eq('is_complete', true)
      : Z,
    // Individual tournament IDs — boys districts, regions, state (season-filtered)
    seasonIdM ? db.from('tournaments').select('id').eq('gender', 'M').eq('tournament_type', 'districts').eq('season_id', seasonIdM) : { data: [] },
    seasonIdM ? db.from('tournaments').select('id').eq('gender', 'M').eq('tournament_type', 'regions').eq('season_id', seasonIdM) : { data: [] },
    seasonIdM ? db.from('tournaments').select('id').eq('gender', 'M').eq('tournament_type', 'boys_state').eq('season_id', seasonIdM) : { data: [] },
    // Individual tournament IDs — girls districts, regions, state (season-filtered)
    seasonIdF ? db.from('tournaments').select('id').eq('gender', 'F').eq('tournament_type', 'districts').eq('season_id', seasonIdF) : { data: [] },
    seasonIdF ? db.from('tournaments').select('id').eq('gender', 'F').eq('tournament_type', 'girls_regions').eq('season_id', seasonIdF) : { data: [] },
    seasonIdF ? db.from('tournaments').select('id').eq('gender', 'F').eq('tournament_type', 'girls_state').eq('season_id', seasonIdF) : { data: [] },
  ])

  const totalPlayoffM = r0.count ?? 0
  const donePlayoffM  = r1.count ?? 0
  const totalPlayoffF = r2.count ?? 0
  const donePlayoffF  = r3.count ?? 0

  const distIdsM = (distM.data ?? []).map((t: { id: number }) => t.id)
  const regIdsM  = (regM.data  ?? []).map((t: { id: number }) => t.id)
  const stIdsM   = (stM.data   ?? []).map((t: { id: number }) => t.id)
  const distIdsF = (distF.data ?? []).map((t: { id: number }) => t.id)
  const regIdsF  = (regF.data  ?? []).map((t: { id: number }) => t.id)
  const stIdsF   = (stF.data   ?? []).map((t: { id: number }) => t.id)

  // Round 4: entries (for seeds) + matches (for completion) + wrestler participation counts at all three levels, in parallel
  // District/region/state all store bracket results in matches table with winner_entry_id
  const [
    dETM, dESM, dMTM, dMDM,  // boys districts: entries total, seeded, matches total, done
    rETM, rESM, rMTM, rMDM,  // boys regions
    sETM, sESM, sMTM, sMDM,  // boys state
    dETF, dESF, dMTF, dMDF,  // girls districts
    rETF, rESF, rMTF, rMDF,  // girls regions
    sETF, sESF, sMTF, sMDF,  // girls state
    dWM, rWM, sWM,            // boys wrestlers with ≥1 match at districts/regions/state
    dWF, rWF, sWF,            // girls wrestlers with ≥1 match at districts/regions/state
  ] = await Promise.all([
    // Boys districts
    countEntries(db, distIdsM, false), countEntries(db, distIdsM, true),
    countMatches(db, distIdsM, false), countMatches(db, distIdsM, true),
    // Boys regions
    countEntries(db, regIdsM, false),  countEntries(db, regIdsM, true),
    countMatches(db, regIdsM, false),  countMatches(db, regIdsM, true),
    // Boys state
    countEntries(db, stIdsM, false),   countEntries(db, stIdsM, true),
    countMatches(db, stIdsM, false),   countMatches(db, stIdsM, true),
    // Girls districts
    countEntries(db, distIdsF, false), countEntries(db, distIdsF, true),
    countMatches(db, distIdsF, false), countMatches(db, distIdsF, true),
    // Girls regions
    countEntries(db, regIdsF, false),  countEntries(db, regIdsF, true),
    countMatches(db, regIdsF, false),  countMatches(db, regIdsF, true),
    // Girls state
    countEntries(db, stIdsF, false),   countEntries(db, stIdsF, true),
    countMatches(db, stIdsF, false),   countMatches(db, stIdsF, true),
    // Wrestlers with ≥1 match
    countWrestlersWithMatches(db, distIdsM), countWrestlersWithMatches(db, regIdsM), countWrestlersWithMatches(db, stIdsM),
    countWrestlersWithMatches(db, distIdsF), countWrestlersWithMatches(db, regIdsF), countWrestlersWithMatches(db, stIdsF),
  ])

  return (
    <PostseasonDashboard
      seasonLabel={seasonLabel}
      teamM={{
        bracketsPct:       pct(donePlayoffM, Math.max(totalPlayoffM, 1)),
        firstRoundPct:     pct(donePlayoffM, Math.max(totalPlayoffM, 1)),
        playoffMatchesPct: pct(donePlayoffM, Math.max(totalPlayoffM, 1)),
      }}
      teamF={{
        bracketsPct:       pct(donePlayoffF, Math.max(totalPlayoffF, 1)),
        firstRoundPct:     pct(donePlayoffF, Math.max(totalPlayoffF, 1)),
        playoffMatchesPct: pct(donePlayoffF, Math.max(totalPlayoffF, 1)),
      }}
      individualM={{
        districtSeedsPct:   pct(dESM, Math.max(dETM, 1)),
        districtMatchesPct: pct(dMDM, Math.max(dMTM, 1)),
        regionSeedsPct:     pct(rESM, Math.max(rETM, 1)),
        regionMatchesPct:   pct(rMDM, Math.max(rMTM, 1)),
        stateSeedsPct:      pct(sESM, Math.max(sETM, 1)),
        stateMatchesPct:    pct(sMDM, Math.max(sMTM, 1)),
        districtWrestlers:  dWM,
        regionWrestlers:    rWM,
        stateWrestlers:     sWM,
      }}
      individualF={{
        districtSeedsPct:   pct(dESF, Math.max(dETF, 1)),
        districtMatchesPct: pct(dMDF, Math.max(dMTF, 1)),
        regionSeedsPct:     pct(rESF, Math.max(rETF, 1)),
        regionMatchesPct:   pct(rMDF, Math.max(rMTF, 1)),
        stateSeedsPct:      pct(sESF, Math.max(sETF, 1)),
        stateMatchesPct:    pct(sMDF, Math.max(sMTF, 1)),
        districtWrestlers:  dWF,
        regionWrestlers:    rWF,
        stateWrestlers:     sWF,
      }}
    />
  )
}
