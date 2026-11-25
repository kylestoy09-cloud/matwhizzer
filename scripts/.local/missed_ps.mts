// The kids whose postseason part goes 20 → 0 (in-season 20, never entered the 2025-26 postseason):
// did a teammate wrestle districts at their weight, and when did their own season end?
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const [o, n] = process.argv.slice(2).map(f => JSON.parse(readFileSync(f, 'utf8')))
for (const g of ['M', 'F']) {
  const N = new Map(n[g].map((r: any) => [r.wrestler_id, r]))
  const ids = o[g].filter((r: any) => r.postseason_adjusted === 20 && (N.get(r.wrestler_id) as any)?.postseason_adjusted === 0).map((r: any) => r.wrestler_id)
  const { data: hs } = await db.from('wrestler_hammer_scores').select('wrestler_id, school_id, weight_class, match_count, last_match_date').eq('season', '2025-26').in('wrestler_id', ids)
  const { data: ws } = await db.from('wrestlers').select('id, first_name, last_name, grade').in('id', ids)
  const { data: dts } = await db.from('tournaments').select('id').eq('season_id', 2026).eq('gender', g).eq('tournament_type', 'districts')
  const schoolIds = [...new Set((hs ?? []).map(h => h.school_id).filter(Boolean))]
  const { data: ents } = await db.from('tournament_entries').select('wrestler_id, school_id, weight_classes(weight)').in('tournament_id', (dts ?? []).map(t => t.id)).in('school_id', schoolIds)
  const { data: ss } = await db.from('schools').select('id, display_name').in('id', schoolIds)
  const sn = new Map((ss ?? []).map(s => [s.id, s.display_name])), wn = new Map((ws ?? []).map(w => [w.id, `${w.first_name} ${w.last_name}`]))
  const { data: tw } = await db.from('wrestlers').select('id, first_name, last_name').in('id', (ents ?? []).map(e => e.wrestler_id))
  const tn = new Map((tw ?? []).map(w => [w.id, `${w.first_name} ${w.last_name}`]))
  console.log(`\n=== ${g}: ${ids.length}`)
  const rows = (hs ?? []).map(h => {
    const mine = (ents ?? []).filter((e: any) => e.school_id === h.school_id)
    const near = mine.filter((e: any) => Math.abs(Number(e.weight_classes?.weight) - Number(h.weight_class)) <= 7)
    return { h, kind: !h.school_id ? 'no school on file' : !mine.length ? 'school sent no one to districts' : near.length ? 'teammate went at/near weight' : 'school went, not at/near weight', near }
  })
  const c: Record<string, number> = {}; rows.forEach(r => c[r.kind] = (c[r.kind] ?? 0) + 1); console.log(c)
  for (const r of rows.sort((a, b) => a.kind.localeCompare(b.kind))) console.log(`  ${wn.get(r.h.wrestler_id)} (${sn.get(r.h.school_id) ?? '?'}, ${r.h.weight_class}) ${r.h.match_count} matches, last ${r.h.last_match_date} — ${r.kind}${r.near.length ? ': ' + r.near.map((e: any) => `${tn.get(e.wrestler_id)} ${e.weight_classes?.weight}`).join(', ') : ''}`)
}
