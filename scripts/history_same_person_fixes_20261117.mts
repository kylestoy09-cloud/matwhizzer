// Kyle 2026-11-17, after the same-name scan (scripts/history_same_name_pairs_20261117.mts):
//  1. "garren's 1998 state medal was actually for paulsboro"
//  2. "Washington" Region 1 titles (1966, 1967, 1971 — Region 1 was South Jersey through 1971) are Washington Township,
//     not Warren Hills (src/lib/historySchools.ts BY_REGION washington): stored school_id recomputed for every
//     "Washington" finish with the updated matcher
//  3. the pairs Kyle called one wrestler ("the first two groups … just use the school from other seasons"): profiles
//     merged (scripts/merge_wrestler_profiles.mts); where one school has more of his finishes, his odd finish moves to
//     it (school_id, and the printed name to that school's spelling — the Trophy Case reads the printed name). Ties
//     (one finish at each school) keep both schools until Kyle picks.
// Dry run unless --apply. Backup of every finish changed: docs/migrations/backups/20261117_history_same_person_before.json
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { schoolMatcher, historyFinishSchools } from '../src/lib/historySchools'
import { sameLastName } from '../src/lib/trophyRows'
const APPLY = process.argv.includes('--apply')
const pairs = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { name: string; a: string; b: string; a_origin: string | null; b_origin: string | null; finishes: { id: number; who: string; year: number; level: string; weight: string; school_id: number | null; school: string; printed: string }[] }[]
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const backup: unknown[] = [], changes: { id: number; school_id: number | null; school?: string; why: string }[] = []

// 1. Garren
const { data: garren } = await db.from('history_finishes').select('*').eq('year', 1998).eq('level', 'state').ilike('name', '%garren%')
const paulsboro = (await db.from('history_finishes').select('school, school_id').ilike('school', 'paulsboro').limit(1)).data![0]
for (const g of garren ?? []) if (g.school_id !== paulsboro.school_id) { backup.push(g); changes.push({ id: g.id, school_id: paulsboro.school_id, school: paulsboro.school, why: 'Garren 1998 State 3rd: Paulsboro (Kyle)' }) }

// 2. Washington
const wash: any[] = []
for (let f = 0; ; f += 1000) { const { data } = await db.from('history_finishes').select('*').eq('gender', 'M').eq('source', 'njwh').order('id').range(f, f + 999); wash.push(...data!); if (data!.length < 1000) break }
const m = await schoolMatcher(db as never)
const ids = historyFinishSchools(wash, m, sameLastName)
wash.forEach((f, i) => { if (/^washingto/i.test(f.school ?? '') && !/tw/i.test(f.school) && ids[i] !== f.school_id) { backup.push(f); changes.push({ id: f.id, school_id: ids[i], why: `${f.year} R${f.region ?? '-'} ${f.name}: Washington → ${ids[i]}` }) } })

// 3. the pairs Kyle called one wrestler
const SAME = ['Lyle Hough', 'Jack Shawde', 'James Shields', 'John Villecco', 'Chris Carey', 'Ken Hall', 'Sam Muni', 'Terry McWhirter', 'Ron Leverich', 'Ralph Zobel', 'Clarence Richardson', 'Sal Picone', 'Darren Magda', 'Larry Otsuka', 'Dean Guyton', 'Victor Hargett', 'Paul Martinelli', 'Frank Jackson', 'Jeff Gauthier', 'Anthony DiPasquale', 'Victor Gonzalez', 'Donnie DeFilippis', 'Mitz Sumilang', 'Anthony Rendina', 'Evan Galipeau', 'Sal Irizarry', 'John Hesse', 'Mike Bonora', 'Dan Hughes', 'Troy Hernandez', "Anthony D'Amico", 'Greg Webb']
const merges: { keep: string; drop: string; name: string }[] = []
const ties: string[] = []
for (const name of SAME) {
  const p = pairs.find(x => x.name.toLowerCase() === name.toLowerCase())
  if (!p) { console.log('NOT FOUND', name); continue }
  const na = p.finishes.filter(f => f.who === 'a').length, nb = p.finishes.filter(f => f.who === 'b').length
  // keep a profile with bracket-era records (origin null) over a history-only one, else the one with more finishes
  const keepA = p.a_origin !== p.b_origin ? p.a_origin == null : na >= nb
  merges.push({ keep: keepA ? p.a : p.b, drop: keepA ? p.b : p.a, name })
  // the school: the one with the most of his finishes (after the Washington fix)
  const sid = (f: typeof p.finishes[0]) => changes.find(c => c.id === f.id)?.school_id ?? f.school_id
  const count = new Map<number | null, number>(); for (const f of p.finishes) count.set(sid(f), (count.get(sid(f)) ?? 0) + 1)
  const ranked = [...count].sort((x, y) => y[1] - x[1])
  if (ranked.length < 2) continue
  if (ranked[0][1] === ranked[1][1]) { ties.push(name); continue }
  const main = ranked[0][0], spelled = p.finishes.find(f => sid(f) === main)!.printed
  for (const f of p.finishes) if (sid(f) !== main) {
    const { data: row } = await db.from('history_finishes').select('*').eq('id', f.id).single()
    backup.push(row); changes.push({ id: f.id, school_id: main, school: spelled, why: `${name} ${f.year} ${f.level}: ${f.school} → ${spelled}` })
  }
}
console.log(changes.map(c => c.why).join('\n'))
console.log({ finish_changes: changes.length, merges: merges.length, ties, apply: APPLY })
if (!APPLY) process.exit(0)
writeFileSync('docs/migrations/backups/20261117_history_same_person_before.json', JSON.stringify({ finishes: backup, merges }, null, 1))
for (const c of changes) { const { error } = await db.from('history_finishes').update(c.school ? { school_id: c.school_id, school: c.school } : { school_id: c.school_id }).eq('id', c.id); if (error) throw error }
for (const g of merges) execFileSync('npx', ['-y', 'tsx', 'scripts/merge_wrestler_profiles.mts', g.keep, g.drop, `--why=Kyle 2026-11-17: ${g.name} at two schools is one wrestler`], { stdio: 'inherit', env: process.env })
console.log('done')
