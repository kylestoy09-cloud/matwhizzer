import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const out: any[] = []; for (let i = 0; ; i += 1000) { const d = (await db.from('wrestlers').select('id, first_name, last_name, gender').order('id').range(i, i + 999)).data!; out.push(...d); if (d.length < 1000) break }
const bad = out.filter(w => !(w.last_name ?? '').trim() || /[()]/.test(`${w.first_name}${w.last_name ?? ''}`) || !(w.first_name ?? '').trim())
console.log(out.length, 'profiles; would fail:', JSON.stringify(bad.map(w => `${w.gender} ${w.id.slice(0, 8)} "${w.first_name}|${w.last_name}"`)))
