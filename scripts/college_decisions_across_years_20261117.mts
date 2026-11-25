// Kyle 2026-11-17: "if i say no once, it's still no the second time" — every decision already made (confirmed / not
// ours) applies to the same name at the same college in his other years still waiting. And Joseph Zargo (Wisconsin
// 2022–2026) = our Joseph Zargo (South River / Bergen Catholic; scripts/merge_zargo_20261117.mts). Backup first.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const T = 'boys_college_entries'
const all: any[] = []
for (let f = 0; ; f += 1000) { const { data, error } = await db.from(T).select('id, name, college_id, college_raw, wrestler_id, match_status, reviewed_at, reviewed_by').order('id').range(f, f + 999); if (error) throw error; all.push(...data!); if (data!.length < 1000) break }
writeFileSync('docs/migrations/backups/20261117_college_entries_before_cross_year.json', JSON.stringify(all.filter(r => r.match_status !== 'none')))
const key = (r: any) => `${r.name}|${r.college_id ?? r.college_raw}`
const decided = new Map<string, any>()
for (const r of all) if (r.match_status === 'confirmed' || r.match_status === 'not_ours') decided.set(key(r), r)
let n = 0
for (const r of all) {
  if (r.match_status !== 'review') continue
  const d = decided.get(key(r)); if (!d) continue
  const { error } = await db.from(T).update({ wrestler_id: d.wrestler_id, match_status: d.match_status, reviewed_at: d.reviewed_at, reviewed_by: d.reviewed_by }).eq('id', r.id)
  if (error) throw error; n++
}
// Joseph Zargo
const { data: z, error: zErr } = await db.from(T).update({ wrestler_id: '779c34d7-47ef-4e63-9da2-c0f57b27bde6', match_status: 'confirmed', reviewed_at: new Date().toISOString(), reviewed_by: 'kyle.stoy09@gmail.com' }).eq('name', 'Joseph Zargo').select('id')
if (zErr) throw zErr
const left = all.filter(r => r.match_status === 'review').length - n
console.log({ decisions_on_file: decided.size, applied_to_other_years: n, zargo_confirmed: z?.length, still_waiting: left - (z?.length ?? 0) })
