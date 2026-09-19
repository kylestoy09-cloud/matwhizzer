import { cache } from 'react'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { liveSeasonId, seasonLabel, type Gender, type SeasonInfo } from '@/lib/seasons'

const PUBLIC_STAGES = new Set(['season', 'postseason', 'archived'])

export const getSeasons = cache(async (): Promise<SeasonInfo[]> => {
  const db = createSupabaseAdmin()
  const [seasonsRes, stateRes] = await Promise.all([
    db.from('seasons').select('id, year_label, label, start_year, end_year').order('start_year', { ascending: false }),
    db.from('season_gender_state').select('season_id, gender, stage, is_public_default'),
  ])
  if (seasonsRes.error) throw new Error(`Failed to load seasons: ${seasonsRes.error.message}`)
  if (stateRes.error) throw new Error(`Failed to load season state: ${stateRes.error.message}`)
  const state = stateRes.data ?? []
  return (seasonsRes.data ?? []).map(s => {
    const rows = state.filter(r => r.season_id === s.id)
    return {
      id: s.id,
      label: s.year_label ?? s.label,
      start_year: s.start_year,
      end_year: s.end_year,
      public_genders: rows.filter(r => r.is_public_default || PUBLIC_STAGES.has(r.stage)).map(r => r.gender as Gender),
      live_genders: rows.filter(r => r.is_public_default).map(r => r.gender as Gender),
      stages: Object.fromEntries(rows.map(r => [r.gender, r.stage])),
    }
  })
})

export async function getSeasonLabel(id: number): Promise<string | undefined> {
  return seasonLabel(await getSeasons(), id)
}

export async function getLiveSeason(gender: Gender): Promise<SeasonInfo> {
  const seasons = await getSeasons()
  const id = liveSeasonId(seasons, gender)
  const s = seasons.find(x => x.id === id)
  if (!s) throw new Error('No seasons found')
  return s
}

const STATE_TYPE: Record<Gender, string> = { M: 'boys_state', F: 'girls_state' }

/** NJSIAA state individual tournament for a season, if its bracket has been loaded. */
export const getStateTournamentId = cache(async (seasonId: number, gender: Gender): Promise<number | null> => {
  const { data, error } = await createSupabaseAdmin()
    .from('tournaments').select('id')
    .eq('season_id', seasonId).eq('tournament_type', STATE_TYPE[gender])
    .maybeSingle()
  if (error) throw new Error(`state tournament lookup: ${error.message}`)
  return data?.id ?? null
})

/** Seasons (newest first) that have at least one postseason tournament of this type for the gender. */
export const getSeasonIdsWithTournamentType = cache(async (tournamentType: string, gender: Gender): Promise<number[]> => {
  const { data, error } = await createSupabaseAdmin()
    .from('tournaments').select('season_id')
    .eq('tournament_type', tournamentType).eq('gender', gender)
  if (error) throw new Error(`tournament season lookup: ${error.message}`)
  const ids = [...new Set((data ?? []).map(r => r.season_id as number))]
  const year = new Map((await getSeasons()).map(s => [s.id, s.end_year]))
  return ids.sort((a, b) => (year.get(b) ?? 0) - (year.get(a) ?? 0))
})
