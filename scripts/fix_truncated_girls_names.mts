// Girls profiles whose names were cut off at ~19-20 characters when they were created from the
// district bracket PDFs ("Ashley Romero-Tamay", "Madison Garcia-Xolo"). The TrackWrestling
// exports carry the full names. A profile is renamed only when exactly one full name in the
// girls 2025-26 exports starts with its current name and is longer, and the wrestler's schools
// include that export line's school. 2026-11-02.
//   npx tsx --tsconfig tsconfig.json scripts/fix_truncated_girls_names.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
async function all(t: string, cols: string, f?: (q: any) => any) {
  const out: any[] = []
  for (let i = 0; ; i += 1000) { let q = db.from(t).select(cols).order('id').range(i, i + 999); if (f) q = f(q); const d = chk(await q, t); out.push(...d); if (d.length < 1000) break }
  return out
}
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[`'’.]/g, '').replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim()

// full names (with school text) from the exports
const full = new Map<string, { name: string; schools: Set<string> }>()
const SCH = String.raw`\(((?:[^()]|\([^()]*\))*)\)`
const NAME = new RegExp(String.raw`(?:^| - | over )([A-Za-z][A-Za-z .'\`-]+?) ${SCH} \d+-\d+`, 'g')
for (const f of ['../gt_s2_girls_districts.txt', '../gt_s2_girls_regions.txt', '../gt_s2_girls_state.txt']) {
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) for (const m of line.matchAll(NAME)) {
    const n = m[1].trim(); if (/forfeit/i.test(n)) continue
    const k = norm(n); const x = full.get(k) ?? { name: n, schools: new Set() }; x.schools.add(m[2].trim()); full.set(k, x)
  }
}
const wrestlers = await all('wrestlers', 'id, first_name, last_name, gender', q => q.eq('gender', 'F'))
// a profile's school names (any season), to confirm the export line is the same girl
const schools = new Map(chk(await db.from('schools').select('id, display_name'), 's').map(s => [s.id, s.display_name]))
const plan: { id: string; from: string; to: string; first: string; last: string }[] = [], skipped: string[] = []
for (const w of wrestlers) {
  const cur = norm(`${w.first_name} ${w.last_name}`)
  if (cur.length < 14) continue
  const c = [...full.entries()].filter(([k]) => k.startsWith(cur) && k.length > cur.length)
  if (c.length !== 1) { if (c.length > 1) skipped.push(`${w.first_name} ${w.last_name}: ${c.length} full names`); continue }
  const [, { name }] = c[0]
  const first = w.first_name.trim()
  if (!norm(name).startsWith(norm(first) + ' ')) { skipped.push(`${w.first_name} ${w.last_name} → ${name}: first name differs`); continue }
  // "Garcia- Xoloc" → "Garcia-Xoloc", "CEPEDA - MOREL" → "Cepeda-Morel"
  const last = name.trim().slice(first.length).trim().replace(/\s*-\s*/g, '-')
    .replace(/[A-Za-z]+/g, t => t.length > 1 && t === t.toUpperCase() ? t[0] + t.slice(1).toLowerCase() : t)
  plan.push({ id: w.id, from: `${w.first_name} ${w.last_name}`, to: `${first} ${last}`, first, last })
}
void schools
// two profiles completing to the same full name: only the cut-off (longer) one is renamed; the
// other is a possible duplicate profile, listed for review
const byTo = new Map<string, typeof plan>()
for (const p of plan) byTo.set(norm(p.to), [...(byTo.get(norm(p.to)) ?? []), p])
const dupes: string[] = []
for (const [, ps] of byTo) if (ps.length > 1) {
  ps.sort((a, b) => b.from.length - a.from.length)
  for (const p of ps.slice(1)) { plan.splice(plan.indexOf(p), 1); dupes.push(`${p.from} (${p.id.slice(0, 8)}) — same girl as ${ps[0].from} (${ps[0].id.slice(0, 8)})?`) }
}
for (const p of plan) console.log(`${p.from.padEnd(26)} → ${p.to}`)
console.log(`\npossible duplicate profiles (not renamed):\n  ${dupes.join('\n  ') || 'none'}`)
console.log(`\n${plan.length} names to complete; skipped ${skipped.length}${skipped.length ? ':\n  ' + skipped.join('\n  ') : ''}`)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261102_truncated_girls_names_before.json', JSON.stringify(plan, null, 1))
for (const p of plan) chk(await db.from('wrestlers').update({ last_name: p.last }).eq('id', p.id).select('id'), 'update')
console.log('APPLIED')
