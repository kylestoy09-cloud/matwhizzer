import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const oddNames = [
  ['Cross', 'Alpe'], ['Brayden', 'Austin'], ['Logan', 'Backus'], ['Benjamin', 'Bernstein'],
  ['John', 'Bramlett'], ['Joshua', 'Brasfield'], ['Barrett', 'Buchanan'], ['Luke', 'Burns'],
  ['Cooper', 'Combs'], ['Joseph', 'Drewry'], ['Ashton', 'Frison'], ['Wilson', 'Jamison'],
  ['Jack', 'Johnson'], ['Judd', 'Lawler'], ["Jarred", "O`Neill"], ['Findley', 'Smout'],
  ['Kohlton', 'Vargas'], ['Payne', 'Walker'], ['Isaiah', 'Waycaster'],
]

for (const [fn, ln] of oddNames) {
  const { data: w } = await db.from('wrestlers').select('id, first_name, last_name').eq('first_name', fn).eq('last_name', ln)
  for (const wr of w ?? []) {
    const { data: aliases } = await db.from('wrestler_name_aliases').select('school_id, alias_first, alias_last').eq('wrestler_id', wr.id)
    const schoolIds = (aliases ?? []).map(a => a.school_id)
    const { data: schools } = await db.from('schools').select('id, display_name').in('id', schoolIds.length ? schoolIds : [-1])
    console.log(`${fn} ${ln} (id=${wr.id}) -> schools: ${(schools ?? []).map(s => `${s.display_name}(${s.id})`).join(', ')}`)
  }
}
