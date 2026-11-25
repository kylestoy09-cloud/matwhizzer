// The Middle School Hub is one mixed pool — results don't say which kids are girls — but each admin side shows its
// own kids (Kyle 2026-11-13: "the boys side should only show boys and girls only show girls"). A kid's side: the
// high school wrestler they're linked to; otherwise girls when they placed in a girls division; otherwise boys.
import type { SupabaseClient } from '@supabase/supabase-js'

export const girlsDivision = (d: string | null | undefined) => /\b(girls?|women|hsg)\b/i.test(d ?? '')

/** Each mixed-pool prospect's side, for the ids given. */
export async function mixedSexOf(db: SupabaseClient, ids: number[]): Promise<Map<number, 'M' | 'F'>> {
  const out = new Map<number, 'M' | 'F'>(), girls = new Set<number>(), linked = new Map<number, string>()
  const chunks = Array.from({ length: Math.ceil(ids.length / 500) }, (_, i) => ids.slice(i * 500, i * 500 + 500))
  await Promise.all(chunks.map(async c => {
    const [{ data: pl }, { data: ps }] = await Promise.all([
      db.from('mixed_hub_placements').select('prospect_id, division').in('prospect_id', c),
      db.from('mixed_prospects').select('id, wrestler_id').in('id', c).not('wrestler_id', 'is', null),
    ])
    for (const p of pl ?? []) if (girlsDivision(p.division)) girls.add(p.prospect_id)
    for (const p of ps ?? []) linked.set(p.id, p.wrestler_id)
  }))
  const wIds = [...new Set(linked.values())]
  const wGender = new Map<string, string>()
  for (let i = 0; i < wIds.length; i += 300) {
    const { data } = await db.from('wrestlers').select('id, gender').in('id', wIds.slice(i, i + 300))
    for (const w of data ?? []) wGender.set(w.id, w.gender)
  }
  for (const id of ids) {
    const w = linked.get(id)
    out.set(id, (w && wGender.get(w) === 'F') || (!w && girls.has(id)) ? 'F' : 'M')
  }
  return out
}
