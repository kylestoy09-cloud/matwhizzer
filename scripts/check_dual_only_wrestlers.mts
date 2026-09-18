import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

// All wrestlers with no tournament_entries
const { data: allWrestlers } = await supabase
  .from('wrestlers')
  .select('id, first_name, last_name')

const { data: entryWrestlerIds } = await supabase
  .from('tournament_entries')
  .select('wrestler_id')

const hasEntry = new Set((entryWrestlerIds ?? []).map((e: any) => e.wrestler_id))
const noEntryWrestlers = (allWrestlers ?? []).filter((w: any) => !hasEntry.has(w.id))

console.log(`Total wrestlers: ${allWrestlers?.length}`)
console.log(`With postseason entries: ${hasEntry.size}`)
console.log(`Without postseason entries (dual/in-season only): ${noEntryWrestlers.length}`)

// Of those, how many have at least one tournament_bout or dual_meet_match with a school FK?
let withSchool = 0
let withWeight = 0
let missing: { name: string; id: string }[] = []

for (const w of noEntryWrestlers as any[]) {
  const [{ data: bouts }, { data: dualMatches }] = await Promise.all([
    supabase.from('tournament_bouts')
      .select('weight_class, wrestler1_school_id, wrestler2_school_id, wrestler1_id, wrestler2_id')
      .or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)
      .limit(1),
    supabase.from('dual_meet_matches')
      .select('weight_class, wrestler_a_id, wrestler_b_id, meet:dual_meets(team1_school_id, team2_school_id)')
      .or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)
      .limit(1),
  ])

  const bout = (bouts ?? [])[0] as any
  const dual = (dualMatches ?? [])[0] as any

  const schoolId = bout
    ? (bout.wrestler1_id === w.id ? bout.wrestler1_school_id : bout.wrestler2_school_id)
    : dual
    ? (dual.wrestler_a_id === w.id ? dual.meet?.team1_school_id : dual.meet?.team2_school_id)
    : null

  const weight = bout?.weight_class ?? dual?.weight_class ?? null

  if (schoolId) withSchool++
  if (weight) withWeight++
  if (!schoolId || !weight) {
    missing.push({ name: `${w.first_name} ${w.last_name}`, id: w.id })
  }
}

console.log(`\nOf dual/in-season-only wrestlers:`)
console.log(`  Have resolvable school: ${withSchool} / ${noEntryWrestlers.length}`)
console.log(`  Have resolvable weight: ${withWeight} / ${noEntryWrestlers.length}`)
console.log(`\nStill missing school or weight (${missing.length}):`)
for (const m of missing.slice(0, 20)) {
  console.log(`  ${m.name} — /wrestler/${m.id}`)
}
if (missing.length > 20) console.log(`  ...and ${missing.length - 20} more`)
