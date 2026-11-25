// The three history finishes with no school (Kyle 2026-11-14): Rob Jimenez 2000 → Brick Memorial, Dave Castellini
// 1998 → Buena, L. Valenti 1938 → Roselle Park. Backup: docs/migrations/backups/20261114_history_missing_schools.json
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const FIX: Record<number, [string, string]> = { 3279: ['Rob Jimenez', 'Brick Memorial'], 3106: ['Dave Castellini', 'Buena'], 53: ['L. Valenti', 'Roselle Park'] }
const { data: before } = await db.from('history_finishes').select('*').in('id', Object.keys(FIX).map(Number))
fs.writeFileSync('docs/migrations/backups/20261114_history_missing_schools.json', JSON.stringify(before, null, 1))
for (const [id, [name, school]] of Object.entries(FIX)) {
  const { data, error } = await db.from('history_finishes').update({ school }).eq('id', Number(id)).eq('name', name).is('school', null).select('id, name, school')
  if (error) throw error
  console.log(data)
}
