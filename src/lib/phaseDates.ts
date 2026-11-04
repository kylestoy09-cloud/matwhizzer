// Admin phase dates (admin_phase_dates): each side's Preseason / Season / Postseason dates per
// season, set in the Calendar tool. Off season is after postseason_end until the next
// preseason_start. Pure functions here (used by the calendar in the browser too); the admin
// dashboards only — the public site's season still follows season_gender_state.

export type Phase = 'offseason' | 'preseason' | 'season' | 'postseason'

export type PhaseDates = {
  season_id: number
  gender: 'M' | 'F'
  label: string               // the season's label, e.g. 2026-27
  preseason_start: string     // YYYY-MM-DD
  season_start: string
  postseason_start: string
  postseason_end: string
}

export const PHASE_LABEL: Record<Phase, string> = {
  offseason: 'Off Season', preseason: 'Preseason', season: 'Season', postseason: 'Postseason',
}

/** The phase on a date, and the season it belongs to (the latest season started by then) */
export function phaseOn(rows: PhaseDates[], date: string): { phase: Phase; row: PhaseDates | null; from: string | null; to: string | null } {
  const sorted = [...rows].sort((a, b) => a.preseason_start.localeCompare(b.preseason_start))
  const row = [...sorted].reverse().find(r => r.preseason_start <= date) ?? null
  if (!row) return { phase: 'offseason', row: null, from: null, to: sorted[0] ? dayBefore(sorted[0].preseason_start) : null }
  if (date < row.season_start)     return { phase: 'preseason',  row, from: row.preseason_start,  to: dayBefore(row.season_start) }
  if (date < row.postseason_start) return { phase: 'season',     row, from: row.season_start,     to: dayBefore(row.postseason_start) }
  if (date <= row.postseason_end)  return { phase: 'postseason', row, from: row.postseason_start, to: row.postseason_end }
  const next = sorted.find(r => r.preseason_start > date)
  return { phase: 'offseason', row, from: dayAfter(row.postseason_end), to: next ? dayBefore(next.preseason_start) : null }
}

/** Problems with a set of dates, or null */
export function checkDates(d: Pick<PhaseDates, 'preseason_start' | 'season_start' | 'postseason_start' | 'postseason_end'>): string | null {
  const iso = /^\d{4}-\d{2}-\d{2}$/
  if (![d.preseason_start, d.season_start, d.postseason_start, d.postseason_end].every(x => iso.test(x ?? ''))) return 'Every date is required.'
  if (!(d.preseason_start < d.season_start)) return 'Season must start after preseason starts.'
  if (!(d.season_start < d.postseason_start)) return 'Postseason must start after the season starts.'
  if (!(d.postseason_start <= d.postseason_end)) return 'Postseason must end on or after it starts.'
  return null
}

const shift = (d: string, n: number) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10) }
export const dayBefore = (d: string) => shift(d, -1)
export const dayAfter = (d: string) => shift(d, 1)
export const shortDate = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
