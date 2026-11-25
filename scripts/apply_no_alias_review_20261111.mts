// Applies docs/reviews/no_alias_review.csv (Kyle 2026-11-11: the 5 open rows are transfers; the rest as guessed).
//   transfer / program change      → a name link at the earlier school, under each name printed there
//   name link on the wrong school  → the link moves to the school the records are at (Gloucester → Gloucester (VA))
//   wrong match (Sydney Johnson)   → docs/migrations/20261111_split_sydney_johnson.sql (bouts move: Kyle runs it)
// Existing links are never repointed; a printed name already linked to someone else at that school is reported.
//   npx tsx --tsconfig tsconfig.json scripts/apply_no_alias_review_20261111.mts [--apply]
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
// CSV fields: quoted (the header row isn't)
const parse = (line: string) => [...line.matchAll(/(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g)].map(m => (m[1] ?? m[2] ?? '').replace(/""/g, '"'))
const [head, ...body] = fs.readFileSync('docs/reviews/no_alias_review.csv', 'utf8').trim().split('\n').map(parse)
const rows = body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])))
const add: { raw_name: string; school_id: number; wrestler_id: string }[] = []
const move: { wrestler_id: string; from: number[]; to: number }[] = []
const conflicts: string[] = []
if (rows.length !== 77 || rows.some(r => !r.wrestler_id || !r.stray_school_id || !r.guess)) throw new Error('CSV not read as expected')
for (const r of rows) {
  if (r.guess === 'wrong match') continue
  const w = r.wrestler_id, s = Number(r.stray_school_id)
  const names = new Set<string>()
  for (const t of ['dual_meet_matches', 'dual_meet_matches_girls']) {
    for (const [wc, sc, nc] of [['wrestler_a_id', 'school_a_id', 'wrestler_a_name_raw'], ['wrestler_b_id', 'school_b_id', 'wrestler_b_name_raw']]) {
      const { data } = await db.from(t).select(nc).eq(wc, w).eq(sc, s); for (const d of data ?? []) if ((d as any)[nc]) names.add((d as any)[nc].trim())
    }
  }
  for (const t of ['tournament_bouts', 'tournament_bouts_girls']) for (const k of ['1', '2']) {
    const { data } = await db.from(t).select(`wrestler${k}_name_raw`).eq(`wrestler${k}_id`, w).eq(`wrestler${k}_school_id`, s)
    for (const d of data ?? []) if ((d as any)[`wrestler${k}_name_raw`]) names.add((d as any)[`wrestler${k}_name_raw`].trim())
  }
  if (!names.size) names.add(r.wrestler)   // postseason entries carry no printed name: the profile name
  for (const n of names) {
    const { data: ex } = await db.from('wrestler_name_aliases').select('id, wrestler_id').eq('raw_name', n).eq('school_id', s)
    if (ex?.length) { if (ex[0].wrestler_id !== w) conflicts.push(`${n} @ ${r.stray_school}: linked to another profile`); continue }
    add.push({ raw_name: n, school_id: s, wrestler_id: w })
  }
  if (r.guess === 'name link on the wrong school') {
    const { data: al } = await db.from('wrestler_name_aliases').select('school_id').eq('wrestler_id', w)
    move.push({ wrestler_id: w, from: [...new Set((al ?? []).map(a => a.school_id).filter(x => x !== s))], to: s })
  }
}
const byGuess: Record<string, number> = {}; for (const r of rows) byGuess[r.guess] = (byGuess[r.guess] ?? 0) + 1
console.log(byGuess, 'links to add', add.length, 'wrestlers whose wrong-school links go', move.length, move.map(m => m.from), 'conflicts', conflicts)
if (!APPLY) process.exit(0)
const backup: any = { added: [], removed: [] }
const save = () => fs.writeFileSync('docs/migrations/backups/20261111_no_alias_review.json', JSON.stringify(backup, null, 1))
const ins = await db.from('wrestler_name_aliases').insert(add).select('id'); if (ins.error) throw ins.error
backup.added = ins.data.map(r => r.id); save()
for (const m of move) {
  const { data: old } = await db.from('wrestler_name_aliases').select('*').eq('wrestler_id', m.wrestler_id).in('school_id', m.from)
  backup.removed.push(...(old ?? [])); save()
  const d = await db.from('wrestler_name_aliases').delete().eq('wrestler_id', m.wrestler_id).in('school_id', m.from); if (d.error) throw d.error
}
console.log('applied', { added: backup.added.length, removed: backup.removed.length })
