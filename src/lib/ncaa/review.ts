// College review (Kyle 2026-11-17): the entrants who might be one of our wrestlers, and the decision on one. Shared by
// the College page's Review tab (/api/admin/college) and Microcheck (task type queue 'college_review'), so both show
// the same card and a decision means the same thing everywhere: it covers the same name at the same college in every
// year (Kyle: "if i say no once, it's still no the second time").
import type { SupabaseClient } from '@supabase/supabase-js'
import { collegeTables, type Side } from '@/lib/ncaa/save'
import type { ReviewCandidate, ReviewRow } from '@/lib/ncaa/reviewShared'
export type { ReviewRow } from '@/lib/ncaa/reviewShared'

/** Every wrestler waiting for a decision: one card per name at a college, with all his years; newest first */
export async function loadReviewRows(db: SupabaseClient, g: Side): Promise<ReviewRow[]> {
  const T = collegeTables(g)
  const out: Record<string, unknown>[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from(T.entries).select('id, weight, name, college_id, college_raw, seed, place, match_note, college:colleges(name, primary_color, secondary_color), event:' + T.events + '(year, level)')
      .eq('match_status', 'review').order('id').range(f, f + 999)
    if (error) throw new Error(`${T.entries}: ${error.message}`)
    out.push(...((data ?? []) as unknown as Record<string, unknown>[])); if ((data ?? []).length < 1000) break
  }
  const each = out.map(r => {
    let parsed: { note?: string; candidates?: ReviewCandidate[] } = {}
    try { parsed = r.match_note ? JSON.parse(String(r.match_note)) : {} } catch { parsed = { note: String(r.match_note) } }
    const ev = r.event as { year: number; level: string }
    return {
      id: r.id as number, level: ev.level, year: ev.year, weight: r.weight as number, name: r.name as string, college_raw: r.college_raw as string,
      college: (r.college as ReviewRow['college']) ?? null, seed: (r.seed as number | null) ?? null, place: (r.place as number | null) ?? null,
      note: parsed.note ?? null, candidates: parsed.candidates ?? [], college_id: (r.college_id as number | null) ?? null,
    }
  })
  // one card per wrestler at a college: the same name at the same college in every year waiting
  const groups = new Map<string, typeof each>()
  for (const e of each) { const k = `${e.name}|${e.college_id ?? e.college_raw}`; groups.set(k, [...(groups.get(k) ?? []), e]) }
  return [...groups.values()].map(g => {
    const ys = [...g].sort((x, y) => x.year - y.year), last = ys[ys.length - 1]
    // candidates: each wrestler once (the timing note from his latest year)
    const cands = new Map<string, ReviewCandidate>(); for (const e of ys) for (const c of e.candidates) cands.set(c.wrestler_id, c)
    const { college_id: _c, ...rest } = last
    return { ...rest, candidates: [...cands.values()], years: ys.map(e => ({ id: e.id, year: e.year, level: e.level, weight: e.weight, seed: e.seed, place: e.place })) }
  }).sort((a, b) => b.year - a.year || a.weight - b.weight || a.id - b.id)
}

/** A decision on one entrant: 'accept' (he is our wrestler), 'not_ours', or 'undo' (back to review). Accept and not
 *  ours cover the same name at the same college in every other year still open. Returns how many other years moved. */
export async function decideCollegeEntry(db: SupabaseClient, g: Side, id: number, action: string, wrestlerId: string | null, by: string): Promise<{ also: number }> {
  const T = collegeTables(g)
  const { data: row, error } = await db.from(T.entries).select('id, name, college_id, college_raw, match_note').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!row) throw new Error('Entrant not found')
  const stamp = { reviewed_at: new Date().toISOString(), reviewed_by: by }
  const sameCollege = row.college_id ? (['college_id', row.college_id] as const) : (['college_raw', row.college_raw] as const)
  if (action === 'accept') {
    if (!wrestlerId) throw new Error('wrestler_id required')
    const { data: w } = await db.from('wrestlers').select('id, gender').eq('id', wrestlerId).maybeSingle()
    if (!w || w.gender !== g) throw new Error('That wrestler is not on this side')
    await db.from(T.entries).update({ wrestler_id: wrestlerId, match_status: 'confirmed', ...stamp }).eq('id', id)
    const { data: same } = await db.from(T.entries).update({ wrestler_id: wrestlerId, match_status: 'confirmed', ...stamp })
      .in('match_status', ['review', 'none', 'auto']).eq('name', row.name).neq('id', id).eq(sameCollege[0], sameCollege[1]).select('id')
    return { also: (same ?? []).length }
  }
  if (action === 'not_ours') {
    await db.from(T.entries).update({ wrestler_id: null, match_status: 'not_ours', ...stamp }).eq('id', id)
    const { data: same } = await db.from(T.entries).update({ wrestler_id: null, match_status: 'not_ours', ...stamp })
      .in('match_status', ['review', 'none', 'auto']).eq('name', row.name).neq('id', id).eq(sameCollege[0], sameCollege[1]).select('id')
    return { also: (same ?? []).length }
  }
  if (action === 'undo') {
    await db.from(T.entries).update({ wrestler_id: null, match_status: row.match_note ? 'review' : 'none', reviewed_at: null, reviewed_by: null }).eq('id', id)
    return { also: 0 }
  }
  throw new Error('Unknown action')
}

