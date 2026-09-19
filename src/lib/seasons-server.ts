import { cache } from 'react'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { seasonLabel, type SeasonInfo } from '@/lib/seasons'

const PUBLIC_STAGES = new Set(['season', 'postseason', 'archived'])

const getSeasonState = cache(async () => {
  const { data, error } = await createSupabaseAdmin()
    .from('season_gender_state')
    .select('season_id, gender, stage, is_public_default')
  if (error) throw new Error(`Failed to load season state: ${error.message}`)
  return data ?? []
})

export const getSeasons = cache(async (): Promise<SeasonInfo[]> => {
  const [seasonsRes, state] = await Promise.all([
    createSupabaseAdmin().from('seasons').select('id, year_label, label, start_year').order('start_year', { ascending: false }),
    getSeasonState(),
  ])
  if (seasonsRes.error) throw new Error(`Failed to load seasons: ${seasonsRes.error.message}`)
  const publicIds = new Set(state.filter(r => r.is_public_default || PUBLIC_STAGES.has(r.stage)).map(r => r.season_id))
  return (seasonsRes.data ?? []).map(s => ({
    id: s.id,
    label: s.year_label ?? s.label,
    start_year: s.start_year,
    is_public: publicIds.has(s.id),
  }))
})

export async function getSeasonLabel(id: number): Promise<string | undefined> {
  return seasonLabel(await getSeasons(), id)
}

export async function getLiveSeasonId(gender: 'M' | 'F'): Promise<number> {
  const live = (await getSeasonState()).find(r => r.gender === gender && r.is_public_default)
  if (!live) throw new Error(`No live season set for gender ${gender}`)
  return live.season_id
}
