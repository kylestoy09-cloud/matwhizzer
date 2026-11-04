// Loading admin phase dates (see src/lib/phaseDates.ts). Service role only.
import type { createSupabaseAdmin } from '@/lib/supabase/service'
import type { PhaseDates } from '@/lib/phaseDates'

export async function loadPhaseDates(db: ReturnType<typeof createSupabaseAdmin>, gender: 'M' | 'F'): Promise<PhaseDates[]> {
  const [{ data: rows }, { data: seasons }] = await Promise.all([
    db.from('admin_phase_dates').select('season_id, gender, preseason_start, season_start, postseason_start, postseason_end').eq('gender', gender),
    db.from('seasons').select('id, label'),
  ])
  const label = new Map((seasons ?? []).map(s => [s.id as number, s.label as string]))
  return ((rows ?? []) as Omit<PhaseDates, 'label'>[])
    .map(r => ({ ...r, label: label.get(r.season_id) ?? String(r.season_id) }))
    .sort((a, b) => a.preseason_start.localeCompare(b.preseason_start))
}
