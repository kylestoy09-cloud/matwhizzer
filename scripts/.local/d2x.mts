import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const T = async (s: number, n: string) => (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', s).eq('name', n)).data![0].id
const d22 = await T(2025, 'Boy_s Districts District 22')
const f = (await db.from('matches').select('round, w:winner_entry_id(wrestlers(first_name,last_name)), l:loser_entry_id(wrestlers(first_name,last_name))').eq('tournament_id', d22).eq('weight_class_id', 53).eq('round', 'F')).data as any[]
console.log('2024-25 D22 106 final in DB:', JSON.stringify(f.map(m => `${m.w?.wrestlers?.first_name} ${m.w?.wrestlers?.last_name} over ${m.l?.wrestlers?.first_name} ${m.l?.wrestlers?.last_name}`)))
const d23 = await T(2025, 'Boy_s Districts District 23')
const s23 = new Set(((await db.from('tournament_entries').select('school_id').eq('tournament_id', d23)).data ?? []).map((e: any) => names.get(e.school_id)))
console.log('2024-25 D23 schools in DB:', JSON.stringify([...s23]))
const d21 = await T(2026, 'Boy_s Districts District 21')
const s21 = [...new Set(((await db.from('tournament_entries').select('school_id, school_context_raw').eq('tournament_id', d21)).data ?? []).map((e: any) => e.school_context_raw))]
console.log('2025-26 D21 schools (as TrackWrestling names them):', JSON.stringify(s21))
const doc = fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/district_match_data.txt', 'utf8')
for (const n of s21.slice(0, 12)) console.log(`   "${n}" appears in the doc ${doc.split(`(${n})`).length - 1} times`)
