import { parseDualMeetText } from '../src/lib/parseDualMeet'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Manual .env.local parse
const envFile = readFileSync('.env.local', 'utf8')
for (const line of envFile.split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length) process.env[k.trim()] = v.join('=').trim()
}

const raw = readFileSync('../Whizzer Upload/December 2025 Dual Results.rtf', 'latin1')
const text = raw
  .replace(/\\'([0-9a-fA-F]{2})/g, (_: string, h: string) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\par[d ]?/g, '\n')
  .replace(/\\[a-z]+[-]?[0-9]* ?/g, '')
  .replace(/[{}]/g, '')

const meets = parseDualMeetText(text)
const teamSchools = new Set<string>()
for (const m of meets) {
  if (m.team1Name) teamSchools.add(m.team1Name)
  if (m.team2Name) teamSchools.add(m.team2Name)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const [{ data: aliases }, { data: schools }] = await Promise.all([
  supabase.from('school_aliases').select('alias'),
  supabase.from('schools').select('display_name').eq('is_nj', true),
])

const knownNames = new Set<string>()
for (const a of aliases ?? []) knownNames.add(a.alias.toLowerCase().trim())
for (const s of schools ?? []) knownNames.add(s.display_name.toLowerCase().trim())

const unresolved = [...teamSchools].filter(n => !knownNames.has(n.toLowerCase().trim())).sort()
console.log(`Unresolved school names (${unresolved.length}):`)
unresolved.forEach(n => console.log(' ', JSON.stringify(n)))
