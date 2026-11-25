import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const ws = await all((f, t) => db.from('wrestlers').select('id, first_name, last_name, gender, is_oos, created_at').order('id').range(f, t))
const blank = ws.filter((w: any) => !w.last_name?.trim() && w.first_name !== 'Unknown')
const paren = ws.filter((w: any) => /[()]/.test(`${w.first_name}${w.last_name}`))
console.log(`profiles with a blank last name: ${blank.length}`, JSON.stringify(blank.map((w: any) => `${w.gender} "${w.first_name}" ${w.created_at.slice(0, 10)}`)))
console.log(`profiles with parentheses in the name: ${paren.length}`, JSON.stringify(paren.slice(0, 10).map((w: any) => `${w.gender} "${w.first_name}|${w.last_name}"`)))
