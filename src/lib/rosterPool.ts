// Track roster players kept on file (roster_grade_import rows not tied to one of our
// wrestlers by a confirmed grade). Roll Over Roster advances them with the wrestlers so
// their grade is current when they show up in a match upload: grade + 1 and season + 1,
// seniors become 'graduated' (kept for history, never suggested).

import type { createSupabaseAdmin } from '@/lib/supabase/service'

type Db = ReturnType<typeof createSupabaseAdmin>
const NEXT: Record<string, string> = { Fr: 'So', So: 'Jr', Jr: 'Sr' }
const OPEN_STATUSES = ['pending', 'school_matched', 'wrestler_matched', 'no_match']

async function openRows(db: Db, gender: 'M' | 'F') {
  const rows: { id: string; grade: string; season_id: number }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('roster_grade_import').select('id, grade, season_id')
      .eq('gender', gender).in('status', OPEN_STATUSES).order('id').range(from, from + 999)
    if (error) throw new Error(`roster_grade_import: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return rows
}

export async function rosterPoolPreview(db: Db, gender: 'M' | 'F') {
  const rows = await openRows(db, gender)
  return { advancing: rows.filter(r => NEXT[r.grade]).length, graduating: rows.filter(r => r.grade === 'Sr').length }
}

export async function advanceRosterPool(db: Db, gender: 'M' | 'F') {
  const rows = await openRows(db, gender)
  const errors: string[] = []
  // Grouped by (new grade, new season); every id is read before anything is written
  const groups = new Map<string, string[]>()
  for (const r of rows) {
    const key = r.grade === 'Sr' ? `graduated|${r.season_id + 1}` : `${NEXT[r.grade]}|${r.season_id + 1}`
    groups.set(key, [...(groups.get(key) ?? []), r.id])
  }
  for (const [key, ids] of groups) {
    const [to, season] = key.split('|')
    const patch = to === 'graduated' ? { status: 'graduated', season_id: Number(season) } : { grade: to, season_id: Number(season) }
    for (let i = 0; i < ids.length; i += 500) {
      const { error } = await db.from('roster_grade_import').update(patch).in('id', ids.slice(i, i + 500))
      if (error) { errors.push(`roster players → ${to}: ${error.message}`); break }
    }
  }
  return {
    advanced:  rows.filter(r => NEXT[r.grade]).length,
    graduated: rows.filter(r => r.grade === 'Sr').length,
    errors,
  }
}
