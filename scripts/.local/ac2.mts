import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const rows = await all((f, t) => db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, weight_class, status, school_id, school_name_raw, season_id, gender').order('id').range(f, t))
console.log('total Track rows', rows.length)
const hit = rows.filter((r: any) => /anton|tony/i.test(r.first_name_raw + ' ' + r.last_name_raw) && /cruz/i.test(r.first_name_raw + ' ' + r.last_name_raw))
for (const r of hit) console.log(`  ${r.gender} "${r.first_name_raw}" | "${r.last_name_raw}" ${r.grade} ${r.weight_class} @ ${names.get(r.school_id) ?? '(school not matched)'} sheet "${r.school_name_raw}" ${r.status} season ${r.season_id}`)
const nes = rows.filter((r: any) => r.gender === 'M' && (/east side/i.test(r.school_name_raw ?? '') || names.get(r.school_id) === 'Newark East Side'))
console.log(`Newark East Side / "East Side" boys Track rows: ${nes.length}`, JSON.stringify([...new Set(nes.map((r: any) => `${r.school_name_raw}→${names.get(r.school_id) ?? 'unmatched'}`))]))
