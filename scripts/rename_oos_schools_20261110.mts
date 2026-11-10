// Out-of-state school names: drop "High School", "Hs", "H S", "HS", "Senior"/"Sr" at the end (Kyle 2026-11-10; state tags,
// bracket notes in (…) and Academy/Prep/School/Catholic names stay). Each renamed school keeps its old name as an
// out-of-state alias (school_aliases: alias_type 'oos', school_id and notes = the school id, as the existing ones), so imports printing the long name still
// match exactly. Held: names that would equal another school's (Woodbridge Senior → NJ Woodbridge; West Field
// High School → NJ Westfield). Backup of every changed row; --apply writes.
//   npx tsx --tsconfig tsconfig.json scripts/rename_oos_schools_20261110.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '')
const { data: all, error } = await db.from('schools').select('id, display_name, is_nj'); if (error) throw error
const SUFFIX = /\s+(High School|Hs|H S|HS|Senior|Sr)$/
const FIX: Record<string, string> = { 'Madison plains': 'Madison Plains' }
const plan = all!.filter(s => !s.is_nj && SUFFIX.test(s.display_name.trim()) && !/\([^)]*\)$/.test(s.display_name)).map(s => {
  const t = s.display_name.trim().replace(SUFFIX, '').trim(); return { id: s.id, from: s.display_name, to: FIX[t] ?? t }
})
const held = plan.filter(p => all!.some(s => s.id !== p.id && norm(s.display_name) === norm(p.to)) || plan.some(q => q.id !== p.id && norm(q.to) === norm(p.to)))
const go = plan.filter(p => !held.includes(p))
const { data: aliases } = await db.from('school_aliases').select('alias, notes').eq('alias_type', 'oos')
const have = new Set((aliases ?? []).map(a => `${norm(a.alias)}|${a.notes}`))
const newAliases = go.filter(p => !have.has(`${norm(p.from)}|${p.id}`)).map(p => ({ school_id: p.id, alias: p.from, alias_type: 'oos', notes: String(p.id), confirmed_at: new Date().toISOString() }))
fs.writeFileSync('docs/reviews/oos_school_renames_20261110.md', ['# Out-of-state school renames (2026-11-10)', '', `${go.length} renamed; ${held.length} held (the short name equals another school's).`, '', '| # | Was | Now |', '|---|---|---|', ...go.map(p => `| ${p.id} | ${p.from} | ${p.to} |`), '', '## Held', '', ...held.map(p => `- ${p.id} ${p.from} → would be "${p.to}"`), ''].join('\n'))
console.log(`renames ${go.length}, held ${held.length} (${held.map(h => h.from).join('; ')}), new aliases ${newAliases.length}`)
if (!APPLY) process.exit(0)
fs.writeFileSync('docs/migrations/backups/20261110_oos_school_renames_before.json', JSON.stringify(go))
for (const p of go) { const r = await db.from('schools').update({ display_name: p.to }).eq('id', p.id).eq('display_name', p.from).select('id'); if (r.error || r.data?.length !== 1) throw new Error(`${p.id}: ${r.error?.message ?? 'not 1 row'}`) }
const ins = await db.from('school_aliases').insert(newAliases).select('id'); if (ins.error) throw ins.error
fs.writeFileSync('docs/migrations/backups/20261110_oos_school_aliases_added.json', JSON.stringify(ins.data!.map(x => x.id)))
console.log('renamed', go.length, 'aliases added', ins.data!.length)
