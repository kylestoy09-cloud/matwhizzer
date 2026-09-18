import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// All schools matching Cedar Grove
const { data: schools } = await db.from('schools').select('id, display_name, section, classification').ilike('display_name', '%cedar%')
console.log('Schools:', schools)

// All aliases matching Cedar Grove
const { data: aliases } = await db.from('school_aliases').select('alias, school_id').ilike('alias', '%cedar%')
console.log('Aliases:', aliases)

// All PP entries for any Cedar Grove school
const ids = (schools ?? []).map((s: any) => s.id)
if (ids.length > 0) {
  const { data: pp } = await db.from('power_points').select('school_id, power_points, overall_wins, overall_losses').in('school_id', ids).eq('season_id', 2)
  console.log('PP entries:', pp)
}

// What does the import resolve "Cedar Grove" to?
const { data: aliasRows } = await db.from('school_aliases').select('alias, school_id')
const aliasToId = new Map<string, number>()
for (const r of aliasRows ?? []) aliasToId.set(r.alias, r.school_id)

const { data: schoolRows } = await db.from('schools').select('id, display_name').eq('is_nj', true)
const nameToId = new Map<string, number>()
for (const s of schoolRows ?? []) nameToId.set(s.display_name.toLowerCase(), s.id)

const team = 'Cedar Grove'
const byAlias = aliasToId.get(team)
const byName = nameToId.get(team.toLowerCase())
console.log(`\nImport resolves "Cedar Grove" → alias: ${byAlias ?? 'none'}, name: ${byName ?? 'none'}`)
