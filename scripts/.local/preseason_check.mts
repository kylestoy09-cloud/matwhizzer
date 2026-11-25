import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F']) {
  const rows: any[] = []
  for (let f = 0; ; f += 1000) { const { data } = await db.from('wrestler_hammer_scores').select('wrestler_id, hammer_score, postseason_adjusted, tournament_score, match_score, weight_class, school_id').eq('season', '2026-27').eq('gender', g).order('wrestler_id').range(f, f + 999); rows.push(...(data ?? [])); if ((data ?? []).length < 1000) break }
  const ws = new Map<string, any>()
  const ids = rows.map(r => r.wrestler_id)
  for (let i = 0; i < ids.length; i += 300) { const { data } = await db.from('wrestlers').select('id, first_name, last_name, graduation_year, is_active, grade').in('id', ids.slice(i, i + 300)); for (const w of data ?? []) ws.set(w.id, w) }
  const grads = rows.filter(r => (ws.get(r.wrestler_id)?.graduation_year ?? 9999) <= 2026 || ws.get(r.wrestler_id)?.is_active === false).length
  const noWeight = rows.filter(r => !r.weight_class).length
  const prev = (await db.from('wrestler_hammer_scores').select('wrestler_id, hammer_score').eq('season', '2025-26').eq('gender', g).in('wrestler_id', ids.slice(0, 300))).data ?? []
  const same = prev.filter(p => Math.abs(Number(p.hammer_score) - Number(rows.find(r => r.wrestler_id === p.wrestler_id)!.hammer_score)) < 0.011).length
  console.log(`${g}: ${rows.length} preseason ratings | graduated or inactive: ${grads} | no weight: ${noWeight} | sample of ${prev.length}: same as their final 2025-26 rating: ${same}`)
  const byW = new Map<string, any[]>(); for (const r of rows) byW.set(r.weight_class, [...(byW.get(r.weight_class) ?? []), r])
  for (const w of [...byW.keys()].filter(Boolean).sort((a, b) => Number(a) - Number(b)).slice(g === 'M' ? 6 : 3, g === 'M' ? 8 : 5)) {
    console.log(`  ${w}: ` + byW.get(w)!.sort((a, b) => b.hammer_score - a.hammer_score).slice(0, 5).map(r => { const x = ws.get(r.wrestler_id); return `${x.first_name} ${x.last_name} (${x.grade}) ${r.hammer_score}` }).join(' · '))
  }
}
