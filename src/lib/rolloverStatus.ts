// Season Rollover status for one program (Kyle 2026-11-11: the tool must show that 2025-26 was rolled
// into 2026-27). grade_season holds the season the grade column describes; a rollover moves it forward
// one year. Grades are rolled for the working season once grade_season has reached it, and a second
// run for that season is refused (it would advance everyone twice).
import { getWorkingSeason } from '@/lib/season-context'

export type RolloverStatus = {
  gradesSeason: string            // e.g. '2026-27'
  workingSeason: string
  rolled: boolean                 // grades already describe the working season
  movedAt: string | null          // when grade_season last moved
  last: { at: string; by: string | null; advanced: number | null; graduated: number | null } | null
}

const label = (end: number) => `${end - 1}-${String(end).slice(2)}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rolloverStatus(db: any, gender: 'M' | 'F'): Promise<RolloverStatus> {
  const { data: gs, error } = await db.from('grade_season').select('season_end, updated_at').eq('gender', gender).single()
  if (error || !gs) throw new Error(`grade_season: ${error?.message ?? 'missing'}`)
  const working = await getWorkingSeason(gender)
  const { data: log } = await db.from('admin_activity_log').select('created_at, admin_email, details')
    .eq('action', gender === 'F' ? 'season_rollover_girls' : 'season_rollover')
    .order('created_at', { ascending: false }).limit(1)
  const l = log?.[0]
  return {
    gradesSeason: label(gs.season_end),
    workingSeason: working.label,
    rolled: gs.season_end >= working.id,
    movedAt: gs.updated_at ?? null,
    last: l ? { at: l.created_at, by: l.admin_email ?? null, advanced: l.details?.advanced ?? null, graduated: l.details?.graduated ?? null } : null,
  }
}
