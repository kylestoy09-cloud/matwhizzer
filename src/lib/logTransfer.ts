// Logging one transfer (Kyle 2026-11-16), shared by the Transfers tool and the Roster Import (2026-11-28: "roster
// uploads will also need to be able to handle and register transfers"). Logs it for the side's newest open season,
// adds the wrestler's name link at the new school (never taken from a namesake) so the next upload there finds this
// profile, and moves the wrestler off any unpublished Whiz Rank board of the old section.
import type { SupabaseClient } from '@supabase/supabase-js'
import { schoolIdsOfWrestlers } from '@/lib/hubSchools'
import { tableMissing, transferSeasons, transferTable, type Side } from '@/lib/transfers'
import { pullFromBoards, schoolSections } from '@/lib/whizRank'

export const TRANSFER_MIGRATION = 'Run docs/migrations/20261116_transfers.sql in the Supabase SQL editor first.'

export type TransferResult = { ok: true; id: number; season: number; namesake: boolean; pulled: number } | { ok: false; error: string; status: number }

export async function logTransfer(db: SupabaseClient, g: Side, wrestlerId: string, toSchool: number, notes: string | null, by: string | null): Promise<TransferResult> {
  const bad = (error: string, status = 400): TransferResult => ({ ok: false, error, status })
  const season = (await transferSeasons(db, g)).find(s => s.open)
  if (!season) return bad('No open season to log a transfer for (every season is archived)')
  const { data: w, error: wErr } = await db.from('wrestlers').select('id, first_name, last_name, suffix, gender').eq('id', wrestlerId).maybeSingle()
  if (wErr) return bad(wErr.message, 500)
  if (!w || w.gender !== g) return bad('That wrestler is not on this side')
  const { data: school, error: sErr } = await db.from('schools').select('id, display_name').eq('id', toSchool).maybeSingle()
  if (sErr) return bad(sErr.message, 500)
  if (!school) return bad('School not found')
  const from = (await schoolIdsOfWrestlers(db, [wrestlerId])).get(wrestlerId) ?? null
  if (from === toSchool) return bad(`${w.first_name} ${w.last_name} is already on ${school.display_name}`)

  const raw = [w.first_name, w.last_name, w.suffix].filter(Boolean).join(' ')
  const { data: links, error: lErr } = await db.from('wrestler_name_aliases').select('wrestler_id, raw_name').eq('school_id', toSchool).or(`wrestler_id.eq.${wrestlerId},raw_name.eq."${raw.replace(/"/g, '')}"`)
  if (lErr) return bad(lErr.message, 500)
  const hasLink = (links ?? []).some(l => l.wrestler_id === wrestlerId)
  const namesake = (links ?? []).some(l => l.raw_name === raw && l.wrestler_id !== wrestlerId)

  const { data: row, error } = await db.from(transferTable(g)).insert({
    season_id: season.id, wrestler_id: wrestlerId, from_school_id: from, to_school_id: toSchool,
    link_added: !hasLink && !namesake, notes: notes?.trim() || null, created_by: by,
  }).select('id').single()
  if (tableMissing(error)) return bad(TRANSFER_MIGRATION)
  if (error) return bad(error.message, 500)
  if (!hasLink && !namesake) {
    const { error: aErr } = await db.from('wrestler_name_aliases').insert({ raw_name: raw, school_id: toSchool, wrestler_id: wrestlerId })
    if (aErr) {
      await db.from(transferTable(g)).update({ link_added: false }).eq('id', row.id)
      return bad(`Transfer logged, but the name link at ${school.display_name} failed: ${aErr.message}`, 500)
    }
  }
  // Whiz Rank follows the move (Kyle 2026-11-17): off any unpublished board of his old section, onto the new one's
  let pulled = 0
  try {
    const newSection = (await schoolSections(db, g)).get(toSchool) ?? null
    pulled = await pullFromBoards(db, g, season.id, wrestlerId, `transferred to ${school.display_name}`, newSection)
  } catch { /* the transfer is logged; the boards still read it */ }
  try {
    await db.rpc('log_admin_activity', { p_admin_email: by ?? '', p_action: 'log_transfer', p_entity_type: transferTable(g), p_entity_id: String(row.id), p_details: { wrestler_id: wrestlerId, from_school_id: from, to_school_id: toSchool, season_id: season.id } })
  } catch { /* non-fatal */ }
  return { ok: true, id: row.id, season: season.id, namesake, pulled }
}
