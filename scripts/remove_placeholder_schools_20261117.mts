// Kyle 2026-11-17 placed the four history schools created earlier today under their old names: Burlington = Burlington
// City, North Edison = Edison, South Freehold = Freehold Borough, Green Brook = Watchung Hills (connected in
// src/lib/historySchools.ts). The placeholders 1243–1246 had no references (counted across 19 school-linked tables: 0).
// The delete guard blocks a REST delete: Kyle approved and ran it in the SQL editor (SET LOCAL
// matwhizzer.allow_protected_delete = on; DELETE FROM schools WHERE id IN (1243, 1244, 1245, 1246)) — left over: 0.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ids = [1243, 1244, 1245, 1246]
const { data } = await db.from('schools').select('*').in('id', ids)
writeFileSync('docs/migrations/backups/20261117_placeholder_history_schools.json', JSON.stringify(data, null, 1))
const { error } = await db.from('schools').delete().in('id', ids)
if (error) throw error
console.log('removed', data?.map(s => `${s.id} ${s.display_name}`))
