// Out-of-state schools get a state tag in their name (Kyle 2026-11-10: "adding the state across the board will help
// identify non-NJSIAA"; NJ non-NJSIAA schools get (NJ)). Applies the High-confidence states from
// docs/reviews/oos_state_guesses.txt and the states already known from an alias; medium/low go to
// docs/reviews/oos_states_to_review.csv for Kyle. "Name" → "Name (ST)"; "Name, ST" → "Name (ST)";
// "Name (note)" → "Name (note, ST)". The current name stays as an out-of-state alias so imports still match.
//   npx tsx --tsconfig tsconfig.json scripts/oos_state_tags_20261110.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const ctx = new Map<number, any>(JSON.parse(fs.readFileSync('docs/reviews/oos_state_context.json', 'utf8')).map((o: any) => [o.id, o]))
const g = new Map<number, { st: string; cf: string; why: string }>()
for (const l of fs.readFileSync('docs/reviews/oos_state_guesses.txt', 'utf8').trim().split('\n')) { const [id, st, cf, ...w] = l.split(' '); g.set(+id, { st, cf, why: w.join(' ') }) }
const { data: schools, error } = await db.from('schools').select('id, display_name').eq('is_nj', false); if (error) throw error
const tagged = (n: string, st: string) => {
  const t = n.trim()
  if (new RegExp(`\\(${st}\\)$`).test(t)) return t
  if (new RegExp(`,\\s*${st}$`).test(t)) return t.replace(new RegExp(`,\\s*${st}$`), ` (${st})`)
  if (/\)$/.test(t)) return t.replace(/\)$/, `, ${st})`)
  return `${t} (${st})`
}
const plan: { id: number; from: string; to: string; st: string }[] = []
for (const s of schools!) {
  const o = ctx.get(s.id); if (!o) continue
  let st: string | null = null
  if (o.known?.length === 1 && !/\([A-Z]{2}\)$/.test(s.display_name)) st = o.known[0]
  const gg = g.get(s.id); if (gg?.cf === 'H') st = gg.st
  if (st) { const to = tagged(s.display_name, st); if (to !== s.display_name) plan.push({ id: s.id, from: s.display_name, to, st }) }
}
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '')
const { data: allS } = await db.from('schools').select('id, display_name')
const clash = plan.filter(p => allS!.some(s => s.id !== p.id && norm(s.display_name) === norm(p.to)) || plan.some(q => q.id !== p.id && norm(q.to) === norm(p.to)))
// review CSV: medium and low
const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
const ev = (o: any) => (o?.events ?? []).slice(0, 3).map((e: string) => e.replace(/ \((\d{4}-\d\d-\d\d);[^)]*\)/, ' ($1)')).join('; ') || 'no bouts on file'
const rows = [...g].filter(([, v]) => v.cf !== 'H').sort((a, b) => (a[1].cf === b[1].cf ? ctx.get(a[0]).name.localeCompare(ctx.get(b[0]).name) : a[1].cf === 'L' ? -1 : 1))
fs.writeFileSync('docs/reviews/oos_states_to_review.csv', ['school_id,school,proposed_state,confidence,why,events,your_state'].concat(rows.map(([id, v]) => [id, ctx.get(id).name, v.st === 'L' ? '' : v.st, v.cf === 'L' ? 'Low' : 'Medium', v.why, ev(ctx.get(id)), ''].map(q).join(','))).join('\n') + '\n')
// duplicate pairs CSV
const PAIRS = [[843, 488], [830, 765], [831, 511], [864, 530], [1017, 1025], [1032, 643], [661, 1029], [513, 834]]
fs.writeFileSync('docs/reviews/oos_duplicate_schools.csv', ['pair,school_id,school,bouts,events'].concat(PAIRS.flatMap((p, i) => p.map(id => [i + 1, id, ctx.get(id)?.name, ctx.get(id)?.bouts ?? 0, ev(ctx.get(id))].map(q).join(',')))).join('\n') + '\n')
console.log(`tag ${plan.length - clash.length}, clashes ${clash.length} ${clash.map(c => `${c.from}→${c.to}`).join('; ')}; review rows ${rows.length}`)
console.log(plan.filter(p => /\)\s*$/.test(p.from) || /,/.test(p.from)).slice(0, 12).map(p => `${p.from} → ${p.to}`).join('\n'))
if (!APPLY) process.exit(0)
const go = plan.filter(p => !clash.includes(p))
fs.writeFileSync('docs/migrations/backups/20261110_oos_state_tags_before.json', JSON.stringify(go))
for (const p of go) { const r = await db.from('schools').update({ display_name: p.to }).eq('id', p.id).eq('display_name', p.from).select('id'); if (r.error || r.data?.length !== 1) throw new Error(`${p.id}: ${r.error?.message ?? 'not 1 row'}`) }
const { data: ex } = await db.from('school_aliases').select('school_id, alias').in('school_id', go.map(p => p.id))
const al = go.filter(p => !(ex ?? []).some(a => a.school_id === p.id && a.alias === p.from)).map(p => ({ school_id: p.id, alias: p.from, alias_type: 'oos', notes: String(p.id), confirmed_at: new Date().toISOString() }))
const ins = await db.from('school_aliases').insert(al).select('id'); if (ins.error) throw ins.error
fs.writeFileSync('docs/migrations/backups/20261110_oos_state_tag_aliases_added.json', JSON.stringify(ins.data!.map(x => x.id)))
console.log('tagged', go.length, 'aliases added', ins.data!.length)
