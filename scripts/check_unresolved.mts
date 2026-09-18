import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envFile = readFileSync('.env.local', 'utf8')
for (const line of envFile.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const unresolved = [
  "Belmont Hill School",
  "Bergenfield HS",
  "Bishop Hendricken High School",
  "Blair Academy (B Team)",
  "College Achieve Paterson Charter",
  "Council Rock South Hs",
  "East Brunswick H.S.",
  "Frisch",
  "Governor Livingston Regional Hs",
  "Green Farms Academy",
  "Iona Prep",
  "Jackson Township H.S.",
  "Kittatinny Regional Jr/Sr",
  "Kushner Academy",
  "Monsignor Farrell",
  "Morris Knolls Hs",
  "Perry (Massillon)",
  "Ponaganset High School",
  "South Brunswick Hs",
  "The Peddie School",
  "Torah Academy",
  "Wyoming Seminary",
]

// Call match-schools API for these names
const resp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('supabase.co', 'vercel.app')}/api/admin/match-schools`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ names: unresolved }),
}).catch(() => null)

// Alternatively, look them up directly via school_aliases + schools with fuzzy match
// Check which names closely match any alias via trigram similarity would require pg_trgm
// Instead just check exact and close matches
const { data: allSchools } = await supabase
  .from('schools')
  .select('id, display_name')
  .eq('is_nj', true)

const { data: allAliases } = await supabase
  .from('school_aliases')
  .select('alias, school_id')

const knownNames = new Map<string, number>()
for (const s of allSchools ?? []) knownNames.set(s.display_name.toLowerCase(), s.id)
for (const a of allAliases ?? []) knownNames.set(a.alias.toLowerCase(), a.school_id)

function normalize(s: string) {
  return s.toLowerCase()
    .replace(/\s+(hs|h\.s\.|high school|regional|jr\/sr|sr\.?|b team|the )\s*/g, ' ')
    .replace(/^the\s+/, '')
    .trim()
}

console.log('\nSchool match analysis:')
for (const name of unresolved) {
  const exact = knownNames.get(name.toLowerCase())
  const norm = knownNames.get(normalize(name))
  console.log(`${name}:`)
  console.log(`  exact=${exact ?? 'none'}, normalized=${norm ?? 'none'}`)
}
