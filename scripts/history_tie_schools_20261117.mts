// Kyle 2026-11-17, the 16 one-wrestler pairs with one finish at each school: "change north edison from edison to JP
// Stevens. john villecco is west deptford, terry is also west deptford. for the rest, go with region placement except
// frank jackson and paul martinelli i'll defer to your choice, same with mike bonora." Claude's picks (region evidence):
// Jackson → Westfield, Martinelli → JFK-Paterson, Bonora → Nutley. Each finish not at the chosen school moves to it
// (school_id, and the printed name to that school's spelling — the Trophy Case reads the printed name); "North
// Edison" finishes keep their printed name (shown "North Edison (John P. Stevens)") and get JP Stevens' id.
// Dry run unless --apply. Backup: docs/migrations/backups/20261117_history_tie_schools_before.json
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
const APPLY = process.argv.includes('--apply')
const pairs = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { name: string; a: string; b: string }[]
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: sch } = await db.from('schools').select('id, display_name'); const sid = (n: string) => sch!.find(s => s.display_name === n)!.id
// the school picked for each; 'region' = the school of his region title
const PICK: Record<string, string> = {
  'Jack Shawde': 'John P. Stevens', 'James Shields': 'John P. Stevens', 'John Villecco': 'West Deptford', 'Terry McWhirter': 'West Deptford',
  'Ron Leverich': 'region', 'Clarence Richardson': 'region', 'Sal Picone': 'region', 'Darren Magda': 'region', 'Jeff Gauthier': 'region',
  'Victor Gonzalez': 'region', 'Anthony Rendina': 'region', "Anthony D'Amico": 'region', 'Greg Webb': 'region',
  'Frank Jackson': 'Westfield', 'Paul Martinelli': 'John F. Kennedy', 'Mike Bonora': 'Nutley',
}
const backup: unknown[] = [], changes: { id: number; school_id: number; school: string | null; why: string }[] = []
// North Edison (every finish): John P. Stevens
const { data: ne } = await db.from('history_finishes').select('*').ilike('school', '%north edison%')
for (const f of ne ?? []) if (f.school_id !== sid('John P. Stevens')) { backup.push(f); changes.push({ id: f.id, school_id: sid('John P. Stevens'), school: null, why: `${f.year} ${f.name}: North Edison → John P. Stevens` }) }
for (const [name, pick] of Object.entries(PICK)) {
  const p = pairs.find(x => x.name.toLowerCase() === name.toLowerCase())!
  const { data: fins } = await db.from('history_finishes').select('*').in('wrestler_id', [p.a, p.b])
  const cur = (f: any) => changes.find(c => c.id === f.id)?.school_id ?? f.school_id
  const target = pick === 'region' ? cur(fins!.find(f => f.level === 'region')) : sid(pick)
  // the target's spelling: from his finishes there, else another finish printed for that school
  let spelled = fins!.find(f => cur(f) === target && !/north edison|^washington$/i.test(f.school))?.school
  if (!spelled) spelled = (await db.from('history_finishes').select('school').eq('school_id', target).not('school', 'ilike', '%north edison%').limit(1)).data?.[0]?.school ?? sch!.find(s => s.id === target)!.display_name
  for (const f of fins!) if (cur(f) !== target || (/^washington$/i.test(f.school) && target !== sid('Washington Township'))) {
    backup.push(f)
    const prior = changes.findIndex(c => c.id === f.id); if (prior >= 0) changes.splice(prior, 1)
    changes.push({ id: f.id, school_id: target, school: spelled!, why: `${name} ${f.year} ${f.level}: ${f.school} → ${spelled}` })
  }
}
console.log(changes.map(c => c.why).join('\n'), '\n', { changes: changes.length, apply: APPLY })
if (!APPLY) process.exit(0)
writeFileSync('docs/migrations/backups/20261117_history_tie_schools_before.json', JSON.stringify(backup, null, 1))
for (const c of changes) { const { error } = await db.from('history_finishes').update(c.school ? { school_id: c.school_id, school: c.school } : { school_id: c.school_id }).eq('id', c.id); if (error) throw error }
console.log('done')
