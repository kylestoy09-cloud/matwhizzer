import { cache } from 'react'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { seasonLabel, type Gender, type SeasonInfo } from '@/lib/seasons'

const PUBLIC_STAGES = new Set(['season', 'postseason', 'archived'])

export const getSeasons = cache(async (): Promise<SeasonInfo[]> => {
  const db = createSupabaseAdmin()
  const [seasonsRes, stateRes] = await Promise.all([
    db.from('seasons').select('id, year_label, label, start_year').order('start_year', { ascending: false }),
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
      public_genders: rows.filter(r => r.is_public_default || PUBLIC_STAGES.has(r.stage)).map(r => r.gender as Gender),
      live_genders: rows.filter(r => r.is_public_default).map(r => r.gender as Gender),
      stages: Object.fromEntries(rows.map(r => [r.gender, r.stage])),
    }
  })
})

export async function getSeasonLabel(id: number): Promise<string | undefined> {
  return seasonLabel(await getSeasons(), id)
}
