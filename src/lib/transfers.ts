// Transfers (Kyle 2026-11-16): an admin searches an existing wrestler, picks the new team, and it is logged as a
// transfer for this season. One log per side (boys_transfers / girls_transfers, docs/migrations/20261116_transfers.sql).
// A season's list stays open while the season isn't archived; archiving it (season rollover) completes the list.
// Logging a transfer also adds the wrestler's name link at the new school, so the next upload there matches this
// profile instead of creating a new one. Readers of the new team: schoolsOfWrestlers (src/lib/hubSchools.ts) and the
// preseason ratings run (a wrestler with no bout yet this season rates at the new school).
import type { SupabaseClient } from '@supabase/supabase-js'

export type Side = 'M' | 'F'
export const transferTable = (g: Side) => (g === 'F' ? 'girls_transfers' : 'boys_transfers')

/** The transfer tables aren't there yet (before docs/migrations/20261116_transfers.sql) */
export const tableMissing = (e: { code?: string; message: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || e.message.includes('does not exist') || e.message.includes('Could not find the table'))

export type TransferSeason = { id: number; label: string; open: boolean }

/** The side's seasons, newest first, that can hold a transfer list: open = not archived yet (the one this season's
 *  transfers go to is the newest open one). Playoff-history seasons are left out. */
export async function transferSeasons(db: SupabaseClient, g: Side): Promise<TransferSeason[]> {
  const [{ data: seasons, error: sErr }, { data: state, error: stErr }] = await Promise.all([
    db.from('seasons').select('id, year_label, label').order('id', { ascending: false }),
    db.from('season_gender_state').select('season_id, stage').eq('gender', g),
  ])
  if (sErr) throw new Error(`seasons: ${sErr.message}`)
  if (stErr) throw new Error(`season_gender_state: ${stErr.message}`)
  const stage = new Map((state ?? []).map(r => [r.season_id as number, r.stage as string]))
  return (seasons ?? []).flatMap(s => {
    const st = stage.get(s.id)
    return st && st !== 'history' ? [{ id: s.id as number, label: (s.year_label ?? s.label) as string, open: st !== 'archived' }] : []
  })
}

/** Each wrestler's newest transfer (any season): their new team and the season it was logged for */
export async function latestTransfers(db: SupabaseClient, wrestlerIds: string[], seasonId?: number): Promise<Map<string, { school_id: number; season_id: number }>> {
  const out = new Map<string, { school_id: number; season_id: number; at: string }>()
  for (const t of ['boys_transfers', 'girls_transfers']) {
    for (let i = 0; i < wrestlerIds.length; i += 300) {
      let q = db.from(t).select('wrestler_id, to_school_id, season_id, created_at').in('wrestler_id', wrestlerIds.slice(i, i + 300))
      if (seasonId != null) q = q.eq('season_id', seasonId)
      const { data, error } = await q
      if (error) {
        if (tableMissing(error)) break   // before the migration
        throw new Error(`${t}: ${error.message}`)
      }
      for (const r of data ?? []) {
        const cur = out.get(r.wrestler_id)
        if (!cur || r.season_id > cur.season_id || (r.season_id === cur.season_id && r.created_at > cur.at))
          out.set(r.wrestler_id, { school_id: r.to_school_id, season_id: r.season_id, at: r.created_at })
      }
    }
  }
  return new Map([...out].map(([w, r]) => [w, { school_id: r.school_id, season_id: r.season_id }]))
}
